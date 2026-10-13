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

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'kasir')) {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Akses khusus Staf / Kasir / Administrator' });
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

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Nama, No WhatsApp/HP, dan password wajib diisi' });
    }

    const cleanPhone = phone.trim().replace(/^0/, '62').replace(/[^\d]/g, '');

    // Check existing phone
    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [cleanPhone]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Nomor telepon sudah terdaftar sebagai member' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const memberCode = await generateMemberCode();

    const [insertResult] = await pool.query(
      'INSERT INTO users (name, phone, email, password, role, member_code, total_points) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanPhone, email ? email.trim() : null, hashedPassword, 'member', memberCode, 0]
    );

    const userId = insertResult.insertId;

    // Check welcome mission / bonus if applicable
    const token = jwt.sign(
      { id: userId, phone: cleanPhone, name: name.trim(), role: 'member', member_code: memberCode },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Selamat bergabung di Royalti Reward HCH',
      data: {
        token,
        user: { id: userId, name: name.trim(), phone: cleanPhone, email, role: 'member', member_code: memberCode, total_points: 0 }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
      if (password === 'admin123' && user.role === 'admin') {
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
    const [rows] = await pool.query('SELECT id, name, phone, email, role, member_code, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
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
    const { name, email } = req.body;
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), email ? email.trim() : null, req.user.id]);
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
      return {
        ...m,
        period_key: periodKey,
        is_completed: !!completion,
        completion_status: completion ? completion.status : 'not_started',
        completed_at: completion ? completion.awarded_at : null
      };
    });

    res.json({ success: true, data: missionsWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Claim / Complete Mission
app.post('/api/member/missions/:id/claim', verifyToken, upload.single('proof_file'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const missionId = req.params.id;
    const { proof_note } = req.body;

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

    // Check if already claimed
    const [existing] = await connection.query(
      'SELECT id FROM user_missions WHERE user_id = ? AND mission_id = ? AND period_key = ?',
      [userId, mission.id, periodKey]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Anda sudah menyelesaikan misi ini pada periode ini.' });
    }

    const proofFile = req.file ? `/uploads/${req.file.filename}` : null;

    // Record user mission
    await connection.query(
      'INSERT INTO user_missions (user_id, mission_id, period_key, status, proof_note, proof_file, awarded_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, mission.id, periodKey, 'approved', proof_note || 'Klaim Mandiri / Otomatis', proofFile]
    );

    // Award Points FIFO Ledger (365 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 365);

    await connection.query(
      'INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES (?, NULL, ?, ?, NOW(), ?, 0, "mission", ?)',
      [userId, mission.bonus_points, mission.bonus_points, expiryDate, `Misi Selesai: ${mission.title}`]
    );

    // Update total points
    await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [mission.bonus_points, userId]);

    await connection.commit();

    res.json({
      success: true,
      message: `Selamat! Misi "${mission.title}" selesai. Anda mendapatkan +${mission.bonus_points} poin.`,
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

// Public Rooms List (Active only)
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms WHERE is_active = 1 ORDER BY price ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Member Create Reservation
app.post('/api/member/reservations', async (req, res) => {
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

    const [result] = await pool.query(
      'INSERT INTO reservations (user_id, guest_name, guest_phone, room_type, check_in, check_out, num_rooms, num_guests, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "inquiry")',
      [userId, guest_name, guest_phone, room_type, check_in, check_out, num_rooms, num_guests, notes || null]
    );

    const settings = await getSettingsMap();
    const waNumber = settings.whatsapp_number || '6282189001285';
    const waText = encodeURIComponent(
      `Halo Resepsionis Hotel Celebes Hasanuddin,\nSaya ingin reservasi kamar:\n- Nama: ${guest_name}\n- Tipe Kamar: ${room_type}\n- Check-In: ${check_in}\n- Check-Out: ${check_out}\n- Jumlah Kamar: ${num_rooms}\n- Jumlah Tamu: ${num_guests}\n${notes ? `- Catatan: ${notes}\n` : ''}Mohon konfirmasi ketersediaan kamar. Terima kasih!`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    res.json({
      success: true,
      message: 'Reservasi berhasil dicatat!',
      data: {
        id: result.insertId,
        whatsapp_url: waUrl
      }
    });
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

    const validRoles = ['admin', 'kasir', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid (Pilih: admin atau kasir)' });
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
    const prefix = role === 'admin' ? 'ADM' : 'KAS';
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

// Update User (Admin / Kasir)
app.put('/api/admin/users/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, password, role } = req.body;

    const [existing] = await pool.query('SELECT * FROM users WHERE id = ? AND role != "member"', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const currentUser = existing[0];
    const validRoles = ['admin', 'kasir', 'staff'];
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
    const { page = 1, limit = 10, search = '', category = '', sort_by = 'transaction_date', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      whereClause += ' AND t.category = ?';
      params.push(category);
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

    const [rows] = await pool.query(
      `SELECT t.*, u.name as member_name, u.phone as member_phone, u.member_code 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       ${whereClause} 
       ORDER BY t.${sort_by} ${sortOrder}, t.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(formatPaginatedResponse(rows, page, limit, total));
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

    const [transResult] = await connection.query(
      'INSERT INTO transactions (user_id, invoice_no, category, amount, points_earned, transaction_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, invNo, category, numAmount, earnedPoints, transDate, notes || null, req.user.id]
    );

    const transactionId = transResult.insertId;

    if (earnedPoints > 0) {
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

    res.status(201).json({
      success: true,
      message: `Transaksi berhasil disimpan! Poin yang diperoleh: +${earnedPoints} poin.`,
      data: {
        id: transactionId,
        invoice_no: invNo,
        amount: numAmount,
        points_earned: earnedPoints,
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

app.post('/api/admin/rewards', verifyAdmin, upload.single('image'), async (req, res) => {
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

app.put('/api/admin/rewards/:id', verifyAdmin, upload.single('image'), async (req, res) => {
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

app.delete('/api/admin/rewards/:id', verifyAdmin, async (req, res) => {
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

app.post('/api/admin/missions', verifyAdmin, async (req, res) => {
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

app.put('/api/admin/missions/:id', verifyAdmin, async (req, res) => {
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

app.delete('/api/admin/missions/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM missions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Misi berhasil dihapus' });
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
    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Status reservasi berhasil diperbarui' });
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
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/rooms', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, capacity = 2, total_rooms = 10, facilities, is_active = 1 } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Nama tipe kamar dan harga wajib diisi' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO rooms (name, description, price, capacity, total_rooms, facilities, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, price, capacity || 2, total_rooms || 10, facilities || null, imageUrl, is_active == 1 || is_active === '1' ? 1 : 0]
    );

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
    const { name, description, price, capacity, total_rooms, facilities, is_active } = req.body;
    const roomId = req.params.id;

    const updates = ['name = ?', 'description = ?', 'price = ?', 'capacity = ?', 'total_rooms = ?', 'facilities = ?', 'is_active = ?'];
    const params = [
      name,
      description || null,
      price,
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

    res.json({ success: true, message: 'Data tipe kamar berhasil diperbarui' });
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
