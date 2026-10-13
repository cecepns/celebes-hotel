# Celebes Hotel - Loyalty & Rewards PWA

Sistem Manajemen Loyalty & Rewards Member Hotel Celebes Makassar berbasis Progressive Web App (PWA) dengan integrasi Express.js REST API dan MySQL.

## 🚀 Fitur Utama

### 📱 User / Member (PWA)
- **Dashboard & Kartu Member**: Tampilan kartu digital dengan QR Code nomor kartu member, status tier, dan saldo poin.
- **Katalog Reward**: Penukaran poin dengan reward/voucher (diskon menginap, free breakfast, amenities, merchandise).
- **Voucher Saya**: List voucher aktif & riwayat penukaran dengan QR Code unik per voucher untuk verifikasi saat check-in.
- **Reservasi Kamar**: Pemesanan kamar hotel (Superior, Deluxe, Suite, Executive).
- **Misi & Aktivitas**: Tantangan berkala untuk mendapatkan bonus poin loyalty.
- **Riwayat Poin (FIFO)**: Log perolehan dan penggunaan poin secara transparan.
- **PWA Ready**: Dapat di-install ke Home Screen di Android, iOS, maupun Desktop.

### 💼 Admin Panel
- **Dashboard Analytics**: Statistik total member, poin beredar, total transaksi, dan grafik aktivitas.
- **Member Management**: Pencarian realtime, filter tier, detail saldo poin, dan verifikasi akun.
- **User / Staff Management**: Kelola staf kasir dan administrator.
- **Manajemen Kamar**: Tambah, ubah tipe kamar, harga per malam, kapasitas, fasilitas, dan status ketersediaan.
- **Reward Management**: Tambah & edit reward, kuota stok, serta syarat poin penukaran.
- **Transaksi Poin**: Input transaksi menginap/F&B manual dan kalkulasi otomatis penambahan poin loyalty.
- **Validasi Voucher (Scan QR)**: Pemindai QR kamera langsung untuk verifikasi dan penggunaan voucher customer secara instan.
- **Ekspor Laporan Excel**: Ekspor data laporan langsung dari frontend tanpa membebani server.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Hot Toast, React Select, HTML5 QR Code Scanner, XLSX (client-side export).
- **Backend**: Node.js, Express.js, MySQL (mysql2/promise), JWT Authentication, Multer file upload, CORS.
- **Hosting / Deployment**: Vercel (Frontend) & VPS / Node Server (Backend).

---

## 📦 Setup & Instalasi Lokal

### 1. Database
1. Import file SQL yang ada di folder `sql/database.sql` ke MySQL database Anda.
2. Nama database default: `celebes_hotel_db`.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Sesuaikan konfigurasi database dan port di file .env
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Sesuaikan VITE_API_URL jika backend menggunakan URL lain
npm run dev
```

---

## ⚡ Deployment Frontend (Vercel)
Aplikasi frontend telah dilengkapi dengan `vercel.json` yang dikonfigurasi dengan:
- Single Page Application (SPA) rewrite ke `/index.html`.
- Strict anti-cache headers (`Cache-Control: no-cache, no-store, must-revalidate`) untuk file HTML, root, dan service worker agar setiap update langsung tampil ke pengguna tanpa perlu clear cache manual.
- Long-term immutable caching untuk asset statis (`/assets/*`) yang menggunakan content hashing dari Vite.
