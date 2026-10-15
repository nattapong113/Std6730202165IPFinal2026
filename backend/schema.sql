-- ไม่จำเป็นต้องรันเอง: server.js สร้างตารางและข้อมูลตั้งต้นให้อัตโนมัติตอนเริ่ม
-- ไฟล์นี้ไว้ใช้ใน phpMyAdmin กรณีอยากสร้างเอง

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    status ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
    salary DECIMAL(12, 2) NOT NULL
);

INSERT INTO employees (name, position, status, salary) VALUES
    ('John Doe', 'Software Engineer', 'Active', 45000),
    ('Jane Smith', 'HR Officer', 'Active', 18000),
    ('Somchai Jaidee', 'Accountant', 'On Leave', 19000),
    ('Emily Clark', 'Senior Engineer', 'Active', 48000),
    ('Michael Brown', 'Engineering Manager', 'Active', 85000),
    ('Suda Rakdee', 'Receptionist', 'Active', 18500),
    ('David Lee', 'CTO', 'Active', 90000);

-- บัญชี login ตามโจทย์ (ถ้ายังไม่มี username admin)
INSERT INTO admin (username, password) VALUES ('admin', 'password123');
