-- ==========================================================
-- CELEBES HOTEL (HCH) - DATABASE MIGRATION SCRIPT
-- Migration: 20261016_room_seasonal_prices.sql
-- Tanggal  : 16 Oktober 2026
-- Deskripsi:
--  Pembuatan tabel room_seasonal_prices untuk mendukung tarif
--  kamar khusus berdasarkan rentang tanggal fleksibel
--  (misal: Bulan Ramadhan Feb - Mar 2027, Malam Tahun Baru, dll).
-- ==========================================================

CREATE TABLE IF NOT EXISTS room_seasonal_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  season_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_season (room_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample initial seasonal rates (Ramadhan Feb-Mar 2027 & Malam Tahun Baru)
INSERT INTO room_seasonal_prices (room_id, season_name, start_date, end_date, price)
SELECT id, 'Bulan Ramadhan', '2027-02-18', '2027-03-20', COALESCE(price_ramadan, price)
FROM rooms
WHERE NOT EXISTS (
  SELECT 1 FROM room_seasonal_prices WHERE season_name = 'Bulan Ramadhan'
);

INSERT INTO room_seasonal_prices (room_id, season_name, start_date, end_date, price)
SELECT id, 'Malam Tahun Baru', '2026-12-31', '2026-12-31', COALESCE(price_new_year, price)
FROM rooms
WHERE NOT EXISTS (
  SELECT 1 FROM room_seasonal_prices WHERE season_name = 'Malam Tahun Baru'
);
