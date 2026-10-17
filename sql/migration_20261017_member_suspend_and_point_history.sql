-- ==========================================================
-- Migration: Member Suspend & Record Penyesuaian / Riwayat Pemakaian Poin
-- Date: 2026-10-17
-- Description:
-- 1. Penambahan kolom 'status' & 'suspend_reason' pada tabel users (Fitur Suspend Akun).
-- 2. Perluasan enum category pada tabel 'transactions' agar mendukung 'koreksi'.
-- 3. Perluasan enum source_type pada tabel 'point_ledger' agar mendukung 'redemption'.
-- ==========================================================

-- 1. Tambah status suspend pada tabel users
ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active' AFTER role;
ALTER TABLE users ADD COLUMN suspend_reason VARCHAR(255) NULL AFTER status;

-- 2. Perluasan category transactions untuk mencatat koreksi poin (+ / -)
ALTER TABLE transactions MODIFY COLUMN category ENUM('kamar', 'fnb', 'drugstore', 'laundry', 'lainnya', 'koreksi') NOT NULL DEFAULT 'kamar';

-- 3. Perluasan source_type point_ledger untuk mencatat pemakaian reward voucher
ALTER TABLE point_ledger MODIFY COLUMN source_type ENUM('transaction', 'mission', 'bonus', 'adjustment', 'redemption') DEFAULT 'transaction';
