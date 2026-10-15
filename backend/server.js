const path = require('path');
// หา .env ได้ทั้งในโฟลเดอร์ที่รันคำสั่ง, โฟลเดอร์เดียวกับ server.js และโฟลเดอร์แม่ (root ของโปรเจกต์)
require('dotenv').config({
    path: [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '.env'),
        path.join(__dirname, '..', '.env'),
    ],
});
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const registerInventoryRoutes = require('./inventory');

const app = express();
const PORT = process.env.PORT || 3017;

const MOCK_TOKEN = 'mock-jwt-token';

// ตาราง admin (username/password) อยู่ใน MySQL ของอาจารย์
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
});

// รองรับทั้งรหัสผ่าน plain text และแบบ scrypt:<salt>:<hash> ที่ระบบเก่าเคยบันทึกไว้
function verifyPassword(password, stored) {
    if (typeof stored !== 'string') return false;
    if (stored.startsWith('scrypt:')) {
        const [, salt, hash] = stored.split(':');
        const hashBuffer = Buffer.from(hash, 'hex');
        const derivedBuffer = crypto.scryptSync(password, salt, 64);
        return hashBuffer.length === derivedBuffer.length && crypto.timingSafeEqual(hashBuffer, derivedBuffer);
    }
    return password === stored;
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// JSON ที่ส่งมาผิดรูปแบบ -> 400 แทนที่จะ crash เป็น 500
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
    next(err);
});

// ===== Database setup =====
const SEED_EMPLOYEES = [
    ['John Doe', 'Software Engineer', 'Active', 45000],
    ['Jane Smith', 'HR Officer', 'Active', 18000],
    ['Somchai Jaidee', 'Accountant', 'On Leave', 19000],
    ['Emily Clark', 'Senior Engineer', 'Active', 48000],
    ['Michael Brown', 'Engineering Manager', 'Active', 85000],
    ['Suda Rakdee', 'Receptionist', 'Active', 18500],
    ['David Lee', 'CTO', 'Active', 90000],
];

// สร้างตาราง employees ถ้ายังไม่มี และใส่พนักงานตั้งต้นถ้าตารางว่าง
async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            position VARCHAR(255) NOT NULL,
            status ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
            salary DECIMAL(12, 2) NOT NULL
        )
    `);

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM employees');
    if (total === 0) {
        await pool.query('INSERT INTO employees (name, position, status, salary) VALUES ?', [SEED_EMPLOYEES]);
        console.log(`Seeded ${SEED_EMPLOYEES.length} employees`);
    }

    // ใส่บัญชี admin/password123 ตามโจทย์ ถ้ายังไม่มี username 'admin' ในตาราง (ไม่แก้บัญชีที่มีอยู่แล้ว)
    const [admins] = await pool.query("SELECT id FROM admin WHERE username = 'admin'");
    if (admins.length === 0) {
        await pool.query("INSERT INTO admin (username, password) VALUES ('admin', 'password123')");
        console.log('Created login account admin / password123');
    }
}

// แปลงแถวจาก DB ให้ตรง schema ของโจทย์ (id เป็น string, salary เป็นตัวเลข)
const toEmployee = (row) => ({
    id: String(row.id),
    name: row.name,
    position: row.position,
    status: row.status,
    salary: Number(row.salary),
});

const dbError = (res, error) => {
    console.error('DB error:', error.code || error.message);
    res.status(500).json({ success: false, error: 'Database error' });
};

// ===== Auth =====
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    try {
        const [rows] = await pool.query('SELECT username, password FROM admin WHERE username = ?', [username]);

        if (rows.length === 0 || !verifyPassword(password, rows[0].password)) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        return res.status(200).json({ success: true, token: MOCK_TOKEN });
    } catch (error) {
        console.error('Login DB error:', error.code || error.message);
        return res.status(500).json({ success: false, error: 'Database connection error' });
    }
});

// ทุก endpoint ของ employees ต้องแนบ Authorization: Bearer mock-jwt-token
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token !== MOCK_TOKEN) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
}

app.use('/api/employees', requireAuth);

// ===== K-Means (1D) =====
function kMeans1D(values, k, maxIterations = 100) {
    const sorted = [...values].sort((a, b) => a - b);
    const uniqueCount = new Set(sorted).size;
    const clusterCount = Math.min(k, uniqueCount);
    if (clusterCount === 0) return [];

    // เริ่ม centroid ที่ตำแหน่ง quantile ของข้อมูลที่เรียงแล้ว -> ผลลัพธ์คงที่ทุกครั้ง (ไม่ random)
    let centroids = Array.from({ length: clusterCount }, (_, i) =>
        sorted[Math.floor(((i + 0.5) * sorted.length) / clusterCount)]
    );
    // กันกรณี centroid เริ่มต้นซ้ำกัน: ใช้ค่า unique กระจายแทน
    if (new Set(centroids).size < clusterCount) {
        const uniques = [...new Set(sorted)];
        centroids = Array.from({ length: clusterCount }, (_, i) =>
            uniques[Math.floor((i * (uniques.length - 1)) / Math.max(clusterCount - 1, 1))]
        );
    }

    let assignments = new Array(sorted.length).fill(-1);

    for (let iter = 0; iter < maxIterations; iter++) {
        let changed = false;

        sorted.forEach((value, idx) => {
            let best = 0;
            for (let c = 1; c < centroids.length; c++) {
                if (Math.abs(value - centroids[c]) < Math.abs(value - centroids[best])) best = c;
            }
            if (assignments[idx] !== best) {
                assignments[idx] = best;
                changed = true;
            }
        });

        centroids = centroids.map((old, c) => {
            const members = sorted.filter((_, idx) => assignments[idx] === c);
            // cluster ว่าง -> คง centroid เดิมไว้ ไม่ให้เกิด NaN
            return members.length ? members.reduce((sum, v) => sum + v, 0) / members.length : old;
        });

        if (!changed) break;
    }

    return centroids
        .map((centroid, c) => ({
            centroid,
            count: assignments.filter((a) => a === c).length,
        }))
        .filter((cluster) => cluster.count > 0)
        .sort((a, b) => a.centroid - b.centroid);
}

// ต้องประกาศก่อน route ที่มี :id
app.get('/api/employees/salary-clusters', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT salary FROM employees');
        const salaries = rows
            .map((row) => Number(row.salary))
            .filter((salary) => Number.isFinite(salary));

        const clusters = kMeans1D(salaries, 3).map((cluster, i) => ({
            group: `Tier ${i + 1}`,
            centroid: Math.round(cluster.centroid * 100) / 100,
            count: cluster.count,
        }));

        res.status(200).json({ success: true, totalEmployees: salaries.length, clusters });
    } catch (error) {
        dbError(res, error);
    }
});

// ===== CRUD =====
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM employees ORDER BY id');
        res.status(200).json(rows.map(toEmployee));
    } catch (error) {
        dbError(res, error);
    }
});

app.post('/api/employees', async (req, res) => {
    const { name, position, salary } = req.body || {};

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedPosition = typeof position === 'string' ? position.trim() : '';
    const salaryIsEmpty = salary === undefined || salary === null || String(salary).trim() === '';

    if (!trimmedName || !trimmedPosition || salaryIsEmpty) {
        return res.status(400).json({ success: false, error: 'name, position and salary are required' });
    }

    const numericSalary = Number(salary);
    if (!Number.isFinite(numericSalary) || numericSalary < 0) {
        return res.status(400).json({ success: false, error: 'salary must be a non-negative number' });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO employees (name, position, status, salary) VALUES (?, ?, 'Active', ?)",
            [trimmedName, trimmedPosition, numericSalary]
        );
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
        res.status(201).json(toEmployee(rows[0]));
    } catch (error) {
        dbError(res, error);
    }
});

app.put('/api/employees/:id/status', async (req, res) => {
    try {
        const [result] = await pool.query(
            "UPDATE employees SET status = IF(status = 'Active', 'On Leave', 'Active') WHERE id = ?",
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
        res.status(200).json(toEmployee(rows[0]));
    } catch (error) {
        dbError(res, error);
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, deleted: toEmployee(rows[0]) });
    } catch (error) {
        dbError(res, error);
    }
});

// ===== ระบบร้านค้าเดิม (Inventory) =====
const inventoryReady = registerInventoryRoutes(app, pool);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`HR Manager API running on http://localhost:${PORT}`);
});

// migration ของร้านค้า (เพิ่มคอลัมน์ role ใน admin) ต้องเสร็จก่อน initDatabase ใส่บัญชี admin
inventoryReady
    .catch((error) => console.error('Inventory migration failed:', error.code || error.message))
    .then(() => initDatabase())
    .catch((error) => console.error('Database init failed:', error.code || error.message));
