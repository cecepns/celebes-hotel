-- ==========================================================
-- CELEBES HOTEL (HCH) - DATABASE MIGRATION SCRIPT
-- Migration: 20261016_seasonal_pricing_and_notifications.sql
-- Tanggal  : 16 Oktober 2026
-- Deskripsi:
--  1. Penambahan kolom harga musiman (price_ramadan, price_new_year) pada tabel rooms
--  2. Penambahan kolom bukti transfer & status pembayaran pada tabel reservations
--  3. Pembuatan tabel notifications untuk fitur In-App Notifikasi Tamu
--  4. Pendaftaran pengaturan default kalender Ramadhan, Malam Tahun Baru, dan Rekening Bank
-- ==========================================================

-- ----------------------------------------------------------
-- 1. Tabel Rooms: Tarif Musiman (Ramadhan & Malam Tahun Baru)
-- ----------------------------------------------------------
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS price_ramadan DECIMAL(15,2) NULL AFTER price;

ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS price_new_year DECIMAL(15,2) NULL AFTER price_ramadan;

-- ----------------------------------------------------------
-- 2. Tabel Reservations: Bukti Transfer & Status Pembayaran Cashless
-- ----------------------------------------------------------
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255) NULL AFTER source;

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid', 'pending_verification', 'paid') DEFAULT 'unpaid' AFTER payment_proof;

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at DATETIME NULL AFTER payment_status;

-- ----------------------------------------------------------
-- 3. Tabel Notifications: Notifikasi In-App Akun Tamu
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('point_in', 'point_out', 'point_adjustment', 'reservation', 'reward', 'system') DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_notif (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Tabel Settings: Jadwal Musiman & Rekening Resmi Pembayaran
-- ----------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, description)
VALUES 
  ('ramadan_start_date', '2027-02-18', 'Tanggal Mulai Periode Ramadhan (Puasa)'),
  ('ramadan_end_date', '2027-03-20', 'Tanggal Akhir Periode Ramadhan (Lebaran)'),
  ('new_year_date', '12-31', 'Tanggal Malam Tahun Baru (MM-DD)'),
  ('payment_bank_name', 'Bank BCA', 'Nama Bank Pembayaran Reservasi'),
  ('payment_bank_account', '123-456-7890', 'Nomor Rekening Bank Pembayaran'),
  ('payment_account_name', 'Hotel Celebes Hasanuddin', 'Nama Pemilik Rekening')
ON DUPLICATE KEY UPDATE description = VALUES(description);
