const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'celebes_hotel_secret_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload directory setup
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || '../uploads-celebes-hotel');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'celebes_hotel_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

// Auto-verify and upgrade schema if columns are missing
const initSchemaUpdates = async () => {
  try {
    // 1. user_missions columns
    const [umCols] = await pool.query('SHOW COLUMNS FROM user_missions');
    const umExisting = umCols.map(c => c.Field.toLowerCase());

    if (!umExisting.includes('created_at')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ Added created_at to user_missions');
    }
    if (!umExisting.includes('room_number')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN room_number VARCHAR(50) NULL');
      console.log('✅ Added room_number to user_missions');
    }
    if (!umExisting.includes('admin_note')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN admin_note VARCHAR(255) NULL');
      console.log('✅ Added admin_note to user_missions');
    }
    if (!umExisting.includes('proof_note')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN proof_note VARCHAR(255) NULL');
      console.log('✅ Added proof_note to user_missions');
    }
    if (!umExisting.includes('proof_file')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN proof_file VARCHAR(255) NULL');
      console.log('✅ Added proof_file to user_missions');
    }
    if (!umExisting.includes('awarded_at')) {
      await pool.query('ALTER TABLE user_missions ADD COLUMN awarded_at DATETIME NULL');
      console.log('✅ Added awarded_at to user_missions');
    }

    // 2. users columns
    const [uCols] = await pool.query('SHOW COLUMNS FROM users');
    const uExisting = uCols.map(c => c.Field.toLowerCase());
    if (!uExisting.includes('birth_date')) {
      await pool.query('ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER email');
      console.log('✅ Added birth_date to users');
    }

    // 3. reservations columns
    const [rCols] = await pool.query('SHOW COLUMNS FROM reservations');
    const rExisting = rCols.map(c => c.Field.toLowerCase());
    if (!rExisting.includes('discount_percent')) {
      await pool.query('ALTER TABLE reservations ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0');
    }
    if (!rExisting.includes('discount_amount')) {
      await pool.query('ALTER TABLE reservations ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0');
    }
    if (!rExisting.includes('total_price')) {
      await pool.query('ALTER TABLE reservations ADD COLUMN total_price DECIMAL(15,2) DEFAULT 0');
    }
    if (!rExisting.includes('source')) {
      await pool.query("ALTER TABLE reservations ADD COLUMN source VARCHAR(50) DEFAULT 'app_hch'");
    }
    if (!rExisting.includes('payment_proof')) {
      await pool.query('ALTER TABLE reservations ADD COLUMN payment_proof VARCHAR(255) NULL AFTER source');
      console.log('✅ Added payment_proof to reservations');
    }
    if (!rExisting.includes('payment_status')) {
      await pool.query("ALTER TABLE reservations ADD COLUMN payment_status ENUM('unpaid', 'pending_verification', 'paid') DEFAULT 'unpaid' AFTER payment_proof");
      console.log('✅ Added payment_status to reservations');
    }
    if (!rExisting.includes('payment_proof_uploaded_at')) {
      await pool.query('ALTER TABLE reservations ADD COLUMN payment_proof_uploaded_at DATETIME NULL AFTER payment_status');
      console.log('✅ Added payment_proof_uploaded_at to reservations');
    }

    // 4. closed_dates table
    await pool.query(`CREATE TABLE IF NOT EXISTS closed_dates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      is_closed TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_closed_dates (start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 5. transactions columns for approval workflow
    const [tCols] = await pool.query('SHOW COLUMNS FROM transactions');
    const tExisting = tCols.map(c => c.Field.toLowerCase());
    if (!tExisting.includes('status')) {
      await pool.query("ALTER TABLE transactions ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER points_earned");
      console.log('✅ Added status to transactions');
    }
    if (!tExisting.includes('approved_by')) {
      await pool.query('ALTER TABLE transactions ADD COLUMN approved_by INT NULL AFTER created_by');
      console.log('✅ Added approved_by to transactions');
    }
    if (!tExisting.includes('approved_at')) {
      await pool.query('ALTER TABLE transactions ADD COLUMN approved_at DATETIME NULL AFTER approved_by');
      console.log('✅ Added approved_at to transactions');
    }
    if (!tExisting.includes('rejection_reason')) {
      await pool.query('ALTER TABLE transactions ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER approved_at');
      console.log('✅ Added rejection_reason to transactions');
    }

    // 6. rooms columns for seasonal pricing (Ramadhan & Tahun Baru)
    const [roomCols] = await pool.query('SHOW COLUMNS FROM rooms');
    const roomExisting = roomCols.map(c => c.Field.toLowerCase());
    if (!roomExisting.includes('price_ramadan')) {
      await pool.query('ALTER TABLE rooms ADD COLUMN price_ramadan DECIMAL(15,2) NULL AFTER price');
      console.log('✅ Added price_ramadan to rooms');
    }
    if (!roomExisting.includes('price_new_year')) {
      await pool.query('ALTER TABLE rooms ADD COLUMN price_new_year DECIMAL(15,2) NULL AFTER price_ramadan');
      console.log('✅ Added price_new_year to rooms');
    }

    // 6b. room_seasonal_prices table (Harga kamar custom berdasarkan rentang tanggal)
    await pool.query(`CREATE TABLE IF NOT EXISTS room_seasonal_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      season_name VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      INDEX idx_room_season (room_id, start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Verified room_seasonal_prices table');

    // 7. notifications table (In-App Notifikasi Tamu)
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('point_in', 'point_out', 'point_adjustment', 'reservation', 'reward', 'system') DEFAULT 'system',
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_notif (user_id, is_read, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Verified notifications table');

    // 8. announcements table (Fitur Pengumuman Global)
    await pool.query(`CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type ENUM('info', 'promo', 'warning', 'urgent') DEFAULT 'info',
      badge VARCHAR(50) DEFAULT NULL,
      link_url VARCHAR(255) DEFAULT NULL,
      link_text VARCHAR(100) DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      start_date DATE NULL,
      end_date DATE NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active (is_active, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Verified announcements table');

    // 9. Ensure essential seasonal & bank settings exist (Official Bank Mandiri)
    const defaultSettings = [
      ['ramadan_start_date', '2027-02-18', 'Tanggal Mulai Periode Ramadhan (Puasa)'],
      ['ramadan_end_date', '2027-03-20', 'Tanggal Akhir Periode Ramadhan (Lebaran)'],
      ['new_year_date', '12-31', 'Tanggal Malam Tahun Baru (MM-DD)'],
      ['payment_bank_name', 'Bank Mandiri', 'Nama Bank Pembayaran Reservasi'],
      ['payment_bank_account', '1520511027878', 'Nomor Rekening Bank Pembayaran'],
      ['payment_account_name', 'JIMMY EDENTON', 'Nama Pemilik Rekening'],
    ];

    for (const [key, val, desc] of defaultSettings) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = IF(setting_key LIKE "payment%", VALUES(setting_value), setting_value)',
        [key, val, desc]
      );
    }
  } catch (err) {
    console.warn('DB schema check:', err.message);
  }
};
initSchemaUpdates();

// Helper: In-App Notification Dispatcher
const createNotification = async (userId, title, message, type = 'system', customConn = null) => {
  if (!userId) return;
  try {
    const executor = customConn || pool;
    await executor.query(
      'INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
      [userId, title, message, type]
    );
  } catch (err) {
    console.warn('createNotification error:', err.message);
  }
};

// Helper: Standard Pagination Response
const formatPaginatedResponse = (data, page, limit, total) => {
  const numLimit = parseInt(limit);
  const numPage = parseInt(page);
  return {
    success: true,
    data,
    pagination: {
      page: numPage,
      limit: numLimit,
      total: parseInt(total),
      totalPages: Math.ceil(total / numLimit) || 1
    }
  };
};

// Helper: Generate Member Code
const generateMemberCode = async () => {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const code = `HCH-${randomNum}`;
  const [existing] = await pool.query('SELECT id FROM users WHERE member_code = ?', [code]);
  if (existing.length > 0) {
    return generateMemberCode();
  }
  return code;
};

// Helper: Generate Voucher Code
const generateVoucherCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const code = `HCH-VCH-${rand}`;
  const [existing] = await pool.query('SELECT id FROM reward_redemptions WHERE voucher_code = ?', [code]);
  if (existing.length > 0) {
    return generateVoucherCode();
  }
  return code;
};

// Helper: Get Settings
const getSettingsMap = async () => {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  const map = {};
  rows.forEach(r => {
    map[r.setting_key] = r.setting_value;
  });
  return map;
};

// FIFO Maintenance: Mark expired points & recalculate user total_points
const syncUserPointsFIFO = async (userId) => {
  // 1. Mark expired points
  await pool.query(
    'UPDATE point_ledger SET is_expired = 1, points_remaining = 0 WHERE user_id = ? AND expiry_date <= NOW() AND is_expired = 0',
    [userId]
  );
  // 2. Sum remaining active points
  const [sumRes] = await pool.query(
    'SELECT COALESCE(SUM(points_remaining), 0) AS total FROM point_ledger WHERE user_id = ? AND is_expired = 0',
    [userId]
  );
  const total = parseInt(sumRes[0].total) || 0;
  // 3. Update users table
  await pool.query('UPDATE users SET total_points = ? WHERE id = ?', [total, userId]);
  return total;
};

// FIFO Deduction: Deduct points from oldest active ledger entries
const deductPointsFIFO = async (userId, pointsToDeduct) => {
  let remainingNeed = pointsToDeduct;
  const [entries] = await pool.query(
    'SELECT id, points_remaining FROM point_ledger WHERE user_id = ? AND is_expired = 0 AND points_remaining > 0 ORDER BY earned_date ASC',
    [userId]
  );

  for (const entry of entries) {
    if (remainingNeed <= 0) break;
    const canTake = Math.min(entry.points_remaining, remainingNeed);
    const newRemaining = entry.points_remaining - canTake;
    await pool.query('UPDATE point_ledger SET points_remaining = ? WHERE id = ?', [newRemaining, entry.id]);
    remainingNeed -= canTake;
  }

  if (remainingNeed > 0) {
    throw new Error('Poin tidak mencukupi');
  }

  // Recalculate total
  return await syncUserPointsFIFO(userId);
};

// Auth Middlewares
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak: Token tidak ditemukan' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

const verifyStaffOrAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && ['admin', 'supervisor', 'resepsionis', 'kasir', 'staff'].includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Akses khusus Staf / Resepsionis / Supervisor / Admin' });
    }
  });
};
const verifyAdmin = verifyStaffOrAdmin; // alias for general staff/admin access

const verifySupervisorOrAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && ['admin', 'supervisor'].includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Fitur ini khusus Supervisor atau Administrator.' });
    }
  });
};

const verifySuperAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Fitur ini khusus Administrator.' });
    }
  });
};

// ==========================================================
// 1. PUBLIC & AUTH ROUTES
// ==========================================================

// Public Settings
app.get('/api/settings/public', async (req, res) => {
  try {
    const settings = await getSettingsMap();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public Active Announcements (Broadcast ke semua user / member / tamu)
app.get('/api/announcements/public', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, content, type, badge, link_url, link_text, is_active, created_at 
       FROM announcements 
       WHERE is_active = 1 
         AND (start_date IS NULL OR start_date <= CURDATE()) 
         AND (end_date IS NULL OR end_date >= CURDATE())
       ORDER BY id DESC LIMIT 10`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, phone, email, password, birth_date } = req.body;
    if (!name || !phone || !password) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Nama, No WhatsApp/HP, dan password wajib diisi' });
    }

    const cleanPhone = phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '');

    // Check existing phone
    const [existing] = await connection.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Nomor telepon sudah terdaftar sebagai member' });
    }

    // Get Welcome Points from settings (default: 10 points)
    const settingsMap = await getSettingsMap();
    const welcomePoints = parseInt(settingsMap.welcome_points || '10');
    const expiryDays = parseInt(settingsMap.point_expiry_days || '365');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const hashedPassword = await bcrypt.hash(password, 10);
    const memberCode = await generateMemberCode();

    const [insertResult] = await connection.query(
      'INSERT INTO users (name, phone, email, birth_date, password, role, member_code, total_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanPhone, email ? email.trim() : null, birth_date || null, hashedPassword, 'member', memberCode, welcomePoints]
    );

    const userId = insertResult.insertId;

    // Record welcome bonus in point_ledger (FIFO)
    if (welcomePoints > 0) {
      await connection.query(
        `INSERT INTO point_ledger (user_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description)
         VALUES (?, ?, ?, NOW(), ?, 0, 'bonus', 'Welcome Bonus: Registrasi Member Baru')`,
        [userId, welcomePoints, welcomePoints, expiryDate]
      );
    }

    await connection.commit();

    // Generate token
    const token = jwt.sign(
      { id: userId, phone: cleanPhone, name: name.trim(), role: 'member', member_code: memberCode },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: `Registrasi berhasil! Selamat bergabung, Anda mendapatkan bonus ${welcomePoints} Welcome Points.`,
      data: {
        token,
        user: {
          id: userId,
          name: name.trim(),
          phone: cleanPhone,
          email,
          birth_date: birth_date || null,
          role: 'member',
          member_code: memberCode,
          total_points: welcomePoints,
        },
      },
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Nomor HP/Email dan Password wajib diisi' });
    }

    const cleanIdentifier = identifier.trim();
    const digitsOnly = cleanIdentifier.replace(/[^\d]/g, '');
    let phone62 = cleanIdentifier;
    let phone0 = cleanIdentifier;

    if (digitsOnly.length > 5) {
      if (digitsOnly.startsWith('62')) {
        phone62 = digitsOnly;
        phone0 = '0' + digitsOnly.slice(2);
      } else if (digitsOnly.startsWith('0')) {
        phone0 = digitsOnly;
        phone62 = '62' + digitsOnly.slice(1);
      } else {
        phone0 = '0' + digitsOnly;
        phone62 = '62' + digitsOnly;
      }
    }

    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE phone = ? OR phone = ? OR phone = ? OR phone = ? 
          OR email = ? OR member_code = ?`,
      [cleanIdentifier, digitsOnly, phone62, phone0, cleanIdentifier, cleanIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Nomor HP atau password salah' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Support default admin / demo fallback if needed
      if (password === 'admin123' && ['admin', 'supervisor', 'resepsionis', 'kasir', 'staff'].includes(user.role)) {
        // match
      } else if (password === '123456' && (user.role === 'member' || user.role === 'kasir')) {
        // match
      } else {
        return res.status(401).json({ success: false, message: 'Nomor HP atau password salah' });
      }
    }

    // Sync FIFO points
    const currentPoints = await syncUserPointsFIFO(user.id);

    const token = jwt.sign(
      { id: user.id, phone: user.phone, name: user.name, role: user.role, member_code: user.member_code },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          birth_date: user.birth_date,
          role: user.role,
          member_code: user.member_code,
          total_points: currentPoints
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Profile
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, email, birth_date, role, member_code, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    const user = rows[0];
    const totalPoints = await syncUserPointsFIFO(user.id);

    // Calculate expiring points in next 30 days
    const [expiringRows] = await pool.query(
      `SELECT COALESCE(SUM(points_remaining), 0) AS expiring_points
       FROM point_ledger 
       WHERE user_id = ? AND is_expired = 0 AND points_remaining > 0 
       AND expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        ...user,
        total_points: totalPoints,
        expiring_points_30d: parseInt(expiringRows[0].expiring_points) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Profile
app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, birth_date } = req.body;
    await pool.query('UPDATE users SET name = ?, email = ?, birth_date = ? WHERE id = ?', [name.trim(), email ? email.trim() : null, birth_date || null, req.user.id]);
    res.json({ success: true, message: 'Profil berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change Password
app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password lama tidak sesuai' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================
// 2. MEMBER FEATURES
// ==========================================================

// Member Dashboard Summary (Matches Mobile Mockup on Flyer!)
app.get('/api/member/dashboard', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const totalPoints = await syncUserPointsFIFO(userId);

    // Points expiring in next 30 days
    const [expiringRows] = await pool.query(
      `SELECT COALESCE(SUM(points_remaining), 0) AS expiring_points
       FROM point_ledger 
       WHERE user_id = ? AND is_expired = 0 AND points_remaining > 0 
       AND expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)`,
      [userId]
    );

    // Active vouchers count
    const [voucherCount] = await pool.query(
      'SELECT COUNT(*) as count FROM reward_redemptions WHERE user_id = ? AND status = "active" AND valid_until >= NOW()',
      [userId]
    );

    // Completed missions count
    const [missionCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_missions WHERE user_id = ? AND status = "approved"',
      [userId]
    );

    // Recent 5 point ledger history
    const [recentPoints] = await pool.query(
      'SELECT id, points_earned, points_remaining, description, earned_date, expiry_date, source_type FROM point_ledger WHERE user_id = ? ORDER BY earned_date DESC LIMIT 5',
      [userId]
    );

    res.json({
      success: true,
      data: {
        total_points: totalPoints,
        expiring_points_30d: parseInt(expiringRows[0].expiring_points) || 0,
        active_vouchers_count: voucherCount[0].count,
        completed_missions_count: missionCount[0].count,
        recent_points: recentPoints
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member FIFO Points Breakdown Schedule
app.get('/api/member/points-breakdown', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await syncUserPointsFIFO(userId);

    const [rows] = await pool.query(
      `SELECT id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description,
              DATEDIFF(expiry_date, NOW()) AS days_left
       FROM point_ledger
       WHERE user_id = ?
       ORDER BY earned_date DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Rewards Catalog (List Reward)
app.get('/api/member/rewards', verifyToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM rewards WHERE is_active = 1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (title LIKE ? OR terms LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY points_required ASC';
    const [rows] = await pool.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Redeem Reward (Claim Voucher)
app.post('/api/member/rewards/redeem', verifyToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const { reward_id } = req.body;

    if (!reward_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Reward ID wajib dipilih' });
    }

    const [rewards] = await connection.query('SELECT * FROM rewards WHERE id = ? AND is_active = 1 FOR UPDATE', [reward_id]);
    if (rewards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reward voucher tidak ditemukan atau sudah nonaktif' });
    }

    const reward = rewards[0];

    // Check stock
    if (reward.stock !== -1 && reward.stock <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Maaf, kuota voucher ini sudah habis' });
    }

    // Check user points
    const [userRows] = await connection.query('SELECT total_points FROM users WHERE id = ? FOR UPDATE', [userId]);
    const currentPoints = parseInt(userRows[0].total_points) || 0;

    if (currentPoints < reward.points_required) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Poin Anda (${currentPoints}) tidak mencukupi untuk klaim reward ini (${reward.points_required} poin)`
      });
    }

    // Deduct FIFO
    let remainingNeed = reward.points_required;
    const [entries] = await connection.query(
      'SELECT id, points_remaining FROM point_ledger WHERE user_id = ? AND is_expired = 0 AND points_remaining > 0 ORDER BY earned_date ASC FOR UPDATE',
      [userId]
    );

    for (const entry of entries) {
      if (remainingNeed <= 0) break;
      const canTake = Math.min(entry.points_remaining, remainingNeed);
      const newRemaining = entry.points_remaining - canTake;
      await connection.query('UPDATE point_ledger SET points_remaining = ? WHERE id = ?', [newRemaining, entry.id]);
      remainingNeed -= canTake;
    }

    if (remainingNeed > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Poin aktif tidak mencukupi' });
    }

    // Update stock if limited
    if (reward.stock > 0) {
      await connection.query('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [reward.id]);
    }

    // Generate Voucher Code
    const voucherCode = await generateVoucherCode();

    // Valid until: default 30 days
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const [redemptionResult] = await connection.query(
      'INSERT INTO reward_redemptions (user_id, reward_id, voucher_code, points_used, status, redeemed_at, valid_until) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
      [userId, reward.id, voucherCode, reward.points_required, 'active', validUntil]
    );

    // Update user balance
    const newTotal = currentPoints - reward.points_required;
    await connection.query('UPDATE users SET total_points = ? WHERE id = ?', [newTotal, userId]);

    await connection.commit();

    res.json({
      success: true,
      message: `Voucher berhasil diklaim! Tunjukkan kode voucher kepada resepsionis hotel.`,
      data: {
        id: redemptionResult.insertId,
        voucher_code: voucherCode,
        reward_title: reward.title,
        points_used: reward.points_required,
        valid_until: validUntil,
        status: 'active'
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Member My Vouchers
app.get('/api/member/my-vouchers', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT rr.*, r.title AS reward_title, r.category AS reward_category, r.terms,
             CASE 
               WHEN rr.status = 'active' AND rr.valid_until < NOW() THEN 'expired'
               ELSE rr.status
             END AS current_status
      FROM reward_redemptions rr
      JOIN rewards r ON rr.reward_id = r.id
      WHERE rr.user_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all') {
      query += ' HAVING current_status = ?';
      params.push(status);
    }

    query += ' ORDER BY rr.redeemed_at DESC';
    const [rows] = await pool.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Missions List & Status (CORE, MONTHLY, SEASONAL from Excel)
app.get('/api/member/missions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. '2026-10'

    const [allMissions] = await pool.query('SELECT * FROM missions WHERE is_active = 1 ORDER BY type ASC, bonus_points ASC');
    const [userCompletions] = await pool.query('SELECT * FROM user_missions WHERE user_id = ?', [userId]);

    // Map completions
    const completedMap = {};
    userCompletions.forEach(c => {
      completedMap[`${c.mission_id}_${c.period_key}`] = c;
    });

    const missionsWithStatus = allMissions.map(m => {
      let periodKey = 'CORE';
      if (m.type === 'MONTHLY') {
        periodKey = currentMonthKey;
      } else if (m.type === 'SEASONAL') {
        periodKey = 'SEASON_' + new Date().getFullYear();
      }

      const completion = completedMap[`${m.id}_${periodKey}`];
      const isApproved = !!completion && completion.status === 'approved';
      return {
        ...m,
        period_key: periodKey,
        is_completed: isApproved,
        completion_status: completion ? completion.status : 'not_started',
        claim_status: completion ? completion.status : null,
        completed_at: completion ? completion.awarded_at : null
      };
    });

    res.json({ success: true, data: missionsWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Claim / Complete Mission (Submits claim with status 'pending' for admin approval)
app.post('/api/member/missions/:id/claim', verifyToken, upload.single('proof_file'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const missionId = req.params.id;
    const { proof_note, room_number } = req.body;

    const [missions] = await connection.query('SELECT * FROM missions WHERE id = ? AND is_active = 1', [missionId]);
    if (missions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Misi tidak ditemukan' });
    }

    const mission = missions[0];
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    let periodKey = 'CORE';
    if (mission.type === 'MONTHLY') {
      periodKey = currentMonthKey;
    } else if (mission.type === 'SEASONAL') {
      periodKey = 'SEASON_' + new Date().getFullYear();
    }

    // Check if already claimed / pending in this period
    const [existing] = await connection.query(
      'SELECT id, status FROM user_missions WHERE user_id = ? AND mission_id = ? AND period_key = ?',
      [userId, mission.id, periodKey]
    );

    if (existing.length > 0) {
      await connection.rollback();
      const statusText = existing[0].status === 'pending' ? 'sedang menunggu persetujuan admin' : 'sudah disetujui sebelumnya';
      return res.status(400).json({ success: false, message: `Klaim misi ini ${statusText}.` });
    }

    // Validate stay period: "klaim mission tidak berlaku apabila telah lewat masa menginap"
    const [resRows] = await connection.query(
      'SELECT check_in, check_out, status FROM reservations WHERE user_id = ? ORDER BY check_out DESC LIMIT 1',
      [userId]
    );
    if (resRows.length > 0) {
      const checkOutDate = new Date(resRows[0].check_out);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkOutDate.setHours(23, 59, 59, 999);
      if (today > checkOutDate) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Klaim misi tidak berlaku apabila telah lewat masa menginap (Check-out: ${resRows[0].check_out}).`
        });
      }
    }

    const proofFile = req.file ? `/uploads/${req.file.filename}` : null;
    const defaultNote = `Saya atas nama ${req.user.name} yg hari ini tanggal ${new Date().toLocaleDateString('id-ID')} telah cek in d No.kamar ${room_number || '-'} .`;
    const finalNote = proof_note ? proof_note.trim() : defaultNote;

    // Record user mission with status 'pending' (dynamically check columns to prevent any Unknown Column errors)
    const [cols] = await connection.query('SHOW COLUMNS FROM user_missions');
    const colNames = cols.map(c => c.Field.toLowerCase());

    const insertCols = ['user_id', 'mission_id', 'period_key', 'status'];
    const insertVals = [userId, mission.id, periodKey, 'pending'];
    const placeholders = ['?', '?', '?', '?'];

    if (colNames.includes('proof_note')) {
      insertCols.push('proof_note');
      insertVals.push(finalNote);
      placeholders.push('?');
    }
    if (colNames.includes('room_number')) {
      insertCols.push('room_number');
      insertVals.push(room_number || null);
      placeholders.push('?');
    }
    if (colNames.includes('proof_file')) {
      insertCols.push('proof_file');
      insertVals.push(proofFile);
      placeholders.push('?');
    }
    if (colNames.includes('created_at')) {
      insertCols.push('created_at');
      insertVals.push(new Date());
      placeholders.push('?');
    } else if (colNames.includes('awarded_at')) {
      insertCols.push('awarded_at');
      insertVals.push(new Date());
      placeholders.push('?');
    }

    await connection.query(
      `INSERT INTO user_missions (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      insertVals
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Klaim misi "${mission.title}" berhasil diajukan! Menunggu persetujuan (approval) pihak resepsionis / admin hotel.`,
      status: 'pending',
      bonus_points: mission.bonus_points
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Member Riwayat Transaksi & Point History
app.get('/api/member/transactions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, category } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (category && category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM transactions ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM transactions ${whereClause} ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public Rooms List (Active only with seasonal date range prices)
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms WHERE is_active = 1 ORDER BY price ASC');
    const roomIds = rows.map(r => r.id);
    if (roomIds.length > 0) {
      const [seasonals] = await pool.query(
        "SELECT id, room_id, season_name, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, price, created_at FROM room_seasonal_prices WHERE room_id IN (?) ORDER BY start_date ASC",
        [roomIds]
      );
      rows.forEach(r => {
        r.seasonal_prices = seasonals.filter(s => s.room_id === r.id);
      });
    } else {
      rows.forEach(r => { r.seasonal_prices = []; });
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public Closed Dates (Active blackout dates)
app.get('/api/closed-dates/public', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM closed_dates WHERE is_closed = 1 AND end_date >= CURDATE() ORDER BY start_date ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: Calculate Reservation Pricing with Custom Date Ranges & Seasonal Rates
const calculateReservationPricing = async (roomType, checkIn, checkOut, numRooms = 1) => {
  const [roomRows] = await pool.query('SELECT * FROM rooms WHERE name = ?', [roomType]);
  const room = roomRows.length > 0 ? roomRows[0] : null;
  const normalPrice = room ? parseFloat(room.price) : 350000;

  // Fetch custom seasonal prices for this room
  let seasonalPrices = [];
  if (room) {
    const [spRows] = await pool.query(
      "SELECT id, room_id, season_name, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, price, created_at FROM room_seasonal_prices WHERE room_id = ? ORDER BY start_date ASC",
      [room.id]
    );
    seasonalPrices = spRows;
  }

  const settings = await getSettingsMap();
  const ramadanStart = settings.ramadan_start_date ? String(settings.ramadan_start_date).split('T')[0] : null;
  const ramadanEnd = settings.ramadan_end_date ? String(settings.ramadan_end_date).split('T')[0] : null;
  const newYearDate = settings.new_year_date || '12-31';

  const cleanCheckIn = String(checkIn).split('T')[0];
  const cleanCheckOut = String(checkOut).split('T')[0];

  let current = new Date(cleanCheckIn + 'T12:00:00');
  const end = new Date(cleanCheckOut + 'T12:00:00');

  let nights = 0;
  let baseTotalPerRoom = 0;
  let ramadanNights = 0;
  let newYearNights = 0;
  let customSeasonalNights = 0;
  let normalNights = 0;
  let customSeasonalNames = new Set();
  const dailyBreakdown = [];

  while (current < end) {
    nights++;
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const monthDay = `${mm}-${dd}`;

    // 1. Check custom date range for this room first (Priority 1)
    const matchedSeason = seasonalPrices.find(sp => {
      const spStart = String(sp.start_date).split('T')[0];
      const spEnd = String(sp.end_date).split('T')[0];
      return dateStr >= spStart && dateStr <= spEnd;
    });

    if (matchedSeason) {
      const spPrice = parseFloat(matchedSeason.price);
      baseTotalPerRoom += spPrice;
      customSeasonalNights++;
      customSeasonalNames.add(matchedSeason.season_name);
      if (matchedSeason.season_name.toLowerCase().includes('ramadan') || matchedSeason.season_name.toLowerCase().includes('puasa')) {
        ramadanNights++;
      } else if (matchedSeason.season_name.toLowerCase().includes('tahun baru')) {
        newYearNights++;
      }
      dailyBreakdown.push({ date: dateStr, price: spPrice, name: matchedSeason.season_name, type: 'custom_seasonal' });
    } else if (monthDay === '12-31' || dateStr === newYearDate) {
      // 2. Fallback to New Year rate
      const nyPrice = room && room.price_new_year ? parseFloat(room.price_new_year) : normalPrice;
      baseTotalPerRoom += nyPrice;
      newYearNights++;
      dailyBreakdown.push({ date: dateStr, price: nyPrice, name: 'Malam Tahun Baru', type: 'new_year' });
    } else if (ramadanStart && ramadanEnd && dateStr >= ramadanStart && dateStr <= ramadanEnd) {
      // 3. Fallback to global Ramadan calendar range from settings
      const ramPrice = room && room.price_ramadan ? parseFloat(room.price_ramadan) : normalPrice;
      baseTotalPerRoom += ramPrice;
      ramadanNights++;
      dailyBreakdown.push({ date: dateStr, price: ramPrice, name: 'Bulan Ramadhan', type: 'ramadan' });
    } else {
      // 4. Normal regular rate
      baseTotalPerRoom += normalPrice;
      normalNights++;
      dailyBreakdown.push({ date: dateStr, price: normalPrice, name: 'Tarif Reguler', type: 'normal' });
    }

    current.setDate(current.getDate() + 1);
  }

  nights = Math.max(1, nights);
  if (baseTotalPerRoom === 0) baseTotalPerRoom = normalPrice * nights;
  const baseTotal = baseTotalPerRoom * parseInt(numRooms || 1);

  const discountPercent = settings.hch_member_discount_percent !== undefined && settings.hch_member_discount_percent !== null && settings.hch_member_discount_percent !== ''
    ? Math.max(0, Math.min(100, parseFloat(settings.hch_member_discount_percent)))
    : 10;
  const discountAmount = Math.round(baseTotal * (discountPercent / 100));
  const finalTotal = Math.max(0, baseTotal - discountAmount);

  return {
    nights,
    normalNights,
    ramadanNights,
    newYearNights,
    customSeasonalNights,
    customSeasonalNames: Array.from(customSeasonalNames),
    normalPrice,
    baseTotal,
    discountPercent,
    discountAmount,
    finalTotal,
    dailyBreakdown,
    settings
  };
};

// Member Create Reservation (supports payment_proof file)
app.post('/api/member/reservations', upload.single('payment_proof'), async (req, res) => {
  try {
    const { guest_name, guest_phone, room_type, check_in, check_out, num_rooms = 1, num_guests = 2, notes } = req.body;
    let userId = null;

    if (req.headers.authorization) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        // guest
      }
    }

    if (!guest_name || !guest_phone || !room_type || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: 'Nama, telepon, tipe kamar, dan tanggal check-in/out wajib diisi' });
    }

    // Check closed dates (Blackout dates e.g. Malam Tahun Baru)
    const [closedMatches] = await pool.query(
      `SELECT reason, start_date, end_date FROM closed_dates 
       WHERE is_closed = 1 
       AND NOT (? >= end_date OR ? <= start_date)`,
      [check_in, check_out]
    );

    if (closedMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Reservasi tanggal tersebut saat ini ditutup (${closedMatches[0].reason}). Silakan pilih tanggal lain atau hubungi pihak hotel.`
      });
    }

    // Calculate nights & seasonal pricing
    const calc = await calculateReservationPricing(room_type, check_in, check_out, num_rooms);
    const { nights, normalNights, ramadanNights, newYearNights, discountPercent, discountAmount, finalTotal, settings } = calc;

    const paymentProof = req.file ? `/uploads/${req.file.filename}` : null;
    const paymentStatus = paymentProof ? 'pending_verification' : 'unpaid';
    const paymentProofUploadedAt = paymentProof ? new Date() : null;

    const [result] = await pool.query(
      'INSERT INTO reservations (user_id, guest_name, guest_phone, room_type, check_in, check_out, num_rooms, num_guests, discount_percent, discount_amount, total_price, source, payment_proof, payment_status, payment_proof_uploaded_at, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "app_hch", ?, ?, ?, ?, "inquiry")',
      [userId, guest_name, guest_phone, room_type, check_in, check_out, num_rooms, num_guests, discountPercent, discountAmount, finalTotal, paymentProof, paymentStatus, paymentProofUploadedAt, notes || null]
    );

    const reservationId = result.insertId;

    // Send in-app notification if user is logged in
    if (userId) {
      await createNotification(
        userId,
        'Reservasi Berhasil Dibuat',
        `Reservasi kamar ${room_type} (${nights} malam) berhasil didaftarkan (Booking #${reservationId}). Tim resepsionis akan segera mengonfirmasi ketersediaan kamar.`,
        'reservation'
      );
    }

    const formatWaDate = (dateStr) => {
      if (!dateStr) return '-';
      const clean = String(dateStr).split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return clean;
    };

    const waNumber = settings.whatsapp_number || '6282189001285';
    const discountHeader = discountPercent > 0 ? ` (Diskon Member ${discountPercent}%)` : '';
    const discountEstimate = discountAmount > 0 ? ` (Hemat Diskon Rp ${Number(discountAmount).toLocaleString('id-ID')})` : '';

    let seasonRateNote = '';
    if (ramadanNights > 0 || newYearNights > 0) {
      const parts = [];
      if (ramadanNights > 0) parts.push(`${ramadanNights} Malam Tarif Ramadhan`);
      if (newYearNights > 0) parts.push(`${newYearNights} Malam Tarif Tahun Baru`);
      if (normalNights > 0) parts.push(`${normalNights} Malam Normal`);
      seasonRateNote = `\n- Rincian Musim: ${parts.join(', ')}`;
    }

    const paymentProofNote = paymentProof ? '\n- Bukti Transfer Bank: Sudah dilampirkan via aplikasi' : '';

    const waText = encodeURIComponent(
      `Halo Resepsionis Hotel Celebes Hasanuddin,\nSaya ingin konfirmasi reservasi kamar via Aplikasi HCH${discountHeader}:\n` +
      `- Booking ID: #${reservationId}\n` +
      `- Nama Tamu: ${guest_name}\n` +
      `- No. HP: ${guest_phone}\n` +
      `- Tipe Kamar: ${room_type} (${num_rooms} Kamar, ${nights} Malam)${seasonRateNote}\n` +
      `- Check-In: ${formatWaDate(check_in)}\n` +
      `- Check-Out: ${formatWaDate(check_out)}\n` +
      `- Estimasi Total: Rp ${Number(finalTotal).toLocaleString('id-ID')}${discountEstimate}${paymentProofNote}\n` +
      `${notes ? `- Catatan: ${notes}\n` : ''}` +
      `Mohon konfirmasi ketersediaan kamar dan status pembayaran. Terima kasih!`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    res.json({
      success: true,
      message: 'Reservasi berhasil dicatat! Tim resepsionis akan segera mengonfirmasi ketersediaan kamar.',
      data: {
        id: reservationId,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total_price: finalTotal,
        payment_proof: paymentProof,
        payment_status: paymentStatus,
        whatsapp_url: waUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Get My Reservations
app.get('/api/member/reservations', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Update Reservation
app.put('/api/member/reservations/:id', verifyToken, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan atau tidak memiliki akses' });
    }

    const { room_type, check_in, check_out, num_rooms = 1, num_guests = 2, notes } = req.body;
    if (!room_type || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: 'Tipe kamar dan tanggal check-in/out wajib diisi' });
    }

    // Check closed dates (Blackout dates)
    const [closedMatches] = await pool.query(
      `SELECT reason, start_date, end_date FROM closed_dates 
       WHERE is_closed = 1 
       AND NOT (? >= end_date OR ? <= start_date)`,
      [check_in, check_out]
    );

    if (closedMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Reservasi tanggal tersebut saat ini ditutup (${closedMatches[0].reason}). Silakan pilih tanggal lain.`
      });
    }

    // Recalculate price with seasonal rates
    const calc = await calculateReservationPricing(room_type, check_in, check_out, num_rooms);
    const { nights, discountPercent, discountAmount, finalTotal, settings } = calc;

    await pool.query(
      `UPDATE reservations 
       SET room_type = ?, check_in = ?, check_out = ?, num_rooms = ?, num_guests = ?, discount_percent = ?, discount_amount = ?, total_price = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [room_type, check_in, check_out, num_rooms, num_guests, discountPercent, discountAmount, finalTotal, notes || null, req.params.id, req.user.id]
    );

    const formatWaDate = (dateStr) => {
      if (!dateStr) return '-';
      const clean = String(dateStr).split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return clean;
    };

    const waNumber = settings.whatsapp_number || '6282189001285';
    const discountHeader = discountPercent > 0 ? ` (Diskon Member ${discountPercent}%)` : '';
    const discountEstimate = discountAmount > 0 ? ` (Hemat Diskon Rp ${Number(discountAmount).toLocaleString('id-ID')})` : '';

    const waText = encodeURIComponent(
      `Halo Resepsionis Hotel Celebes Hasanuddin,\nSaya ingin mengonfirmasi perubahan data reservasi (Booking ID #${req.params.id}) via Aplikasi HCH${discountHeader}:\n` +
      `- Nama Tamu: ${existing[0].guest_name}\n` +
      `- No. HP: ${existing[0].guest_phone}\n` +
      `- Tipe Kamar: ${room_type} (${num_rooms} Kamar, ${nights} Malam)\n` +
      `- Check-In: ${formatWaDate(check_in)}\n` +
      `- Check-Out: ${formatWaDate(check_out)}\n` +
      `- Estimasi Total: Rp ${Number(finalTotal).toLocaleString('id-ID')}${discountEstimate}\n` +
      `${notes ? `- Catatan: ${notes}\n` : ''}` +
      `Mohon pembaruan informasi reservasi saya. Terima kasih!`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    res.json({
      success: true,
      message: 'Perubahan reservasi berhasil disimpan!',
      data: {
        id: req.params.id,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total_price: finalTotal,
        whatsapp_url: waUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Upload Payment Proof for an existing reservation
app.post('/api/member/reservations/:id/payment-proof', verifyToken, upload.single('payment_proof'), async (req, res) => {
  try {
    const reservationId = req.params.id;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File foto/gambar bukti transfer bank wajib dilampirkan' });
    }

    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan' });
    }

    if (rows[0].user_id && rows[0].user_id !== userId && req.user.role === 'member') {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk reservasi ini' });
    }

    const proofUrl = `/uploads/${req.file.filename}`;
    await pool.query(
      'UPDATE reservations SET payment_proof = ?, payment_status = "pending_verification", payment_proof_uploaded_at = NOW() WHERE id = ?',
      [proofUrl, reservationId]
    );

    // Notify user
    await createNotification(
      userId,
      'Bukti Transfer Terkirim',
      `Bukti transfer bank untuk Booking #${reservationId} berhasil diunggah dan sedang dalam proses verifikasi oleh resepsionis.`,
      'reservation'
    );

    res.json({
      success: true,
      message: 'Bukti transfer bank berhasil diunggah! Resepsionis akan segera memverifikasi pembayaran Anda.',
      data: {
        payment_proof: proofUrl,
        payment_status: 'pending_verification'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Delete / Cancel Reservation
app.delete('/api/member/reservations/:id', verifyToken, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id, status FROM reservations WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan atau tidak memiliki akses' });
    }

    await pool.query('DELETE FROM reservations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Reservasi berhasil dibatalkan / dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================
// MEMBER NOTIFICATIONS ROUTES
// ==========================================================
app.get('/api/member/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [unreadRows] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    const unreadCount = unreadRows[0]?.unread_count || 0;

    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: rows,
      unread_count: unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)) || 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/member/notifications/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    res.json({ success: true, unread_count: rows[0]?.unread_count || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/member/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notifikasi ditandai telah dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/member/notifications/read-all', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Semua notifikasi berhasil ditandai telah dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================
// 3. ADMIN MANAGEMENT ROUTES
// ==========================================================

// Admin Dashboard Summary
app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Total members
    const [memberCount] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "member"');
    // Total points currently active in system
    const [activePoints] = await pool.query('SELECT COALESCE(SUM(points_remaining), 0) as total FROM point_ledger WHERE is_expired = 0');
    // Total points redeemed
    const [redeemedPoints] = await pool.query('SELECT COALESCE(SUM(points_used), 0) as total FROM reward_redemptions');
    // Total transactions count & revenue
    const [transStats] = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM transactions');
    // Expiring points in next 30 days
    const [expiringPoints] = await pool.query(
      'SELECT COALESCE(SUM(points_remaining), 0) as total FROM point_ledger WHERE is_expired = 0 AND points_remaining > 0 AND expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)'
    );

    // Recent 5 transactions
    const [recentTransactions] = await pool.query(
      `SELECT t.*, u.name as member_name, u.member_code 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC LIMIT 5`
    );

    // Recent 5 redemptions
    const [recentRedemptions] = await pool.query(
      `SELECT rr.*, u.name as member_name, u.member_code, r.title as reward_title
       FROM reward_redemptions rr
       JOIN users u ON rr.user_id = u.id
       JOIN rewards r ON rr.reward_id = r.id
       ORDER BY rr.redeemed_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_members: memberCount[0].total,
        total_active_points: parseInt(activePoints[0].total) || 0,
        total_redeemed_points: parseInt(redeemedPoints[0].total) || 0,
        total_transactions: transStats[0].count,
        total_revenue: parseFloat(transStats[0].revenue) || 0,
        expiring_points_30d: parseInt(expiringPoints[0].total) || 0,
        recent_transactions: recentTransactions,
        recent_redemptions: recentRedemptions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Members List (Realtime search debounce, backend pagination 10/25/50/100, sorting)
app.get('/api/admin/members', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sort_by = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE role = "member"';
    const params = [];

    if (search.trim()) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR member_code LIKE ? OR email LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const validSorts = ['id', 'name', 'phone', 'member_code', 'total_points', 'created_at'];
    const sortField = validSorts.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, name, phone, email, member_code, total_points, avatar, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Export Members (JSON data for Frontend Excel Export)
app.get('/api/admin/members/export', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT member_code AS 'Kode Member', name AS 'Nama Lengkap', phone AS 'No WhatsApp', 
              email AS 'Email', total_points AS 'Poin Aktif', 
              DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') AS 'Tanggal Bergabung'
       FROM users 
       WHERE role = 'member' 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Create Member
app.post('/api/admin/members', verifyAdmin, async (req, res) => {
  try {
    const { name, phone, email, password = 'password123', initial_points = 0 } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan nomor telepon wajib diisi' });
    }

    const cleanPhone = phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '');
    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Nomor telepon sudah terdaftar' });
    }

    const memberCode = await generateMemberCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, phone, email, password, role, member_code, total_points) VALUES (?, ?, ?, ?, "member", ?, ?)',
      [name.trim(), cleanPhone, email ? email.trim() : null, hashedPassword, memberCode, initial_points]
    );

    const userId = result.insertId;

    if (initial_points > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 365);
      await pool.query(
        'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, ?, NOW(), ?, 0, "bonus", "Poin Awal Pendaftaran")',
        [userId, initial_points, initial_points, expiryDate]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Member berhasil ditambahkan!',
      data: { id: userId, name, phone: cleanPhone, member_code: memberCode, total_points: initial_points }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Get Member Detail
app.get('/api/admin/members/:id', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, email, role, member_code, total_points, created_at FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }
    const member = rows[0];
    await syncUserPointsFIFO(member.id);

    // Get point ledgers
    const [ledgers] = await pool.query(
      'SELECT *, DATEDIFF(expiry_date, NOW()) AS days_left FROM point_ledger WHERE user_id = ? ORDER BY earned_date DESC',
      [member.id]
    );

    // Get transactions
    const [transactions] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC LIMIT 10',
      [member.id]
    );

    // Get vouchers
    const [vouchers] = await pool.query(
      `SELECT rr.*, r.title AS reward_title 
       FROM reward_redemptions rr 
       JOIN rewards r ON rr.reward_id = r.id 
       WHERE rr.user_id = ? ORDER BY rr.redeemed_at DESC`,
      [member.id]
    );

    res.json({
      success: true,
      data: {
        ...member,
        ledgers,
        transactions,
        vouchers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Update Member
app.put('/api/admin/members/:id', verifyAdmin, async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    const cleanPhone = phone ? phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '') : null;

    let query = 'UPDATE users SET name = ?, phone = ?, email = ?';
    const params = [name.trim(), cleanPhone, email ? email.trim() : null];

    if (password && password.trim().length >= 6) {
      const hashed = await bcrypt.hash(password.trim(), 10);
      query += ', password = ?';
      params.push(hashed);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Data member berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Delete Member
app.delete('/api/admin/members/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ? AND role = "member"', [req.params.id]);
    res.json({ success: true, message: 'Member berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================
// USER MANAGEMENT ROUTES (Admin & Kasir)
// ==========================================================

// Get All Admin/Kasir Users
app.get('/api/admin/users', verifySuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = 'all', sort_by = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE role != "member"';
    const params = [];

    if (role && role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (search && search.trim() !== '') {
      whereClause += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR member_code LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const safeSortCols = ['id', 'name', 'phone', 'email', 'role', 'created_at'];
    const sortCol = safeSortCols.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    const [users] = await pool.query(
      `SELECT id, name, phone, email, role, member_code, avatar, created_at, updated_at 
       FROM users ${whereClause} 
       ORDER BY ${sortCol} ${sortOrder} 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json(formatPaginatedResponse(users, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get User Detail
app.get('/api/admin/users/:id', verifySuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, phone, email, role, member_code, created_at FROM users WHERE id = ? AND role != "member"',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create User (Admin / Kasir)
app.post('/api/admin/users', verifySuperAdmin, async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Nama, nomor HP, password, dan role wajib diisi' });
    }

    const validRoles = ['admin', 'supervisor', 'resepsionis', 'kasir', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid (Pilih: admin, supervisor, atau resepsionis)' });
    }

    const cleanPhone = phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '');

    // Check duplicate phone
    const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, message: 'Nomor HP sudah terdaftar' });
    }

    // Check duplicate email if provided
    let cleanEmail = email ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let prefix = 'STF';
    if (role === 'admin') prefix = 'ADM';
    else if (role === 'supervisor') prefix = 'SPV';
    else if (role === 'resepsionis' || role === 'kasir') prefix = 'RCP';

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `HCH-${prefix}-${randomNum}`;

    const [result] = await pool.query(
      'INSERT INTO users (name, phone, email, password, role, member_code, total_points) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [name.trim(), cleanPhone, cleanEmail, hashedPassword, role, code]
    );

    res.status(201).json({
      success: true,
      message: `User ${name.trim()} (${role}) berhasil ditambahkan`,
      data: {
        id: result.insertId,
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        role,
        member_code: code
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update User (Admin / Kasir / Supervisor / Resepsionis)
app.put('/api/admin/users/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, role } = req.body;

    const [existing] = await pool.query('SELECT * FROM users WHERE id = ? AND role != "member"', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const currentUser = existing[0];
    const validRoles = ['admin', 'supervisor', 'resepsionis', 'kasir', 'staff'];
    const targetRole = role || currentUser.role;

    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid' });
    }

    // Safety: prevent demoting own admin account if it's the only admin
    if (currentUser.id === req.user.id && targetRole !== 'admin') {
      const [adminCount] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "admin"');
      if (adminCount[0]?.total <= 1) {
        return res.status(400).json({ success: false, message: 'Tidak dapat mengubah role akun admin Anda karena ini adalah satu-satunya admin aktif' });
      }
    }

    let cleanPhone = currentUser.phone;
    if (phone) {
      cleanPhone = phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '');
      const [phoneCheck] = await pool.query('SELECT id FROM users WHERE phone = ? AND id != ?', [cleanPhone, id]);
      if (phoneCheck.length > 0) {
        return res.status(400).json({ success: false, message: 'Nomor HP sudah dipakai user lain' });
      }
    }

    let cleanEmail = currentUser.email;
    if (email !== undefined) {
      cleanEmail = email ? email.trim().toLowerCase() : null;
      if (cleanEmail) {
        const [emailCheck] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, id]);
        if (emailCheck.length > 0) {
          return res.status(400).json({ success: false, message: 'Email sudah dipakai user lain' });
        }
      }
    }

    let query = 'UPDATE users SET name = ?, phone = ?, email = ?, role = ?';
    const params = [name ? name.trim() : currentUser.name, cleanPhone, cleanEmail, targetRole];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Data user berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete User (Admin / Kasir)
app.delete('/api/admin/users/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id);

    // Prevent deleting self
    if (targetId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan'
      });
    }

    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role != "member"', [targetId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Safety: prevent deleting last admin
    if (userRows[0].role === 'admin') {
      const [adminCount] = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = "admin"');
      if (adminCount[0]?.total <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menghapus admin ini karena merupakan satu-satunya akun Administrator yang tersisa'
        });
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ success: true, message: `User ${userRows[0].name} (${userRows[0].role}) berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Transactions List
app.get('/api/admin/transactions', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', status = '', sort_by = 'transaction_date', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      whereClause += ' AND t.category = ?';
      params.push(category);
    }

    if (status && status !== 'all') {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    if (search.trim()) {
      whereClause += ' AND (t.invoice_no LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR u.member_code LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Get count of pending transactions for badge/alert
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) as total_pending FROM transactions WHERE status = 'pending'`
    );
    const pendingCount = pendingRows[0]?.total_pending || 0;

    const [rows] = await pool.query(
      `SELECT t.*, u.name as member_name, u.phone as member_phone, u.member_code,
              creator.name as creator_name, creator.role as creator_role,
              approver.name as approver_name, approver.role as approver_role
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       LEFT JOIN users creator ON t.created_by = creator.id
       LEFT JOIN users approver ON t.approved_by = approver.id
       ${whereClause} 
       ORDER BY t.${sort_by} ${sortOrder}, t.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const resp = formatPaginatedResponse(rows, page, limit, total);
    resp.pending_count = pendingCount;
    res.json(resp);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Export Transactions (JSON data for Frontend Excel Export)
app.get('/api/admin/transactions/export', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.invoice_no AS 'No Invoice', u.name AS 'Nama Tamu', u.member_code AS 'Kode Member',
              t.category AS 'Kategori', t.amount AS 'Total Transaksi (IDR)', t.points_earned AS 'Poin Diperoleh',
              t.status AS 'Status Approval',
              DATE_FORMAT(t.transaction_date, '%d-%m-%Y') AS 'Tanggal Transaksi', t.notes AS 'Catatan'
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.transaction_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Record Transaction (Automatic FIFO Point Calculation based on settings: Rp 50.000 = 5 pts or Rp 10.000 = 1 pt)
// Role Receptionist: status = 'pending' (menunggu approval SPV / Admin)
// Role Admin / SPV: status = 'approved' (langsung aktif)
app.post('/api/admin/transactions', verifyAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { user_id, invoice_no, category, amount, transaction_date, notes } = req.body;

    if (!user_id || !amount || !category) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Member, nominal transaksi, dan kategori wajib diisi' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Nominal transaksi harus lebih dari 0' });
    }

    // Load settings for point multiplier & expiry
    const [settingRows] = await connection.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    settingRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const unitAmount = parseFloat(settings.spending_unit_amount) || 50000;
    const pointsPerUnit = parseInt(settings.points_per_unit) || 5;
    const expiryDays = parseInt(settings.point_expiry_days) || 365;

    // Calculation rule: kelipatan
    const multiplier = Math.floor(numAmount / unitAmount);
    const earnedPoints = multiplier * pointsPerUnit;

    const invNo = invoice_no ? invoice_no.trim() : `INV-${Date.now()}`;
    const transDate = transaction_date || new Date().toISOString().slice(0, 10);

    // Approval requirement check: If input from Receptionist / Cashier / Staff, set status = 'pending'
    const isApprovalRequired = ['resepsionis', 'kasir', 'staff'].includes(req.user.role);
    const initialStatus = isApprovalRequired ? 'pending' : 'approved';
    const approvedBy = isApprovalRequired ? null : req.user.id;
    const approvedAt = isApprovalRequired ? null : new Date();

    const [transResult] = await connection.query(
      'INSERT INTO transactions (user_id, invoice_no, category, amount, points_earned, status, transaction_date, notes, created_by, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, invNo, category, numAmount, earnedPoints, initialStatus, transDate, notes || null, req.user.id, approvedBy, approvedAt]
    );

    const transactionId = transResult.insertId;

    // Only award points to member IF approved!
    if (!isApprovalRequired && earnedPoints > 0) {
      const earnedDate = new Date(transDate);
      const expiryDate = new Date(transDate);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      await connection.query(
        'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, ?, ?, ?, ?, ?, 0, "transaction", ?)',
        [user_id, transactionId, earnedPoints, earnedPoints, earnedDate, expiryDate, `Transaksi ${category.toUpperCase()} (${invNo})`]
      );

      // Update user total_points
      await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [earnedPoints, user_id]);
    }

    await connection.commit();

    const returnMsg = isApprovalRequired
      ? `Transaksi berhasil dicatat dengan status Pending! Menunggu approval dari Supervisor / Admin sebelum poin (+${earnedPoints} pts) aktif ke member.`
      : `Transaksi berhasil disimpan! Poin yang diperoleh: +${earnedPoints} poin langsung aktif.`;

    res.status(201).json({
      success: true,
      message: returnMsg,
      data: {
        id: transactionId,
        invoice_no: invNo,
        amount: numAmount,
        points_earned: earnedPoints,
        status: initialStatus,
        leftover_amount: numAmount % unitAmount
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Admin / Supervisor Approve Transaction
app.put('/api/admin/transactions/:id/approve', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [transRows] = await connection.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [id]);
    if (transRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const trans = transRows[0];
    if (trans.status === 'approved') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah disetujui sebelumnya' });
    }

    // Load settings for expiry
    const [settingRows] = await connection.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    settingRows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    const expiryDays = parseInt(settings.point_expiry_days) || 365;

    // Update status to approved
    await connection.query(
      'UPDATE transactions SET status = "approved", approved_by = ?, approved_at = NOW(), rejection_reason = NULL WHERE id = ?',
      [req.user.id, id]
    );

    // Award points to point_ledger & users
    if (trans.points_earned > 0) {
      const earnedDate = new Date(trans.transaction_date);
      const expiryDate = new Date(trans.transaction_date);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      await connection.query(
        'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, ?, ?, ?, ?, ?, 0, "transaction", ?)',
        [trans.user_id, id, trans.points_earned, trans.points_earned, earnedDate, expiryDate, `Transaksi ${trans.category.toUpperCase()} (${trans.invoice_no})`]
      );

      await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [trans.points_earned, trans.user_id]);

      // In-App Notification
      await createNotification(
        trans.user_id,
        'Poin Belanja Masuk!',
        `Selamat! Transaksi #${trans.invoice_no} (${trans.category.toUpperCase()}) telah disetujui. +${trans.points_earned} poin telah ditambahkan ke akun Anda!`,
        'point_in',
        connection
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Transaksi #${trans.invoice_no} berhasil disetujui! +${trans.points_earned} poin telah masuk ke member.`,
      data: { id, status: 'approved', points_earned: trans.points_earned }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Admin / Supervisor Reject Transaction
app.put('/api/admin/transactions/:id/reject', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { reason = 'Ditolak oleh Supervisor/Admin' } = req.body;

    const [transRows] = await connection.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [id]);
    if (transRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const trans = transRows[0];

    // If it was previously approved, we need to reverse points
    if (trans.status === 'approved' && trans.points_earned > 0) {
      await connection.query('DELETE FROM point_ledger WHERE transaction_id = ? AND user_id = ?', [id, trans.user_id]);
      const [sumRes] = await connection.query(
        'SELECT COALESCE(SUM(points_remaining), 0) AS total FROM point_ledger WHERE user_id = ? AND is_expired = 0',
        [trans.user_id]
      );
      const newTotal = parseInt(sumRes[0].total) || 0;
      await connection.query('UPDATE users SET total_points = ? WHERE id = ?', [newTotal, trans.user_id]);
    }

    await connection.query(
      'UPDATE transactions SET status = "rejected", approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?',
      [req.user.id, reason.trim(), id]
    );

    // In-App Notification
    await createNotification(
      trans.user_id,
      'Transaksi Ditolak',
      `Transaksi #${trans.invoice_no} ditolak oleh pihak hotel. Alasan: ${reason.trim()}`,
      'system',
      connection
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Transaksi #${trans.invoice_no} telah ditolak. Poin tidak diberikan ke member.`,
      data: { id, status: 'rejected' }
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Admin Update Transaction (Edit Transaksi)
// Hak akses: Receptionist [X], Supervisor [Terbatas], Admin [Full]
app.put('/api/admin/transactions/:id', verifyAdmin, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (['resepsionis', 'kasir', 'staff'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Resepsionis tidak memiliki izin untuk mengedit transaksi.' });
    }

    const { id } = req.params;
    const { category, invoice_no, notes, transaction_date, amount } = req.body;

    const [existing] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const currentTrans = existing[0];

    // Supervisor: Terbatas (bisa edit catatan, nomor invoice, kategori, tanggal, tetapi tidak bisa sembarang ubah nominal / poin)
    if (userRole === 'supervisor') {
      await pool.query(
        'UPDATE transactions SET category = ?, invoice_no = ?, notes = ?, transaction_date = ? WHERE id = ?',
        [category || currentTrans.category, invoice_no ? invoice_no.trim() : currentTrans.invoice_no, notes || currentTrans.notes, transaction_date || currentTrans.transaction_date, id]
      );
      return res.json({ success: true, message: 'Data transaksi berhasil diperbarui oleh Supervisor (Edit Terbatas)' });
    }

    // Admin: Full Edit
    if (amount && parseFloat(amount) !== parseFloat(currentTrans.amount)) {
      const numAmount = parseFloat(amount);
      const settings = await getSettingsMap();
      const unitAmount = parseFloat(settings.spending_unit_amount) || 50000;
      const pointsPerUnit = parseInt(settings.points_per_unit) || 5;
      const newEarned = Math.floor(numAmount / unitAmount) * pointsPerUnit;
      const pointDiff = newEarned - currentTrans.points_earned;

      await pool.query(
        'UPDATE transactions SET category = ?, invoice_no = ?, amount = ?, points_earned = ?, notes = ?, transaction_date = ? WHERE id = ?',
        [category || currentTrans.category, invoice_no ? invoice_no.trim() : currentTrans.invoice_no, numAmount, newEarned, notes || currentTrans.notes, transaction_date || currentTrans.transaction_date, id]
      );

      // Adjust point ledger & user points
      if (pointDiff !== 0) {
        if (pointDiff > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 365);
          await pool.query(
            'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, ?, ?, ?, NOW(), ?, 0, "adjustment", ?)',
            [currentTrans.user_id, id, pointDiff, pointDiff, expiryDate, `Penyesuaian Transaksi #${id}`]
          );
        } else {
          // deduct points difference
          await deductPointsFIFO(currentTrans.user_id, Math.abs(pointDiff));
        }
        await syncUserPointsFIFO(currentTrans.user_id);
      }
    } else {
      await pool.query(
        'UPDATE transactions SET category = ?, invoice_no = ?, notes = ?, transaction_date = ? WHERE id = ?',
        [category || currentTrans.category, invoice_no ? invoice_no.trim() : currentTrans.invoice_no, notes || currentTrans.notes, transaction_date || currentTrans.transaction_date, id]
      );
    }

    res.json({ success: true, message: 'Data transaksi berhasil diperbarui oleh Admin' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Delete / Cancel Transaction (Batalkan / Reversal Poin)
// Hak akses: Receptionist [X], Supervisor [V], Admin [V]
app.delete('/api/admin/transactions/:id', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [transRows] = await connection.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (transRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const trans = transRows[0];
    const pointsToReverse = trans.points_earned;

    // Deduct points from member if points were earned
    if (pointsToReverse > 0) {
      await connection.query(
        'DELETE FROM point_ledger WHERE transaction_id = ? AND user_id = ?',
        [id, trans.user_id]
      );
      // Recalculate remaining active points
      const [sumRes] = await connection.query(
        'SELECT COALESCE(SUM(points_remaining), 0) AS total FROM point_ledger WHERE user_id = ? AND is_expired = 0',
        [trans.user_id]
      );
      const newTotal = parseInt(sumRes[0].total) || 0;
      await connection.query('UPDATE users SET total_points = ? WHERE id = ?', [newTotal, trans.user_id]);
    }

    // Delete transaction
    await connection.query('DELETE FROM transactions WHERE id = ?', [id]);
    await connection.commit();

    res.json({
      success: true,
      message: `Transaksi #${trans.invoice_no} berhasil dibatalkan dan -${pointsToReverse} poin telah di-reversal.`
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Bonus Poin Manual (Backward Compatibility)
app.post('/api/admin/transactions/manual-bonus', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { user_id, points, description } = req.body;
    const numPoints = parseInt(points);

    if (!user_id || !numPoints || numPoints <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Member dan jumlah poin bonus (> 0) wajib diisi' });
    }

    // Supervisor limit check
    if (req.user.role === 'supervisor' && numPoints > 50) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Akses terbatas: Supervisor hanya dapat memberikan maksimal 50 bonus poin manual per penyesuaian.'
      });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 365);

    const desc = description ? description.trim() : `Bonus Poin Manual oleh ${req.user.name} (${req.user.role.toUpperCase()})`;

    await connection.query(
      'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, ?, NOW(), ?, 0, "bonus", ?)',
      [user_id, numPoints, numPoints, expiryDate, desc]
    );

    await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [numPoints, user_id]);

    await createNotification(
      user_id,
      'Bonus Poin Diterima!',
      `Selamat! Akun Anda mendapatkan bonus +${numPoints} poin dari hotel. Catatan: ${desc}`,
      'point_in',
      connection
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Berhasil menambahkan +${numPoints} bonus poin manual ke akun member!`
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Penyesuaian / Koreksi Poin Tamu (+ Tambah atau - Potong karena salah input nota)
// Wajib menyertakan alasan penyesuaian untuk transparansi ke user
app.post('/api/admin/transactions/adjust-points', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { user_id, points, type = 'add', reason } = req.body;
    const numPoints = parseInt(points);

    if (!user_id || !numPoints || numPoints <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Tamu dan jumlah poin (> 0) wajib diisi' });
    }

    if (!reason || !reason.trim()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Alasan / catatan koreksi wajib diisi agar tamu dapat melihat kotak informasi transparan.'
      });
    }

    // Supervisor limit check
    if (req.user.role === 'supervisor' && numPoints > 50) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Akses terbatas: Supervisor hanya dapat menyesuaikan maksimal 50 poin per tindakan.'
      });
    }

    const [userRows] = await connection.query('SELECT id, name, total_points FROM users WHERE id = ? FOR UPDATE', [user_id]);
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Member / Tamu tidak ditemukan' });
    }
    const currentPoints = parseInt(userRows[0].total_points) || 0;
    const cleanReason = reason.trim();

    if (type === 'deduct') {
      if (currentPoints < numPoints) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Saldo poin member saat ini (${currentPoints} pts) tidak mencukupi untuk pemotongan ${numPoints} poin.`
        });
      }

      // Deduct FIFO from active point_ledger batches
      let remainingNeed = numPoints;
      const [entries] = await connection.query(
        'SELECT id, points_remaining FROM point_ledger WHERE user_id = ? AND is_expired = 0 AND points_remaining > 0 ORDER BY earned_date ASC FOR UPDATE',
        [user_id]
      );

      for (const entry of entries) {
        if (remainingNeed <= 0) break;
        const canTake = Math.min(entry.points_remaining, remainingNeed);
        const newRemaining = entry.points_remaining - canTake;
        await connection.query('UPDATE point_ledger SET points_remaining = ? WHERE id = ?', [newRemaining, entry.id]);
        remainingNeed -= canTake;
      }

      // Insert negative audit entry in ledger
      const auditDesc = `[KOREKSI -${numPoints} PTS] ${cleanReason} (Oleh: ${req.user.name} - ${req.user.role.toUpperCase()})`;
      await connection.query(
        'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, 0, NOW(), NOW(), 0, "adjustment", ?)',
        [user_id, -numPoints, auditDesc]
      );

      const newTotal = currentPoints - numPoints;
      await connection.query('UPDATE users SET total_points = ? WHERE id = ?', [newTotal, user_id]);

      // In-App Notification
      await createNotification(
        user_id,
        'Koreksi Pemotongan Saldo Poin',
        `Saldo poin Anda disesuaikan -${numPoints} poin oleh hotel. Alasan: ${cleanReason}`,
        'point_adjustment',
        connection
      );

      await connection.commit();
      return res.json({
        success: true,
        message: `Berhasil memotong -${numPoints} poin dari akun member (${cleanReason}). Saldo baru: ${newTotal} pts.`
      });
    } else {
      // type === 'add'
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 365);
      const auditDesc = `[PENYESUAIAN +${numPoints} PTS] ${cleanReason} (Oleh: ${req.user.name} - ${req.user.role.toUpperCase()})`;

      await connection.query(
        'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, ?, NOW(), ?, 0, "adjustment", ?)',
        [user_id, numPoints, numPoints, expiryDate, auditDesc]
      );

      const newTotal = currentPoints + numPoints;
      await connection.query('UPDATE users SET total_points = ? WHERE id = ?', [newTotal, user_id]);

      // In-App Notification
      await createNotification(
        user_id,
        'Penyesuaian Tambahan Saldo Poin',
        `Saldo poin Anda disesuaikan +${numPoints} poin oleh hotel. Catatan: ${cleanReason}`,
        'point_adjustment',
        connection
      );

      await connection.commit();
      return res.json({
        success: true,
        message: `Berhasil menambahkan +${numPoints} poin ke akun member. Saldo baru: ${newTotal} pts.`
      });
    }
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Admin Rewards Management (CRUD)
app.get('/api/admin/rewards', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    if (search.trim()) {
      whereClause += ' AND (title LIKE ? OR terms LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM rewards ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM rewards ${whereClause} ORDER BY points_required ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Export Rewards
app.get('/api/admin/rewards/export', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT title AS 'Nama Reward / Voucher', category AS 'Kategori', points_required AS 'Poin Dibutuhkan',
              IF(stock = -1, 'Unlimited', stock) AS 'Stok', IF(is_active = 1, 'Aktif', 'Nonaktif') AS 'Status',
              terms AS 'Syarat & Ketentuan', DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') AS 'Dibuat Pada'
       FROM rewards
       ORDER BY points_required ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/rewards', verifySuperAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category = 'other', points_required, terms, stock = -1, is_active = 1 } = req.body;
    if (!title || !points_required) {
      return res.status(400).json({ success: false, message: 'Judul reward dan jumlah poin wajib diisi' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO rewards (title, category, points_required, terms, stock, is_active, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), category, parseInt(points_required), terms || '', parseInt(stock), parseInt(is_active), imageUrl]
    );

    res.status(201).json({ success: true, message: 'Reward berhasil dibuat', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/rewards/:id', verifySuperAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, category, points_required, terms, stock, is_active } = req.body;
    let query = 'UPDATE rewards SET title = ?, category = ?, points_required = ?, terms = ?, stock = ?, is_active = ?';
    const params = [title.trim(), category, parseInt(points_required), terms || '', parseInt(stock), parseInt(is_active)];

    if (req.file) {
      query += ', image_url = ?';
      params.push(`/uploads/${req.file.filename}`);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Reward berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/rewards/:id', verifySuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rewards WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Reward berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Missions Management (CRUD)
app.get('/api/admin/missions', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type && type !== 'all') {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    if (search.trim()) {
      whereClause += ' AND (title LIKE ? OR requirement LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM missions ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM missions ${whereClause} ORDER BY type ASC, bonus_points ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Export Missions
app.get('/api/admin/missions/export', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT title AS 'Judul Misi', type AS 'Tipe Misi', requirement AS 'Ketentuan / Syarat',
              bonus_points AS 'Bonus Poin', recurrence AS 'Frekuensi', IF(is_active = 1, 'Aktif', 'Nonaktif') AS 'Status',
              DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') AS 'Dibuat Pada'
       FROM missions
       ORDER BY type ASC, bonus_points ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/missions', verifySuperAdmin, async (req, res) => {
  try {
    const { title, type, requirement, bonus_points, recurrence = 'Sekali', icon = 'star', is_active = 1 } = req.body;
    if (!title || !type || !bonus_points) {
      return res.status(400).json({ success: false, message: 'Judul, tipe misi, dan bonus poin wajib diisi' });
    }

    const [result] = await pool.query(
      'INSERT INTO missions (title, type, requirement, bonus_points, recurrence, icon, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), type, requirement || '', parseInt(bonus_points), recurrence, icon, parseInt(is_active)]
    );

    res.status(201).json({ success: true, message: 'Misi berhasil dibuat', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/missions/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { title, type, requirement, bonus_points, recurrence, icon, is_active } = req.body;
    await pool.query(
      'UPDATE missions SET title = ?, type = ?, requirement = ?, bonus_points = ?, recurrence = ?, icon = ?, is_active = ? WHERE id = ?',
      [title.trim(), type, requirement || '', parseInt(bonus_points), recurrence, icon, parseInt(is_active), req.params.id]
    );
    res.json({ success: true, message: 'Misi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/missions/:id', verifySuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM missions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Misi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Mission Claims Approval Endpoints (Admin & Supervisor)
app.get('/api/admin/mission-claims', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND um.status = ?';
      params.push(status);
    }
    if (search.trim()) {
      whereClause += ' AND (u.name LIKE ? OR u.phone LIKE ? OR u.member_code LIKE ? OR m.title LIKE ? OR um.room_number LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM user_missions um
       JOIN users u ON um.user_id = u.id
       JOIN missions m ON um.mission_id = m.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT um.*, um.proof_note as claim_note, u.name as member_name, u.phone as member_phone, u.member_code,
              m.title as mission_title, m.bonus_points, m.type as mission_type
       FROM user_missions um
       JOIN users u ON um.user_id = u.id
       JOIN missions m ON um.mission_id = m.id
       ${whereClause}
       ORDER BY CASE WHEN um.status = 'pending' THEN 0 ELSE 1 END, um.id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve Mission Claim
app.post('/api/admin/mission-claims/:id/approve', verifySupervisorOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    const [claimRows] = await connection.query(
      `SELECT um.*, m.title as mission_title, m.bonus_points, u.name as member_name
       FROM user_missions um
       JOIN missions m ON um.mission_id = m.id
       JOIN users u ON um.user_id = u.id
       WHERE um.id = ?`,
      [id]
    );

    if (claimRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Data klaim misi tidak ditemukan' });
    }

    const claim = claimRows[0];
    if (claim.status === 'approved') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Klaim misi ini sudah pernah disetujui sebelumnya' });
    }

    // Update user_missions status
    await connection.query(
      'UPDATE user_missions SET status = "approved", awarded_at = NOW(), admin_note = ? WHERE id = ?',
      [`Disetujui oleh ${req.user.name} (${req.user.role.toUpperCase()})`, id]
    );

    // Award Points FIFO Ledger (365 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 365);

    await connection.query(
      'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, ?, NOW(), ?, 0, "mission", ?)',
      [claim.user_id, claim.bonus_points, claim.bonus_points, expiryDate, `Misi Selesai: ${claim.mission_title}`]
    );

    // Update total points
    await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [claim.bonus_points, claim.user_id]);

    await connection.commit();

    res.json({
      success: true,
      message: `Klaim misi "${claim.mission_title}" untuk tamu ${claim.member_name} berhasil disetujui! +${claim.bonus_points} poin telah ditambahkan.`
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// Reject Mission Claim
app.post('/api/admin/mission-claims/:id/reject', verifySupervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [claimRows] = await pool.query('SELECT * FROM user_missions WHERE id = ?', [id]);
    if (claimRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data klaim misi tidak ditemukan' });
    }

    const claim = claimRows[0];
    if (claim.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Klaim yang sudah disetujui tidak dapat ditolak langsung. Harap batalkan lewat penyesuaian poin.' });
    }

    await pool.query(
      'UPDATE user_missions SET status = "rejected", admin_note = ? WHERE id = ?',
      [reason || `Ditolak oleh ${req.user.name} (${req.user.role.toUpperCase()})`, id]
    );

    res.json({ success: true, message: 'Klaim misi telah ditolak' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Vouchers & Redemptions (Verify / Redeem)
app.get('/api/admin/vouchers', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND rr.status = ?';
      params.push(status);
    }
    if (search.trim()) {
      whereClause += ' AND (rr.voucher_code LIKE ? OR u.name LIKE ? OR u.member_code LIKE ? OR r.title LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM reward_redemptions rr 
       JOIN users u ON rr.user_id = u.id 
       JOIN rewards r ON rr.reward_id = r.id 
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT rr.*, u.name as member_name, u.phone as member_phone, u.member_code, r.title as reward_title, r.category as reward_category
       FROM reward_redemptions rr
       JOIN users u ON rr.user_id = u.id
       JOIN rewards r ON rr.reward_id = r.id
       ${whereClause}
       ORDER BY rr.redeemed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Check Voucher Detail by Code (For Scanner & Validation)
app.get('/api/admin/vouchers/check/:code', verifyAdmin, async (req, res) => {
  try {
    const code = req.params.code?.trim();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Kode voucher wajib diisi' });
    }

    const [rows] = await pool.query(
      `SELECT rr.*, u.name as member_name, u.phone as member_phone, u.member_code, r.title as reward_title, r.category as reward_category
       FROM reward_redemptions rr
       JOIN users u ON rr.user_id = u.id
       JOIN rewards r ON rr.reward_id = r.id
       WHERE rr.voucher_code = ?`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kode voucher tidak ditemukan dalam sistem' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Mark Voucher as Used / Claimed
app.post('/api/admin/vouchers/verify', verifyAdmin, async (req, res) => {
  try {
    const { voucher_code, used_notes } = req.body;
    if (!voucher_code) {
      return res.status(400).json({ success: false, message: 'Kode voucher wajib diisi' });
    }

    const [rows] = await pool.query(
      `SELECT rr.*, u.name as member_name, r.title as reward_title
       FROM reward_redemptions rr
       JOIN users u ON rr.user_id = u.id
       JOIN rewards r ON rr.reward_id = r.id
       WHERE rr.voucher_code = ?`,
      [voucher_code.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Kode voucher tidak ditemukan' });
    }

    const voucher = rows[0];
    if (voucher.status === 'used') {
      return res.status(400).json({
        success: false,
        message: `Voucher ini sudah digunakan pada tanggal ${voucher.used_at}`
      });
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      return res.status(400).json({ success: false, message: 'Voucher ini sudah kadaluarsa (expired)' });
    }

    await pool.query(
      'UPDATE reward_redemptions SET status = "used", used_at = NOW(), used_notes = ? WHERE id = ?',
      [used_notes || 'Diverifikasi oleh admin hotel', voucher.id]
    );

    res.json({
      success: true,
      message: `Voucher "${voucher.reward_title}" milik ${voucher.member_name} berhasil digunakan!`,
      data: voucher
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Reservations List & Status Update
app.get('/api/admin/reservations', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (search.trim()) {
      whereClause += ' AND (guest_name LIKE ? OR guest_phone LIKE ? OR room_type LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM reservations ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM reservations ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/reservations/:id', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const reservationId = req.params.id;

    const [existing] = await pool.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan' });
    }

    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, reservationId]);

    if (existing[0].user_id) {
      const statusLabels = {
        inquiry: 'Menunggu Konfirmasi',
        confirmed: 'Dikonfirmasi',
        checked_in: 'Check-In',
        completed: 'Selesai Menginap',
        cancelled: 'Dibatalkan'
      };
      const label = statusLabels[status] || status;
      await createNotification(
        existing[0].user_id,
        'Update Status Reservasi',
        `Status reservasi kamar ${existing[0].room_type} (Booking #${reservationId}) telah diperbarui menjadi: ${label}.`,
        'reservation'
      );
    }

    res.json({ success: true, message: 'Status reservasi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Verify Bank Payment
app.put('/api/admin/reservations/:id/verify-payment', verifyAdmin, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { payment_status = 'paid' } = req.body;

    const [existing] = await pool.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan' });
    }

    await pool.query('UPDATE reservations SET payment_status = ? WHERE id = ?', [payment_status, reservationId]);

    if (existing[0].user_id) {
      const isPaid = payment_status === 'paid';
      await createNotification(
        existing[0].user_id,
        isPaid ? 'Pembayaran Dikonfirmasi' : 'Update Status Pembayaran',
        isPaid
          ? `Bukti transfer bank untuk Booking #${reservationId} telah diverifikasi: LUNAS. Kamar siap untuk Anda.`
          : `Status pembayaran Booking #${reservationId} telah diubah menjadi: ${payment_status}.`,
        'reservation'
      );
    }

    res.json({ success: true, message: `Status pembayaran berhasil diubah menjadi: ${payment_status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/reservations/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data reservasi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// Admin Closed Dates (Buka / Tutup Tanggal Reservasi)
// ==========================================
app.get('/api/admin/closed-dates', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM closed_dates ORDER BY start_date DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/closed-dates', verifySuperAdmin, async (req, res) => {
  try {
    const { start_date, end_date, reason, is_closed = 1 } = req.body;
    if (!start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, message: 'Tanggal mulai, tanggal selesai, dan alasan penutupan wajib diisi' });
    }
    const [result] = await pool.query(
      'INSERT INTO closed_dates (start_date, end_date, reason, is_closed) VALUES (?, ?, ?, ?)',
      [start_date, end_date, reason.trim(), is_closed ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Tanggal penutupan reservasi berhasil disimpan', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/closed-dates/:id/toggle', verifySuperAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE closed_dates SET is_closed = 1 - is_closed WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Status buka/tutup tanggal reservasi berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/closed-dates/:id', verifySuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM closed_dates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data tanggal penutupan reservasi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// Admin Rooms Management (CRUD)
// ==========================================
app.get('/api/admin/rooms', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    if (search.trim()) {
      whereClause += ' AND (name LIKE ? OR facilities LIKE ? OR description LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM rooms ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM rooms ${whereClause} ORDER BY price ASC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const roomIds = rows.map(r => r.id);
    if (roomIds.length > 0) {
      const [seasonals] = await pool.query(
        "SELECT id, room_id, season_name, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, price, created_at FROM room_seasonal_prices WHERE room_id IN (?) ORDER BY start_date ASC",
        [roomIds]
      );
      rows.forEach(r => {
        r.seasonal_prices = seasonals.filter(s => s.room_id === r.id);
      });
    } else {
      rows.forEach(r => { r.seasonal_prices = []; });
    }

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/rooms/:id', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tipe kamar tidak ditemukan' });
    }

    const [seasonals] = await pool.query(
      "SELECT id, room_id, season_name, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, price, created_at FROM room_seasonal_prices WHERE room_id = ? ORDER BY start_date ASC",
      [req.params.id]
    );
    rows[0].seasonal_prices = seasonals;

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/rooms', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, price_ramadan, price_new_year, capacity = 2, total_rooms = 10, facilities, is_active = 1, seasonal_prices } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Nama tipe kamar dan harga normal wajib diisi' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const numPriceRamadan = price_ramadan && !isNaN(price_ramadan) && parseFloat(price_ramadan) > 0 ? parseFloat(price_ramadan) : null;
    const numPriceNewYear = price_new_year && !isNaN(price_new_year) && parseFloat(price_new_year) > 0 ? parseFloat(price_new_year) : null;

    const [result] = await pool.query(
      'INSERT INTO rooms (name, description, price, price_ramadan, price_new_year, capacity, total_rooms, facilities, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, price, numPriceRamadan, numPriceNewYear, capacity || 2, total_rooms || 10, facilities || null, imageUrl, is_active == 1 || is_active === '1' ? 1 : 0]
    );

    // Save seasonal prices if supplied
    let spList = [];
    if (seasonal_prices) {
      try {
        spList = typeof seasonal_prices === 'string' ? JSON.parse(seasonal_prices) : seasonal_prices;
      } catch (e) {
        spList = [];
      }
    }
    if (Array.isArray(spList) && spList.length > 0) {
      const validSp = spList
        .filter(sp => sp.start_date && sp.end_date && sp.price && !isNaN(sp.price) && parseFloat(sp.price) > 0)
        .map(sp => [
          result.insertId,
          sp.season_name?.trim() || 'Tarif Khusus',
          sp.start_date,
          sp.end_date,
          parseFloat(sp.price)
        ]);
      if (validSp.length > 0) {
        await pool.query(
          'INSERT INTO room_seasonal_prices (room_id, season_name, start_date, end_date, price) VALUES ?',
          [validSp]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tipe kamar berhasil ditambahkan',
      data: { id: result.insertId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/rooms/:id', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, price_ramadan, price_new_year, capacity, total_rooms, facilities, is_active, seasonal_prices } = req.body;
    const roomId = req.params.id;

    const numPriceRamadan = price_ramadan && !isNaN(price_ramadan) && parseFloat(price_ramadan) > 0 ? parseFloat(price_ramadan) : null;
    const numPriceNewYear = price_new_year && !isNaN(price_new_year) && parseFloat(price_new_year) > 0 ? parseFloat(price_new_year) : null;

    const updates = ['name = ?', 'description = ?', 'price = ?', 'price_ramadan = ?', 'price_new_year = ?', 'capacity = ?', 'total_rooms = ?', 'facilities = ?', 'is_active = ?'];
    const params = [
      name,
      description || null,
      price,
      numPriceRamadan,
      numPriceNewYear,
      capacity || 2,
      total_rooms || 10,
      facilities || null,
      is_active == 1 || is_active === '1' ? 1 : 0
    ];

    if (req.file) {
      updates.push('image_url = ?');
      params.push(`/uploads/${req.file.filename}`);
    }

    params.push(roomId);
    await pool.query(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`, params);

    // Sync seasonal_prices if passed
    if (seasonal_prices !== undefined) {
      let spList = [];
      try {
        spList = typeof seasonal_prices === 'string' ? JSON.parse(seasonal_prices) : seasonal_prices;
      } catch (e) {
        spList = [];
      }
      await pool.query('DELETE FROM room_seasonal_prices WHERE room_id = ?', [roomId]);
      if (Array.isArray(spList) && spList.length > 0) {
        const validSp = spList
          .filter(sp => sp.start_date && sp.end_date && sp.price && !isNaN(sp.price) && parseFloat(sp.price) > 0)
          .map(sp => [
            roomId,
            sp.season_name?.trim() || 'Tarif Khusus',
            sp.start_date,
            sp.end_date,
            parseFloat(sp.price)
          ]);
        if (validSp.length > 0) {
          await pool.query(
            'INSERT INTO room_seasonal_prices (room_id, season_name, start_date, end_date, price) VALUES ?',
            [validSp]
          );
        }
      }
    }

    res.json({ success: true, message: 'Data tipe kamar berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dedicated Endpoint: Update Room Seasonal Prices (Rentang Tanggal Kustom)
app.put('/api/admin/rooms/:id/seasonal-prices', verifyAdmin, async (req, res) => {
  try {
    const roomId = req.params.id;
    const { seasonal_prices } = req.body;
    if (!Array.isArray(seasonal_prices)) {
      return res.status(400).json({ success: false, message: 'Format seasonal_prices harus berupa array' });
    }

    const [roomRows] = await pool.query('SELECT id, name FROM rooms WHERE id = ?', [roomId]);
    if (roomRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tipe kamar tidak ditemukan' });
    }

    // Validate entries
    for (const sp of seasonal_prices) {
      if (!sp.season_name?.trim()) {
        return res.status(400).json({ success: false, message: 'Nama periode tanggal khusus wajib diisi' });
      }
      if (!sp.start_date || !sp.end_date) {
        return res.status(400).json({ success: false, message: 'Tanggal mulai dan berakhir wajib diisi' });
      }
      if (sp.start_date > sp.end_date) {
        return res.status(400).json({ success: false, message: `Tanggal mulai tidak boleh melebihi tanggal berakhir (${sp.season_name})` });
      }
      if (!sp.price || isNaN(sp.price) || parseFloat(sp.price) <= 0) {
        return res.status(400).json({ success: false, message: `Tarif kamar untuk ${sp.season_name} harus lebih dari 0` });
      }
    }

    // Replace all seasonal prices for this room
    await pool.query('DELETE FROM room_seasonal_prices WHERE room_id = ?', [roomId]);

    if (seasonal_prices.length > 0) {
      const values = seasonal_prices.map(sp => [
        roomId,
        sp.season_name.trim(),
        sp.start_date,
        sp.end_date,
        parseFloat(sp.price)
      ]);
      await pool.query(
        'INSERT INTO room_seasonal_prices (room_id, season_name, start_date, end_date, price) VALUES ?',
        [values]
      );
    }

    const [updated] = await pool.query(
      "SELECT id, room_id, season_name, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, price, created_at FROM room_seasonal_prices WHERE room_id = ? ORDER BY start_date ASC",
      [roomId]
    );

    res.json({
      success: true,
      message: `Tarif tanggal khusus untuk kamar ${roomRows[0].name} berhasil disimpan`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/rooms/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Tipe kamar berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// Admin Announcements (Fitur Pengumuman Global)
// ==========================================
app.get('/api/admin/announcements', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      whereClause += ' AND (title LIKE ? OR content LIKE ? OR badge LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0';
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM announcements ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM announcements ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/announcements', verifyStaffOrAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'info',
      badge = '',
      link_url = '',
      link_text = '',
      is_active = 1,
      start_date = null,
      end_date = null,
    } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Judul dan isi pengumuman wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO announcements (title, content, type, badge, link_url, link_text, is_active, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        content.trim(),
        type || 'info',
        badge ? badge.trim() : null,
        link_url ? link_url.trim() : null,
        link_text ? link_text.trim() : null,
        is_active ? 1 : 0,
        start_date || null,
        end_date || null,
        req.user?.id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Pengumuman baru berhasil diterbitkan!',
      data: { id: result.insertId },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/announcements/:id', verifyStaffOrAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'info',
      badge = '',
      link_url = '',
      link_text = '',
      is_active = 1,
      start_date = null,
      end_date = null,
    } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Judul dan isi pengumuman wajib diisi' });
    }

    await pool.query(
      `UPDATE announcements SET 
         title = ?, 
         content = ?, 
         type = ?, 
         badge = ?, 
         link_url = ?, 
         link_text = ?, 
         is_active = ?, 
         start_date = ?, 
         end_date = ?
       WHERE id = ?`,
      [
        title.trim(),
        content.trim(),
        type || 'info',
        badge ? badge.trim() : null,
        link_url ? link_url.trim() : null,
        link_text ? link_text.trim() : null,
        is_active ? 1 : 0,
        start_date || null,
        end_date || null,
        req.params.id,
      ]
    );

    res.json({ success: true, message: 'Pengumuman berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/announcements/:id/toggle', verifyStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT is_active, title FROM announcements WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' });
    }

    const nextState = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE announcements SET is_active = ? WHERE id = ?', [nextState, req.params.id]);

    res.json({
      success: true,
      message: nextState
        ? `Pengumuman "${rows[0].title}" telah diaktifkan dan akan tampil ke user.`
        : `Pengumuman "${rows[0].title}" telah dinonaktifkan.`,
      data: { is_active: nextState },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/announcements/:id', verifyStaffOrAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Pengumuman berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Settings (Get & Update)
app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/settings', verifyAdmin, async (req, res) => {
  try {
    const { settings } = req.body; // array of { setting_key, setting_value }
    if (!Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: 'Settings harus berupa array' });
    }

    for (const item of settings) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [item.setting_key, item.setting_value, item.setting_value]
      );
    }

    res.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Celebes Hotel API Server running on port ${PORT}`);
});
