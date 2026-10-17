-- ==========================================================
-- Migration: Fitur Pengumuman (Announcements) & Rekening Bank Resmi
-- Date: 2026-10-17
-- Description:
-- 1. Pembuatan tabel 'announcements' untuk fitur pengumuman broadcast ke semua user.
-- 2. Update default rekening bank pembayaran resmi: Bank Mandiri 1520511027878 a/n JIMMY EDENTON.
-- ==========================================================

-- 1. Tabel Announcements
CREATE TABLE IF NOT EXISTS announcements (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Update Pengaturan Rekening Bank Resmi Mandiri (JIMMY EDENTON)
INSERT INTO settings (setting_key, setting_value, description) VALUES
('payment_bank_name', 'Bank Mandiri', 'Nama Bank Pembayaran Reservasi'),
('payment_bank_account', '1520511027878', 'Nomor Rekening Bank Pembayaran'),
('payment_account_name', 'JIMMY EDENTON', 'Nama Pemilik Rekening')
ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value);

-- 3. Data Pengumuman Awal (Sample / Welcome)
INSERT IGNORE INTO announcements (id, title, content, type, badge, link_url, link_text, is_active)
VALUES (
  1, 
  'Selamat Datang di Layanan Royalti Reward HCH', 
  'Dapatkan keuntungan diskon kamar khusus pengguna aplikasi, perolehan poin setiap menginap, serta penukaran berbagai voucher reward menarik di Hotel Celebes Hasanuddin Makassar.', 
  'promo', 
  'Info Penting', 
  '/reservation', 
  'Pesan Kamar Sekarang', 
  1
);
