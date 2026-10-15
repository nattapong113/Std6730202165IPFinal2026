// ระบบร้านค้า (Inventory) จากโปรเจกต์เดิม ย้ายมารันใน server เดียวกับระบบ HR
// ใช้ path /api/auth/*, /api/products/*, /api/orders/* จึงไม่ชนกับ /api/login และ /api/employees ของ HR
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (typeof stored === 'string' && stored.startsWith('scrypt:')) {
        const [, salt, hash] = stored.split(':');
        const hashBuffer = Buffer.from(hash, 'hex');
        const derivedBuffer = crypto.scryptSync(password, salt, 64);
        return hashBuffer.length === derivedBuffer.length && crypto.timingSafeEqual(hashBuffer, derivedBuffer);
    }
    // รองรับรหัสผ่านเดิมที่ยังเป็น plain text (จะถูกอัปเกรดเป็น scrypt อัตโนมัติหลัง login สำเร็จ)
    return password === stored;
}

function base64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(input) {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64').toString('utf8');
}

// ออก JWT (HS256) เองด้วย crypto.createHmac แทนไลบรารี jsonwebtoken
function signToken(payload, secret, expiresInSeconds) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
    const signature = crypto.createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${headerB64}.${payloadB64}.${signature}`;
}

// ตรวจสอบ JWT ที่ออกเอง (เช็ค signature + วันหมดอายุ)
function verifyToken(token, secret) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;

    const expectedSignature = crypto.createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    if (signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
    }

    try {
        const payload = JSON.parse(base64urlDecode(payloadB64));
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

// Middleware: ต้อง login (มี token ที่ถูกต้อง) ถึงจะเข้าถึงได้
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const payload = verifyToken(token, process.env.JWT_SECRET);

    if (!payload) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการนี้' });
    }

    req.user = payload;
    next();
}

// Middleware: ต้องเป็น admin เท่านั้น (ใช้ต่อจาก requireAuth)
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่ทำรายการนี้ได้' });
    }
    next();
}

// Middleware: ต้องเป็น user ทั่วไปเท่านั้น (ใช้ต่อจาก requireAuth) - สำหรับสั่งซื้อสินค้า
function requireUser(req, res, next) {
    if (req.user?.role !== 'user') {
        return res.status(403).json({ error: 'เฉพาะผู้ใช้ทั่วไปเท่านั้นที่สั่งซื้อสินค้าได้' });
    }
    next();
}

module.exports = function registerInventoryRoutes(app, pool) {
    // เพิ่มคอลัมน์ role ให้ตาราง admin ถ้ายังไม่มี (บัญชีเดิมทั้งหมดจะได้ role = admin โดยอัตโนมัติ
    // เพื่อไม่ให้เสียสิทธิ์แก้ไขที่เคยมีอยู่ก่อน ส่วนบัญชีที่สมัครใหม่ผ่าน /api/auth/register จะถูกกำหนดเป็น 'user' อย่างชัดเจน)
    async function ensureRoleColumn() {
        const [cols] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin' AND COLUMN_NAME = 'role'`,
            [process.env.DB_NAME]
        );

        if (cols.length === 0) {
            await pool.query("ALTER TABLE admin ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'");
            console.log("✅ เพิ่มคอลัมน์ role ในตาราง admin แล้ว (บัญชีเดิมเป็น 'admin' ทั้งหมด)");
        }
    }

    // สร้างตาราง orders ไว้เก็บประวัติการสั่งซื้อ (ใครซื้ออะไร จำนวนเท่าไหร่ ราคาเท่าไหร่ เมื่อไหร่ สถานะจัดส่งอะไร)
    const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered'];

    async function ensureOrdersTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                productId INT NOT NULL,
                productName VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                unitPrice DECIMAL(10, 2) NOT NULL,
                totalPrice DECIMAL(10, 2) NOT NULL,
                buyerId INT NOT NULL,
                buyerUsername VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                shippingName VARCHAR(150) NOT NULL DEFAULT '',
                shippingPhone VARCHAR(30) NOT NULL DEFAULT '',
                shippingAddress VARCHAR(500) NOT NULL DEFAULT '',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // เผื่อตาราง orders ถูกสร้างไว้ก่อนหน้านี้แล้วโดยยังไม่มีคอลัมน์พวกนี้ (deploy ครั้งก่อนๆ)
        const requiredColumns = [
            { name: 'status', ddl: "ALTER TABLE orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'" },
            { name: 'shippingName', ddl: "ALTER TABLE orders ADD COLUMN shippingName VARCHAR(150) NOT NULL DEFAULT ''" },
            { name: 'shippingPhone', ddl: "ALTER TABLE orders ADD COLUMN shippingPhone VARCHAR(30) NOT NULL DEFAULT ''" },
            { name: 'shippingAddress', ddl: "ALTER TABLE orders ADD COLUMN shippingAddress VARCHAR(500) NOT NULL DEFAULT ''" },
        ];

        for (const col of requiredColumns) {
            const [cols] = await pool.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?`,
                [process.env.DB_NAME, col.name]
            );

            if (cols.length === 0) {
                await pool.query(col.ddl);
                console.log(`✅ เพิ่มคอลัมน์ ${col.name} ในตาราง orders แล้ว`);
            }
        }
    }

    // 1.1 API สำหรับเข้าสู่ระบบ (ตรวจสอบ username/password กับตาราง admin)
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'กรุณากรอก username และ password' });
            }

            const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
            if (rows.length === 0) {
                return res.status(401).json({ error: 'username หรือ password ไม่ถูกต้อง' });
            }

            const admin = rows[0];

            if (!verifyPassword(password, admin.password)) {
                return res.status(401).json({ error: 'username หรือ password ไม่ถูกต้อง' });
            }

            // อัปเกรดรหัสผ่านเดิม (plain text) ให้เป็น scrypt hash หลัง login สำเร็จ
            if (!(typeof admin.password === 'string' && admin.password.startsWith('scrypt:'))) {
                await pool.query('UPDATE admin SET password = ? WHERE id = ?', [hashPassword(password), admin.id]);
            }

            const role = admin.role === 'admin' ? 'admin' : 'user';

            const token = signToken(
                { id: admin.id, username: admin.username, role },
                process.env.JWT_SECRET,
                7 * 24 * 60 * 60
            );

            res.json({
                token,
                user: { id: admin.id, username: admin.username, role }
            });
        } catch (err) {
            console.error('Login Error:', err.message);
            res.status(500).json({ error: 'เข้าสู่ระบบล้มเหลว' });
        }
    });

    // 1.2 API สำหรับสมัครสมาชิกใหม่ (เพิ่มแถวใหม่ในตาราง admin)
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'กรุณากรอก username และ password' });
            }

            const [existing] = await pool.query('SELECT id FROM admin WHERE username = ?', [username]);
            if (existing.length > 0) {
                return res.status(409).json({ error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' });
            }

            // สมัครสมาชิกใหม่ผ่านหน้านี้จะได้ role 'user' (ดูอย่างเดียว) เสมอ ส่วนบัญชี admin ต้องตั้งไว้ในฐานข้อมูลโดยตรง
            const [result] = await pool.query(
                'INSERT INTO admin (username, password, role) VALUES (?, ?, ?)',
                [username, hashPassword(password), 'user']
            );

            const token = signToken(
                { id: result.insertId, username, role: 'user' },
                process.env.JWT_SECRET,
                7 * 24 * 60 * 60
            );

            res.status(201).json({
                token,
                user: { id: result.insertId, username, role: 'user' }
            });
        } catch (err) {
            console.error('Register Error:', err.message);
            res.status(500).json({ error: 'สมัครสมาชิกล้มเหลว' });
        }
    });

    // 2. API สำหรับดึงข้อมูลสินค้าทั้งหมด (GET)
    app.get('/api/products', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM Inventory ORDER BY lastUpdate DESC');
            res.json(rows);
        } catch (err) {
            console.error('Products Error:', err.message);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    });

    // 3. API สำหรับเพิ่มสินค้าใหม่ (POST) - รองรับทุกคอลัมน์ครบถ้วน
    // API สำหรับเพิ่มสินค้าใหม่ (POST) - ป้องกัน Error 500 ด้วยการบันทึกเฉพาะฟิลด์หลัก
    // เฉพาะ admin เท่านั้นที่แก้ไขข้อมูลได้ (user ทั่วไปดูได้อย่างเดียว)
    app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
        try {
            const { name, stock, category, location, image, status, price, brand, sizes, productCode, orderName } = req.body;

            const sql = `
                INSERT INTO Inventory
                (name, stock, category, location, image, status, price, brand, sizes, productCode, orderName, lastUpdate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const values = [
                name,
                stock,
                category || 1,
                location || 'Main Warehouse',
                image || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop',
                status || 'Active',
                price || null,
                brand || null,
                sizes || null,
                productCode || null,
                orderName || null
            ];

            const [result] = await pool.query(sql, values);
        
            res.status(201).json({ 
                message: 'เพิ่มสินค้าสำเร็จเรียบร้อย', 
                insertId: result.insertId 
            });
        } catch (err) {
            console.error('Insert Product Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // 3.1 API สำหรับดึงข้อมูลสินค้าชิ้นเดียว (GET by id) - ใช้เปิดหน้าแก้ไข
    app.get('/api/products/:id', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM Inventory WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(rows[0]);
        } catch (err) {
            console.error('Get Product Error:', err.message);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    });

    // 3.2 API สำหรับแก้ไขข้อมูลสินค้า (PUT) - เฉพาะ admin
    app.put('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
        try {
            const { name, stock, category, location, image, status, price, brand, sizes, productCode, orderName } = req.body;

            const sql = `
                UPDATE Inventory
                SET name = ?, stock = ?, category = ?, location = ?, image = ?, status = ?,
                    price = ?, brand = ?, sizes = ?, productCode = ?, orderName = ?, lastUpdate = NOW()
                WHERE id = ?
            `;

            const values = [
                name,
                stock,
                category || 1,
                location || 'Main Warehouse',
                image || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop',
                status || 'Active',
                price || null,
                brand || null,
                sizes || null,
                productCode || null,
                orderName || null,
                req.params.id
            ];

            const [result] = await pool.query(sql, values);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({ message: 'แก้ไขสินค้าสำเร็จเรียบร้อย' });
        } catch (err) {
            console.error('Update Product Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // 3.2.1 API สำหรับลบสินค้า (DELETE) - เฉพาะ admin
    app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Inventory WHERE id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({ message: 'ลบสินค้าสำเร็จเรียบร้อย' });
        } catch (err) {
            console.error('Delete Product Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // 3.4 API สำหรับกดซื้อสินค้า (POST) - เฉพาะ user ทั่วไป ตัดสต็อกและบันทึกลงตาราง orders
    app.post('/api/products/:id/buy', requireAuth, requireUser, async (req, res) => {
        const quantity = parseInt(req.body.quantity, 10);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'กรุณาระบุจำนวนที่ต้องการซื้อให้ถูกต้อง' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query('SELECT * FROM Inventory WHERE id = ? FOR UPDATE', [req.params.id]);
            if (rows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'ไม่พบสินค้า' });
            }

            const product = rows[0];
            const currentStock = Number(product.stock || 0);

            if (currentStock < quantity) {
                await connection.rollback();
                return res.status(400).json({ error: `สินค้าคงเหลือไม่พอ (เหลือ ${currentStock} ชิ้น)` });
            }

            const newStock = currentStock - quantity;
            const newStatus = newStock === 0 ? 'Out of stock' : newStock > 5 ? 'Active' : 'Low in stock';

            await connection.query(
                'UPDATE Inventory SET stock = ?, status = ?, lastUpdate = NOW() WHERE id = ?',
                [newStock, newStatus, product.id]
            );

            const unitPrice = Number(product.price || 0);
            const totalPrice = unitPrice * quantity;

            const [orderResult] = await connection.query(
                `INSERT INTO orders (productId, productName, quantity, unitPrice, totalPrice, buyerId, buyerUsername)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [product.id, product.name, quantity, unitPrice, totalPrice, req.user.id, req.user.username]
            );

            await connection.commit();

            res.status(201).json({
                message: 'สั่งซื้อสำเร็จ',
                orderId: orderResult.insertId,
                remainingStock: newStock,
            });
        } catch (err) {
            await connection.rollback();
            console.error('Buy Product Error:', err.message);
            res.status(500).json({ error: 'สั่งซื้อไม่สำเร็จ' });
        } finally {
            connection.release();
        }
    });

    // 3.5 API สำหรับเช็คเอาท์ตะกร้าสินค้า (POST) - สั่งซื้อได้หลายรายการพร้อมกันในทีเดียว เฉพาะ user ทั่วไป
    // ทำเป็น transaction เดียว ถ้ารายการใดสต็อกไม่พอจะยกเลิกทั้งตะกร้า (all-or-nothing) กันข้อมูลครึ่งๆ กลางๆ
    app.post('/api/orders/checkout', requireAuth, requireUser, async (req, res) => {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const shipping = req.body.shipping || {};
        const shippingName = typeof shipping.name === 'string' ? shipping.name.trim() : '';
        const shippingPhone = typeof shipping.phone === 'string' ? shipping.phone.trim() : '';
        const shippingAddress = typeof shipping.address === 'string' ? shipping.address.trim() : '';

        if (items.length === 0) {
            return res.status(400).json({ error: 'ตะกร้าสินค้าว่างเปล่า' });
        }

        if (!shippingName || !shippingPhone || !shippingAddress) {
            return res.status(400).json({ error: 'กรุณากรอกชื่อผู้รับ เบอร์โทร และที่อยู่จัดส่งให้ครบถ้วน' });
        }

        for (const item of items) {
            const qty = parseInt(item.quantity, 10);
            if (!item.productId || !Number.isInteger(qty) || qty <= 0) {
                return res.status(400).json({ error: 'ข้อมูลในตะกร้าไม่ถูกต้อง' });
            }
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const orderIds = [];

            for (const item of items) {
                const quantity = parseInt(item.quantity, 10);

                const [rows] = await connection.query('SELECT * FROM Inventory WHERE id = ? FOR UPDATE', [item.productId]);
                if (rows.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ error: `ไม่พบสินค้ารหัส ${item.productId}` });
                }

                const product = rows[0];
                const currentStock = Number(product.stock || 0);

                if (currentStock < quantity) {
                    await connection.rollback();
                    return res.status(400).json({ error: `"${product.name}" คงเหลือไม่พอ (เหลือ ${currentStock} ชิ้น)` });
                }

                const newStock = currentStock - quantity;
                const newStatus = newStock === 0 ? 'Out of stock' : newStock > 5 ? 'Active' : 'Low in stock';

                await connection.query(
                    'UPDATE Inventory SET stock = ?, status = ?, lastUpdate = NOW() WHERE id = ?',
                    [newStock, newStatus, product.id]
                );

                const unitPrice = Number(product.price || 0);
                const totalPrice = unitPrice * quantity;

                const [orderResult] = await connection.query(
                    `INSERT INTO orders
                     (productId, productName, quantity, unitPrice, totalPrice, buyerId, buyerUsername, shippingName, shippingPhone, shippingAddress)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [product.id, product.name, quantity, unitPrice, totalPrice, req.user.id, req.user.username, shippingName, shippingPhone, shippingAddress]
                );

                orderIds.push(orderResult.insertId);
            }

            await connection.commit();

            res.status(201).json({ message: 'สั่งซื้อสำเร็จ', orderIds });
        } catch (err) {
            await connection.rollback();
            console.error('Checkout Error:', err.message);
            res.status(500).json({ error: 'เช็คเอาท์ไม่สำเร็จ' });
        } finally {
            connection.release();
        }
    });

    // 3.6 API สำหรับดูประวัติการสั่งซื้อของตัวเอง (GET)
    app.get('/api/orders/me', requireAuth, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM orders WHERE buyerId = ? ORDER BY createdAt DESC',
                [req.user.id]
            );
            res.json(rows);
        } catch (err) {
            console.error('Get Orders Error:', err.message);
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    });

    // 3.7 API สำหรับ admin ดูออร์เดอร์ทั้งหมดของทุกคน (GET)
    app.get('/api/orders', requireAuth, requireAdmin, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
            res.json(rows);
        } catch (err) {
            console.error('Get All Orders Error:', err.message);
            res.status(500).json({ error: 'Failed to fetch orders' });
        }
    });

    // 3.8 API สำหรับ admin อัปเดตสถานะการจัดส่งออร์เดอร์ (PATCH)
    app.patch('/api/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
        try {
            const { status } = req.body;

            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({ error: `status ต้องเป็นหนึ่งใน ${ORDER_STATUSES.join(', ')}` });
            }

            const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'ไม่พบออร์เดอร์นี้' });
            }

            res.json({ message: 'อัปเดตสถานะสำเร็จ' });
        } catch (err) {
            console.error('Update Order Status Error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // 4. API ตรวจสอบสถานะเซิร์ฟเวอร์
    app.get('/api', (req, res) => {
        res.send('API is running');
    });

    // คืน promise ของ migration ให้ server.js เรียกตอนเริ่มทำงาน
    return (async () => {
        await ensureRoleColumn();
        await ensureOrdersTable();
    })();
};
