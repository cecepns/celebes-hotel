-- ==========================================================
-- CELEBES HOTEL (HCH) - DATABASE MIGRATION SCRIPT
-- Migration: 20261014_roles_and_revisions.sql
-- Tanggal  : 14 Oktober 2026
-- Deskripsi: 
--  1. Penambahan Role 'supervisor' & 'resepsionis' pada tabel users
--  2. Penambahan kolom 'birth_date' (Tanggal Lahir) pada tabel users
--  3. Pembuatan tabel 'closed_dates' untuk fitur Buka / Tutup Tanggal Reservasi (Blackout Dates)
--  4. Penambahan setting 'hch_member_discount_percent' pada tabel settings
--  5. Pembaruan kolom tabel 'user_missions' untuk approval klaim misi tamu (status pending, proof_note, room_number, admin_note, awarded_at)
--  6. Penambahan kolom diskon & total harga pada tabel 'reservations'
--  7. Penambahan kolom room_number & claim_note pada tabel 'reward_redemptions'
--  8. Seeding user default Supervisor & Resepsionis
--  9. Seeding contoh tanggal blackout (Malam Tahun Baru)
-- ==========================================================

-- ----------------------------------------------------------
-- 1. Tabel Users: Update Role & Tambah Kolom birth_date
-- ----------------------------------------------------------
ALTER TABLE users 
  MODIFY COLUMN role ENUM('admin', 'supervisor', 'resepsionis', 'kasir', 'staff', 'member') DEFAULT 'member';

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL AFTER email;

-- ----------------------------------------------------------
-- 2. Tabel Closed Dates: Manajemen Buka / Tutup Tanggal Reservasi
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS closed_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  is_closed TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_closed_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Tabel Settings: Pengaturan Diskon & Rekening Pembayaran Cashless
-- ----------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, description)
VALUES 
  ('hch_member_discount_percent', '10', 'Persentase diskon reservasi kamar via aplikasi HCH (%)'),
  ('payment_bank_name', 'Bank BCA', 'Nama Bank Rekening Resmi Pembayaran Cashless'),
  ('payment_bank_account', '123-456-7890', 'Nomor Rekening Pembayaran Cashless'),
  ('payment_account_name', 'Hotel Celebes Hasanuddin', 'Atas Nama Rekening Pembayaran Cashless')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ----------------------------------------------------------
-- 4. Tabel User Missions: Kolom Approval Klaim & Template Catatan
-- ----------------------------------------------------------
ALTER TABLE user_missions 
  MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS proof_note VARCHAR(255) NULL;

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS proof_file VARCHAR(255) NULL;

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) NULL;

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS admin_note VARCHAR(255) NULL;

ALTER TABLE user_missions 
  ADD COLUMN IF NOT EXISTS awarded_at DATETIME NULL;

-- ----------------------------------------------------------
-- 5. Tabel Reservations: Kolom Diskon & Sumber Reservasi
-- ----------------------------------------------------------
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0 AFTER num_guests;

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0 AFTER discount_percent;

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2) DEFAULT 0 AFTER discount_amount;

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'app_hch' AFTER total_price;

-- ----------------------------------------------------------
-- 6. Tabel Reward Redemptions: Kolom No. Kamar & Catatan Klaim
-- ----------------------------------------------------------
ALTER TABLE reward_redemptions 
  ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) NULL AFTER used_notes;

ALTER TABLE reward_redemptions 
  ADD COLUMN IF NOT EXISTS claim_note VARCHAR(255) NULL AFTER room_number;

-- ----------------------------------------------------------
-- 7. Seed Akun Default: Supervisor & Resepsionis (Password default: admin123)
-- ----------------------------------------------------------
INSERT INTO users (name, phone, email, password, role, member_code, total_points, created_at)
VALUES 
  ('Supervisor HCH', '081234567891', 'supervisor@celebeshotel.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'supervisor', 'HCH-SPV-01', 0, NOW()),
  ('Resepsionis Front Desk', '081234567892', 'reception@celebeshotel.com', '$2b$10$EPfWkJ143tN2FwO8KvZ20.Z7Q/6l10UHQzW9fXqB8h7iG0lT7g7e.', 'resepsionis', 'HCH-RCP-01', 0, NOW())
ON DUPLICATE KEY UPDATE 
  role = VALUES(role),
  name = VALUES(name);

-- ----------------------------------------------------------
-- 8. Seed Contoh Blackout Date (Malam Tahun Baru)
-- ----------------------------------------------------------
INSERT INTO closed_dates (start_date, end_date, reason, is_closed)
SELECT '2026-12-31', '2027-01-01', 'Malam Tahun Baru - Menunggu Rilis Harga Resmi Kamar', 1
WHERE NOT EXISTS (
  SELECT 1 FROM closed_dates WHERE start_date = '2026-12-31' AND end_date = '2027-01-01'
);

-- ==========================================================
-- SELESAI: Migration 20261014_roles_and_revisions.sql
-- ==========================================================
