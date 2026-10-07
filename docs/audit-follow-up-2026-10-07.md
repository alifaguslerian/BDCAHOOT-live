# Tindak lanjut empat laporan pengujian, 7 Oktober 2026

## Batas pekerjaan

HTTP, autentikasi, kebijakan join, dan kontrol keamanan tetap sesuai permintaan
pemilik. Tidak ada commit, push, atau perubahan branch. Database acara tidak dipakai
oleh pengujian. Perubahan layout teks panjang yang sudah ada tetap dipertahankan.

## Perubahan aplikasi

- ACK jawaban yang sudah durable tidak lagi menunggu penulisan perubahan yang lebih
  baru. Tes dengan dua commit yang ditahan secara terpisah gagal sebelum perbaikan
  dan lulus sesudahnya. Jawaban kedua tidak dikonfirmasi sebelum commit-nya sendiri;
  broadcast tetap menunggu seluruh state durable. Aktivasi clock tidak boleh memakai
  commit lama untuk mengaktifkan state soal/countdown yang belum tersimpan.
- Counter diagnostik berukuran tetap memisahkan biaya validasi jawaban, menunggu
  commit, pembuatan snapshot, penyimpanan, dan satu putaran broadcast. Tidak ada
  endpoint diagnostik publik, payload pemain tambahan, atau array riwayat metrik
  yang tumbuh di server aplikasi. Waktu penyimpanan mencakup worker dan penjadwalan
  callback, bukan waktu disk fisik murni. Putaran broadcast termasuk putaran idle.
- Teks pilihan host dan pemain memakai foreground gelap pada empat kartu terang.
  Pilihan yang sudah nonaktif tetap terbaca; perbedaan pilihan ditunjukkan melalui
  saturasi, ring, dan tanda pilihan. Overlay distribusi host tidak lagi menggelapkan
  latar di belakang teks gelap.
- Area status jawaban memiliki ruang minimum tetap; konfirmasi normal tidak lagi
  mendorong area tombol. Tinggi minimum layar pertanyaan memperhitungkan bar keluar
  room. Pesan error panjang tetap boleh memperbesar area agar tidak terpotong.

## Verifikasi UI dan pemulihan

Production build, pemeriksaan TypeScript, lint, dan 58/58 tes regresi lulus. Tes browser
layout memakai Chrome, 1366x768 dan 390x844, dengan database sementara:

- Posisi atas area jawaban sama sebelum/sesudah konfirmasi (316,5 px desktop,
  302 px mobile), tanpa horizontal overflow.
- Kontras teks pilihan aktif: merah 4,71:1; biru 4,82:1; kuning 8,26:1;
  hijau 6,99:1. Ini pemeriksaan kartu pilihan, bukan sertifikasi seluruh aplikasi.
- Kontras kartu host juga diperiksa di browser: terendah 4,72:1.
- Penjumlahan layout-shift tanpa recent input saat reload soal berada di bawah
  0,0003 pada kedua ukuran dalam pengulangan lokal. Ini bukan pengulangan Lighthouse dengan kondisi identik,
  bukan perhitungan CLS session-window seluruh pertandingan.
- Nilai CLS desktop 0,955 dari PDF tidak berhasil direproduksi. Jangan menandainya
  sudah diperbaiki; dibutuhkan trace beserta elemen penyebab pada kondisi asal.
- Tes recovery Chrome lulus: refresh countdown host menjaga sisa waktu; refresh
  soal menjaga deadline; refresh pemain menjaga jawaban; offline/reconnect menjaga
  identitas; delay asimetris/jitter; jawaban tiba deadline +400 ms ditolak.

Artefak lokal (folder reports diabaikan Git):

- `reports/player-layout-before.json`, `reports/player-layout-after.json`
- `reports/layout-390.png`, `reports/layout-1366.png`
- `reports/audit-browser-network.json`

## Hasil percobaan yang tidak lulus

1. `reports/fleet-80x40-20261007.json`: 80 browser penuh, satu laptop dengan total
   RAM sekitar 12 GB, gagal sebelum soal pertama karena ping timeout. Event loop
   tertunda sampai sekitar 9,1 detik. Tekanan resource pembangkit beban menjadi
   dugaan, belum terbukti sebagai satu-satunya penyebab. Ini bukan hasil lulus.
2. `reports/mixed-80x40-20261007.json` dan `.browser.json`: 70 bot + 10 browser
   menyelesaikan 40 soal; 2.800 ACK bot dan 400 ACK browser tercatat, tanpa error
   JavaScript/HTTP. Tetapi 10 WebSocket browser sempat ditutup lalu reconnect,
   sehingga assertion tanpa disconnect gagal. Pemeriksaan skor browser dan cleanup
   pada harness tidak diselesaikan karena kegagalan tersebut. Angka acceptedAnswers
   di laporan induk hanya 2.800 karena laporan browser gagal tidak digabungkan;
   counter server mencatat 3.200. Jangan mengubah status percobaan ini menjadi lulus.

Pengulangan berikutnya menambahkan waktu/alasan penutupan socket di server dan
informasi heartbeat/fase browser untuk menelusuri gangguan, tanpa memperlonggar
assertion atau mengubah heartbeat aplikasi.

## Pengulangan akhir: lulus pada cakupan campuran

`reports/mixed-80x40-20261007-r2.json` dan `.browser.json`:

| Pengukuran | Hasil |
| --- | --- |
| Peserta | 70 bot Socket.IO + 10 browser penuh, ditambah UI Host |
| Durasi total | 502,67 detik (sekitar 8 menit 23 detik) |
| Soal / jawaban terkonfirmasi | 40 / 3.200 |
| Skor akhir | Seluruh pemain diperiksa terhadap rumus dan riwayat jawaban |
| Disconnect saat pertandingan | 0 pada klien bot maupun browser |
| Error JavaScript / HTTP browser | 0 / 0 |
| ACK bot p95 / maksimum | 126,26 / 415,34 ms |
| ACK browser teramati p95 / maksimum | 230,93 / 385,55 ms |
| Klik sampai konfirmasi UI p95 | 373,08 ms, termasuk alat otomasi |
| Selisih penerimaan soal maksimum, 10 browser | 45,08 ms |
| CPU server rata-rata saat game | 4,07% dari satu core |
| RSS server puncak saat game | 330,40 MiB |
| RSS / heap sesudah cleanup | 237,90 / 59,64 MiB |
| Room / socket sesudah cleanup | 0 / 0 |

Seluruh penutupan socket yang dicatat server pada pengulangan ini terjadi di akhir
sesi, ketika browser/harness ditutup. Gangguan pada percobaan sebelumnya tidak
terulang; penyebabnya belum dapat dipastikan atau diklaim sudah diperbaiki. Tidak
ada perubahan aplikasi di antara kedua percobaan campuran, hanya tambahan logging
pada alat uji.

Counter server mencatat rata-rata pemrosesan jawaban sekitar 0,016 ms dan menunggu
commit sekitar 60,76 ms. Snapshot maksimum sekitar 1,10 MB; pembuatan snapshot
maksimum 62,78 ms, waktu save maksimum 286,07 ms. Ini membantu memisahkan pekerjaan
server dari delay yang diamati klien; bukan bukti sumber seluruh latency Wi-Fi.
RAM sistem tersedia sempat hanya sekitar 660 MiB selama pengujian, sehingga server
dan pembangkit beban pada laptop yang sama tetap memiliki keterbatasan resource.
Tidak ada klaim bebas memory leak dari satu sesi atau kapasitas 80 HP fisik.

## Menjalankan ulang

Lihat README untuk dependensi Python/Playwright dan mode pengujian. Gunakan database
uji baru dan production build terbaru. Mode fleet memakai konteks browser terpisah;
viewport mobile tidak meniru CPU/GPU HP, gangguan radio, atau background suspension.
ACK browser yang diamati melalui CDP juga dipengaruhi penjadwalan alat penguji.
Hasil loopback tidak dapat langsung dibandingkan sebagai persentase peningkatan
terhadap pengukuran Wi-Fi laptop teman.
