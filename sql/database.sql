-- ==========================================================
-- CELEBES HOTEL - DATABASE SCHEMA & SEED DATA
-- Royalti Reward HCH (Hotel Celebes Hasanuddin)
-- ==========================================================

DROP TABLE IF EXISTS user_missions;
DROP TABLE IF EXISTS reward_redemptions;
DROP TABLE IF EXISTS point_ledger;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- ----------------------------------------------------------
-- 1. Tabel Users
-- ----------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(150) NULL UNIQUE,
  birth_date DATE NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'supervisor', 'resepsionis', 'kasir', 'staff', 'member') DEFAULT 'member',
  member_code VARCHAR(50) NOT NULL UNIQUE,
  avatar VARCHAR(255) NULL,
  total_points INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_member_code (member_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Tabel Settings
-- ----------------------------------------------------------
CREATE TABLE settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Tabel Rewards (Voucher Katalog)
-- ----------------------------------------------------------
CREATE TABLE rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category ENUM('drugstore', 'fnb', 'laundry', 'room', 'extra_bed', 'other') DEFAULT 'other',
  points_required INT NOT NULL,
  terms TEXT NOT NULL,
  stock INT DEFAULT -1, -- -1 = Unlimited
  is_active TINYINT(1) DEFAULT 1,
  image_url VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_points_required (points_required)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Tabel Missions (Daftar Misi)
-- ----------------------------------------------------------
CREATE TABLE missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM('CORE', 'MONTHLY', 'SEASONAL') NOT NULL,
  requirement TEXT NOT NULL,
  bonus_points INT NOT NULL,
  recurrence VARCHAR(100) NOT NULL DEFAULT 'Sekali',
  icon VARCHAR(100) DEFAULT 'star',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Tabel Transactions (Transaksi Belanja / Menginap)
-- ----------------------------------------------------------
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  invoice_no VARCHAR(60) NOT NULL,
  category ENUM('kamar', 'fnb', 'drugstore', 'laundry', 'lainnya') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_trans (user_id),
  INDEX idx_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Tabel Point Ledger (FIFO Point Tracking & Expired)
-- ----------------------------------------------------------
CREATE TABLE point_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_id INT NULL,
  points_earned INT NOT NULL,
  points_remaining INT NOT NULL,
  earned_date DATETIME NOT NULL,
  expiry_date DATETIME NOT NULL,
  is_expired TINYINT(1) DEFAULT 0,
  source_type ENUM('transaction', 'mission', 'bonus', 'adjustment') DEFAULT 'transaction',
  description VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_fifo (user_id, is_expired, points_remaining, expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Tabel Reward Redemptions (Klaim Voucher)
-- ----------------------------------------------------------
CREATE TABLE reward_redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  voucher_code VARCHAR(60) NOT NULL UNIQUE,
  points_used INT NOT NULL,
  status ENUM('pending', 'active', 'used', 'expired', 'cancelled') DEFAULT 'active',
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME NOT NULL,
  used_at DATETIME NULL,
  used_notes VARCHAR(255) NULL,
  room_number VARCHAR(50) NULL,
  claim_note VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
  INDEX idx_voucher_code (voucher_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Tabel User Missions (Misi Tamu)
-- ----------------------------------------------------------
CREATE TABLE user_missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mission_id INT NOT NULL,
  period_key VARCHAR(30) NOT NULL DEFAULT 'CORE', -- 'CORE' or 'YYYY-MM'
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  proof_note VARCHAR(255) NULL,
  proof_file VARCHAR(255) NULL,
  room_number VARCHAR(50) NULL,
  admin_note VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  awarded_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  INDEX idx_user_mission (user_id, mission_id, period_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. Tabel Rooms (Kelola Kamar Hotel)
-- ----------------------------------------------------------
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(15,2) NOT NULL,
  capacity INT DEFAULT 2,
  total_rooms INT DEFAULT 10,
  facilities VARCHAR(255) NULL,
  image_url VARCHAR(255) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rooms_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. Tabel Reservations
-- ----------------------------------------------------------
CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  guest_name VARCHAR(150) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  room_type VARCHAR(100) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_rooms INT DEFAULT 1,
  num_guests INT DEFAULT 2,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  source VARCHAR(50) DEFAULT 'app_hch',
  notes TEXT NULL,
  status ENUM('inquiry', 'confirmed', 'checked_in', 'completed', 'cancelled') DEFAULT 'inquiry',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. Tabel Closed Dates (Buka / Tutup Tanggal Reservasi)
-- ----------------------------------------------------------
CREATE TABLE closed_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  is_closed TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- SEED DATA
-- ==========================================================

-- Settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('points_per_unit', '5', 'Jumlah poin yang diperoleh per kelipatan nominal'),
('spending_unit_amount', '50000', 'Nominal transaksi per kelipatan poin (contoh Rp 50.000)'),
('point_expiry_days', '365', 'Masa aktif poin dalam hari (1 tahun = 365 hari)'),
('reservation_mode', 'whatsapp', 'Mode reservasi: whatsapp / system / disabled'),
('whatsapp_number', '6282189001285', 'Nomor WhatsApp resmi reservasi hotel'),
('hotel_name', 'Hotel Celebes Hasanuddin', 'Nama Hotel'),
('hotel_tagline', 'Royalti Reward HCH', 'Tagline Loyalty Program'),
('hotel_address', 'Jl. Sultan Hasanuddin No. 2 Makassar', 'Alamat Hotel'),
('hotel_phone', '+62411 3620770', 'Nomor Telepon Kantor'),
('instagram_username', 'celebeshtl', 'Akun Instagram'),
('hch_member_discount_percent', '10', 'Persentase diskon reservasi kamar via aplikasi HCH (%)');

-- Users (admin: admin / admin123, supervisor: supervisor / admin123, resepsionis: reception / admin123, member demo: rosdiana / 123456)
INSERT INTO users (id, name, phone, email, password, role, member_code, total_points, created_at) VALUES
(1, 'Administrator HCH', '081234567890', 'admin@celebeshotel.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'admin', 'HCH-ADMIN-01', 0, NOW()),
(2, 'Supervisor HCH', '081234567891', 'supervisor@celebeshotel.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'supervisor', 'HCH-SPV-01', 0, NOW()),
(3, 'Resepsionis Front Desk', '081234567892', 'reception@celebeshotel.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'resepsionis', 'HCH-RCP-01', 0, NOW()),
(4, 'Ibu Hj. Rosdiana', '081212127688', 'rosdiana@example.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'member', 'HCH-88219', 2026, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(5, 'Andi Pratama', '081299887766', 'andi@example.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'member', 'HCH-88220', 350, DATE_SUB(NOW(), INTERVAL 20 DAY));

-- Seed Rooms
INSERT INTO rooms (id, name, description, price, capacity, total_rooms, facilities, is_active) VALUES
(1, 'Deluxe Room', 'Kamar nyaman dengan fasilitas modern, double/twin bed, smart TV & city view.', 350000, 2, 15, 'AC, Smart TV, Wi-Fi, Hot Shower, City View', 1),
(2, 'Premier Room', 'Ruangan lebih luas, fasilitas premium, mini bar, dan akses early check-in.', 450000, 2, 10, 'AC, Smart TV, Wi-Fi, Mini Bar, Balcony', 1),
(3, 'Family Room', 'Cocok untuk liburan keluarga dengan 2 queen bed & ruang santai.', 650000, 4, 8, '2 Queen Beds, AC, Smart TV, Wi-Fi, Living Area', 1),
(4, 'Suite Room', 'Kamar suite elegan dengan living room terpisah, bathtub & sarapan gratis.', 850000, 2, 5, 'King Bed, Living Room, Bathtub, Free Breakfast', 1),
(5, 'VIP Room', 'Kamar termewah Hotel Celebes dengan fasilitas VIP eksklusif.', 1100000, 2, 3, 'Executive Lounge, King Bed, Jacuzzi, VIP Amenities', 1);

-- Seed 16 Rewards from Excel Sheet 2
INSERT INTO rewards (id, title, category, points_required, terms, stock, is_active) VALUES
(1, 'Discount Drugstore Senilai IDR. 5.000', 'drugstore', 30, 'Orderan Minimal Transaksi IDR. 45.000', -1, 1),
(2, 'Discount FNB senilai IDR 10.000', 'fnb', 60, 'Orderan Minimal Transaksi IDR. 100.000', -1, 1),
(3, 'Discount Laundry senilai IDR. 10.000', 'laundry', 90, 'Orderan Minimal Transaksi IDR 100.000', -1, 1),
(4, 'Late Check out + 1 jam', 'room', 125, 'Subject to availability', -1, 1),
(5, 'Discount Extra Bed 5 %', 'extra_bed', 150, 'Untuk 1 x penggunaan', -1, 1),
(6, 'Free Upgrade Room Deluxe to Premier', 'room', 185, 'Khusus untuk Kamar Deluxe ke Premier', -1, 1),
(7, 'Free Extra Bed (Bed only)', 'extra_bed', 200, 'Untuk 1 x penggunaan', -1, 1),
(8, 'Discount FNB 10 %', 'fnb', 225, 'Orderan Minimal Transaksi IDR. 125.000 / transaksi', -1, 1),
(9, 'Discount FNB 15%', 'fnb', 250, 'Orderan Minimal Transaksi IDR. 175.000 / transaksi', -1, 1),
(10, 'Discount room Extra 5 %', 'room', 275, 'Subject to availability, Not available for New Year Eve', -1, 1),
(11, 'Discount room Extra 10 %', 'room', 300, 'Subject to availability, Not available for New Year Eve', -1, 1),
(12, 'Free Late check out - max 2 jam', 'room', 350, 'Subject to availability', -1, 1),
(13, 'Free 1 nite Deluxe Room - Hotel Celebes', 'room', 400, 'Subject to availability, Not available for New Year Eve', -1, 1),
(14, 'Free 1 nite Premier Room - Hotel Celebes', 'room', 450, 'Subject to availability, Not available for New Year Eve', -1, 1),
(15, 'Free 1 nite Cemara Room - Wing A - Hotel Celebes Malino', 'room', 500, 'Open voucher 2 minggu; voucher complimentary tidak bisa pindah tangan 1 nite; voucher tidak bisa dipakai di momen lebaran dan tahun baru', -1, 1),
(16, 'Free 1 nite Deluxe Room - Wing B - Htl Celebes Malino', 'room', 555, 'Open voucher 2 minggu; voucher complimentary tidak bisa pindah tangan 1 nite; voucher tidak bisa dipakai di momen lebaran dan tahun baru', -1, 1);

-- Seed Missions from Excel Sheet 1
-- CORE
INSERT INTO missions (title, type, requirement, bonus_points, recurrence, icon, is_active) VALUES
('City View', 'CORE', 'Pemakaian kamar type Premier Room pertama kali, tidak berlaku redeem point', 5, 'Sekali', 'building', 1),
('Family Man', 'CORE', 'Pemakaian kamar type Family Room pertama kali, tidak berlaku redeem point', 5, 'Sekali', 'users', 1),
('Suite my Favorite', 'CORE', 'Pemakaian kamar Type Suite Room pertama kali, tidak berlaku redeem point', 5, 'Sekali', 'crown', 1),
('Good Reviewer', 'CORE', 'Memberikan kami penilaian bagus pada Google Review', 5, 'Sekali', 'star', 1),
('Very important Person', 'CORE', 'Pemakaian kamar VIP Room pertama kali, tidak berlaku redeem point', 5, 'Sekali', 'gem', 1),
('Sosialita', 'CORE', 'Follow instagram Hotel @celebeshtl', 5, 'Sekali', 'instagram', 1),
('First Timer', 'CORE', 'Baru pertama kali check in di Hotel Celebes', 8, 'Sekali', 'award', 1),
('HCH Regular Guest', 'CORE', 'Direct stay 2 days', 10, 'Sekali', 'calendar', 1),
('HCH Loyal Guest', 'CORE', 'Direct stay 4 days', 15, 'Sekali', 'heart', 1),
('HCH Super Guest', 'CORE', 'Direct Long stay 2 weeks', 20, 'Sekali', 'shield-check', 1),

-- MONTHLY
('Am Coming', 'MONTHLY', 'Direct Stay di bulan ini', 5, 'Refresh tiap bulan', 'map-pin', 1),
('Shop & earn', 'MONTHLY', 'Berbelanja di drugstore Hotel Min. IDR 50.000', 5, 'Refresh tiap bulan', 'shopping-bag', 1),
('Dine & earn', 'MONTHLY', 'Pemesanan F&B Min. IDR 50.000', 5, 'Refresh tiap bulan', 'utensils', 1),
('Clean & Fresh', 'MONTHLY', 'Laundry minimal transaksi IDR 50.000', 5, 'Refresh tiap bulan', 'sparkles', 1),
('Extra Comfort', 'MONTHLY', 'Menggunakan Extra Bed', 5, 'Refresh tiap bulan', 'bed', 1),
('Take a Nap', 'MONTHLY', 'Pemakaian Kamar di bawah 4 jam (short time)', 5, 'Refresh tiap bulan', 'clock', 1),
('Group Leader', 'MONTHLY', 'Pemesanan lebih dari 1 kamar dalam satu campaign', 10, 'Refresh tiap bulan', 'users-group', 1),
('Hi Again Sir', 'MONTHLY', 'Second stay dalam 1 bulan', 5, 'Refresh tiap bulan', 'repeat', 1),
('Hello Master', 'MONTHLY', 'Third stay dalam 1 bulan', 10, 'Refresh tiap bulan', 'trophy', 1),
('Hotel Explorer', 'MONTHLY', 'Dalam 1 bulan menggunakan 2 type kamar berbeda', 10, 'Refresh tiap bulan', 'compass', 1),
('All Around Dude', 'MONTHLY', 'Transaksi di 2 kategori selain kamar (F&B / Drugstore / Laundry)', 10, 'Refresh tiap bulan', 'layout-grid', 1),
('Long Stay', 'MONTHLY', 'Wajib menginap min 5 hari dalam satu campaign', 12, 'Refresh tiap bulan', 'coffee', 1),

-- SEASONAL
('New Year Eve', 'SEASONAL', 'Membeli Kamar type apa saja Untuk Malam Tahun baru', 20, 'Sesuai Periode', 'party-popper', 1),
('Ramadhan Stay', 'SEASONAL', 'Direct stay selama bulan Ramadhan', 10, 'Sesuai Periode', 'moon', 1),
('Anniversary', 'SEASONAL', 'Stay di Hotel Celebes saat ULANG TAHUN HOTEL 8 Agustus', 18, 'Sesuai Periode', 'cake', 1),
('Nasionalism', 'SEASONAL', 'Direct Stay pada tanggal 17 Agustus', 10, 'Sesuai Periode', 'flag', 1),
('Early Bird', 'SEASONAL', 'Melakukan booking kamar 14 hari sebelum Check in', 10, 'Refresh bulanan', 'send', 1),
('Enjoy the Food', 'SEASONAL', 'Menikmati Promo Bulanan FNB HCH', 8, 'Refresh bulanan', 'soup', 1);

-- Seed Sample Point Ledgers for Member 2 (Ibu Hj. Rosdiana, total 2026 pts, 226 expiring within 30 days)
-- Expiring soon: 226 points (earned ~340 days ago, expires in 25 days)
INSERT INTO point_ledger (user_id, transaction_id, points_earned, points_remaining, earned_date, expiry_date, is_expired, source_type, description) VALUES
(2, NULL, 226, 226, DATE_SUB(NOW(), INTERVAL 340 DAY), DATE_ADD(NOW(), INTERVAL 25 DAY), 0, 'transaction', 'Transaksi Menginap Premier Room (Tgl Lama)'),
(2, NULL, 500, 500, DATE_SUB(NOW(), INTERVAL 180 DAY), DATE_ADD(NOW(), INTERVAL 185 DAY), 0, 'transaction', 'Transaksi Menginap Suite Room (3 Hari)'),
(2, NULL, 800, 800, DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_ADD(NOW(), INTERVAL 275 DAY), 0, 'transaction', 'Family Gathering Celebes'),
(2, NULL, 500, 500, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 335 DAY), 0, 'transaction', 'Transaksi Kamar Deluxe Room'),
-- Missions:
(2, NULL, 5, 0, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 305 DAY), 0, 'mission', 'Misi: Sosialita - Follow Instagram'),
(2, NULL, 5, 0, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 305 DAY), 0, 'mission', 'Misi: Good Reviewer - Google Review');

-- Seed User Missions completed
INSERT INTO user_missions (user_id, mission_id, period_key, status, awarded_at) VALUES
(2, 4, 'CORE', 'approved', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(2, 6, 'CORE', 'approved', DATE_SUB(NOW(), INTERVAL 60 DAY));

-- Seed sample redeemed voucher for member 2
INSERT INTO reward_redemptions (user_id, reward_id, voucher_code, points_used, status, redeemed_at, valid_until) VALUES
(2, 2, 'HCH-VCH-789012', 60, 'active', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 28 DAY));
