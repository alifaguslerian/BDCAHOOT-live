# Panduan operator BDCAHOOT Live

Gunakan bersama [checklist rehearsal](REHEARSAL.md). Panduan ini disusun dari kode
startup, penyimpanan, dan alur aplikasi; bukan catatan bahwa rehearsal lapangan sudah lulus.

## Sebelum hari acara

1. Siapkan laptop Host, charger, router/access point, dan kuis final. Bila tersedia,
   hubungkan laptop ke router melalui Ethernet. Semua HP harus dapat mengakses laptop.
2. Gunakan jaringan privat tepercaya. Pastikan guest/client isolation tidak menghalangi
   koneksi HP ke laptop. Izinkan aplikasi/port pada firewall jaringan privat;
   jangan mematikan seluruh firewall atau membuka port ke Internet.
3. Gunakan profil browser Host dan URL yang tetap. Kuis editor tersimpan per origin
   di localStorage; sesi pertandingan tersimpan di sessionStorage tab. Hindari mode privat.
4. Instal dan build saat Internet tersedia, dari folder proyek:

   ```powershell
   node --version
   npm ci
   npm test
   npm run typecheck
   npm run lint
   $env:NODE_ENV = 'production'
   npm run build
   ```

   Jalankan satu per satu dan hentikan jika ada yang gagal. Versi Node yang didukung
   tercantum di README. Jangan upgrade Node/dependensi sesaat sebelum acara.
5. Sediakan ruang disk lokal untuk database dan backup. Hindari folder cloud-sync,
   network drive, dan penyimpanan di `public/`. Sambungkan charger, cegah laptop sleep,
   dan jadwalkan pembaruan/restart otomatis di luar sesi.

## Menyalakan pada hari acara

Dari PowerShell di folder proyek, gunakan build yang sudah diverifikasi:

```powershell
$env:NODE_ENV = 'production'
$env:PORT = '3000'
npm start
```

Terminal harus menampilkan URL lokal, URL LAN, kode operator, lokasi database, dan
jumlah room yang dipulihkan. Jangan bagikan foto terminal yang memperlihatkan kode operator.
Biarkan terminal tetap terbuka. Satu proses server memakai satu database.

- Host membuka `http://localhost:3000` pada laptop server, memakai profil/tab yang sama.
- Pemain membuka `http://ALAMAT-LAN-LAPTOP:3000/player/join`. Ganti placeholder dengan
  alamat adaptor yang benar dari terminal; alamat VPN/adaptor virtual mungkin tidak tepat.
- Pemain memasukkan kode room, bukan kode operator. `localhost` pada HP menunjuk HP itu sendiri.
- Pertahankan IP/port selama pertandingan. Bila jaringan mendukung, tetapkan reservasi
  DHCP laptop sebelum rehearsal; perubahan alamat mengubah origin penyimpanan browser pemain.
- Bila `.env.local` dipakai, simpan rahasia di sana dan jangan bagikan. Hindari
  `NODE_ENV=development` saat acara. Variabel PowerShell di atas hanya berlaku pada terminal itu.

Uji dengan satu HP terlebih dahulu. Setelah akses LAN berhasil, buka kuis, periksa
soal/kunci/timer, lalu buat room. Tunggu peserta masuk sebelum menekan Mulai Game.
Angka peserta Host menunjukkan pendaftaran, bukan jaminan semua HP sedang online.

## Saat pertandingan

1. Pastikan Host dan pemain melihat room yang benar. Jangan menutup tab pemain.
2. Host mulai permainan. Setiap soal: jawab, tunggu pembahasan, periksa scoreboard,
   lalu Host melanjutkan. Setelah soal terakhir tampilkan podium.
3. Pantau keluhan pemain dan terminal. Jika banyak HP bermasalah, tahan di scoreboard
   sebelum membuka soal berikutnya. Tidak ada jaminan tombol pause untuk soal aktif.
4. Jangan menjalankan build, benchmark, instalasi, atau salinan database aktif bersamaan
   dengan pertandingan. Jangan mengubah konfigurasi router ketika soal berlangsung.
5. Catat pemenang/hasil yang dibutuhkan sebelum menutup atau mereset room. Menutup room
   menghapusnya dari snapshot pertandingan; database ini bukan arsip historis semua game.

## Jika terjadi gangguan

| Gejala | Tindakan operator |
| --- | --- |
| HP tidak bisa membuka halaman | Cocokkan URL LAN/port, Wi-Fi, adaptor laptop, firewall privat, dan client isolation. Uji HP kedua. Jangan memakai localhost di HP. |
| Satu pemain putus | Kembali ke Wi-Fi dan tab/origin yang sama. Tunggu reconnect; jika perlu refresh tab yang sama. Jangan hapus site data. Periksa identitas, soal dan status jawaban setelah pulih. |
| Status jawaban belum jelas | Tunggu pemulihan receipt dari server. Tampilan optimistis/klik belum membuktikan jawaban tersimpan. Retry tidak memberi poin kedua. |
| Server berhenti | Jalankan kembali dari folder proyek dengan database dan port yang sama. Pertahankan tab browser. Periksa room, peserta, skor dan tahap sebelum melanjutkan. |
| Server restart saat soal aktif | Soal itu pulih ke scoreboard, tidak diulang. Jawaban tersimpan dihitung; yang belum menjawab tidak mendapat poin. Host melanjutkan soal berikutnya setelah pemeriksaan. |
| Error penyimpanan/timeout commit | Hentikan kelanjutan game, periksa disk dan izin folder. Jangan hapus database. Commit terlambat mungkin sudah tersimpan; cocokkan status setelah restart. |
| Shutdown macet | Pastikan masalah disk diperiksa. Jika terpaksa hentikan hanya proses server yang tepat; pemulihan perlu diperiksa ulang. Jangan membunuh seluruh proses Node secara massal. |
| Database rusak/versi tidak didukung | Simpan salinan berkas asli dan sidecar untuk diagnosis saat proses berhenti. Jangan menggantinya dengan database kosong. Restore backup hanya dengan menerima kehilangan perubahan setelah backup. |
| Port sudah dipakai/database terkunci | Periksa apakah server yang sama masih berjalan. Gunakan instance yang benar atau hentikan instance lama secara normal; jangan menjalankan dua server pada database yang sama. |

Room kedaluwarsa setelah enam jam tanpa aktivitas terautentikasi. Pemain terakhir dapat
pulih di tab baru melalui cadangan token localStorage pada browser/profil/origin yang sama.
Host tetap memerlukan tab asal. Jika seluruh site data hilang, token tidak dapat dibuat
kembali hanya dari kode room. Pada perangkat bersama, keluar dari game secara eksplisit;
tab baru dapat melanjutkan pemain terakhir. Jangan menyamakan cadangan satu pemain ini
dengan penyimpanan banyak identitas untuk satu profil browser.

## Backup dan restore

### Pertandingan

1. Catat path database dari terminal. Setelah permainan, tekan Ctrl+C dan tunggu
   proses selesai serta prompt terminal kembali. Jika error/shutdown tidak selesai,
   jangan anggap database sudah ditutup normal.
2. Setelah shutdown normal, salin database ke folder backup privat di luar repo
   dengan nama/tanggal yang jelas. Jangan salin database saat server masih menulis.
3. Bila proses crash dan ada `-journal`, `-wal`, atau `-shm`, jangan hapus sidecar.
   Simpan satu set berkas saat proses berhenti; minta pemeriksaan sebelum restore.
4. Restore hanya saat server berhenti: simpan dulu database sekarang, pulihkan backup
   yang dipilih ke path yang benar, kemudian start. Cocokkan skor/tahap dengan waktu backup.
   Token dan origin browser harus sesuai snapshot; backup lama dapat kehilangan pemain baru.

Database mengandung token dan kunci jawaban tanpa enkripsi. Batasi akses backup pada
operator, jangan commit/push/unggah publik. Backup pertandingan tidak mencakup library editor.

### Koleksi kuis editor

Sebelum acara, pada halaman Host dengan origin/profil yang benar, buka DevTools →
Application (atau Storage) → Local Storage. Salin nilai lengkap key
`bdcahoot_quiz_library_v1` ke berkas JSON privat. Simpan juga naskah soal/kunci sumber.
Jangan menyalin seluruh browser storage karena dapat berisi rahasia sesi.

Untuk restore library, backup nilai saat ini lebih dulu, lalu ganti nilai key tersebut
dengan JSON backup yang utuh dan reload halaman. Periksa judul, jumlah soal, pilihan,
kunci, dan timer. Lakukan sebelum membuat room, bukan saat pertandingan berjalan.
Ini prosedur manual DevTools; bukan tombol ekspor/impor yang sudah tersedia di aplikasi.

## Selesai acara

Catat hasil, tutup server normal, backup bila diperlukan, dan simpan catatan gangguan
tanpa token/kode operator. Perubahan kode atau perangkat setelah rehearsal memerlukan
pengujian ulang bagian yang terpengaruh sebelum acara berikutnya.
