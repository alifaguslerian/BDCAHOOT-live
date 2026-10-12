# Audit alur podium, 11 Oktober 2026

Lingkup: perubahan setelah soal terakhir, dari preview jawaban ke layar tunggu
hingga operator membuka podium. Audit mencakup jalur aksi host, pemulihan sesi,
skor, otorisasi, dan timer komponen yang dilepas saat transisi.

## Bug yang ditemukan dan diperbaiki

**P2: pesan kegagalan palsu setelah podium berhasil dibuka.** Jika perintah
`finish` diterima server dan broadcast `FINAL` sampai ke host, tetapi ACK perintah
hilang, `GameContext.command()` tetap mengembalikan `false` dan menampilkan
“Konfirmasi belum diterima” setelah enam detik. Ini perilaku jalur aksi host yang
sudah ada sebelum tombol dipindahkan.

Tes baru `podium: lost finish ACK...` gagal sebelum perbaikan (`false !== true`).
Perbaikan di `context/GameContext.tsx` mengakui keberhasilan hanya untuk timeout
`finish` jika token sesi masih sama, snapshot berasal dari room yang sama,
revisinya lebih baru, dan stage sudah `FINAL`. Tanpa bukti tersebut, kegagalan
tetap ditampilkan dan tombol dapat dicoba lagi. Penolakan eksplisit server tidak
diubah menjadi sukses.

## Pemeriksaan kode

- `PodiumReadyView` tidak menambahkan interval, timeout, subscription, koneksi,
  atau penyimpanan. Tidak ada sorting peringkat pada layar tunggu.
- Timer animasi scoreboard dan podium memiliki cleanup saat komponen dilepas.
  Ini pemeriksaan kode, bukan bukti bahwa seluruh aplikasi bebas memory leak.
- Host dan pemain menggunakan snapshot server yang sama untuk menentukan soal
  terakhir. Refresh tidak bergantung pada flag lokal baru.
- Server tetap memvalidasi role host dan revision untuk perintah `finish`.
- Skor dan urutan pemenang tidak dihitung ulang oleh layar tunggu.

## Batasan informasi peringkat

**Rendah, perilaku lama:** scoreboard disembunyikan secara visual, tetapi
`GameEngine.view()` masih mengirim `players` dan `rankings` setelah REVEAL,
termasuk saat menunggu podium terakhir. Peserta yang memeriksa paket melalui
DevTools dapat membaca hasil lebih awal. Ini berpotensi membocorkan kejutan
pengumuman; bukan izin mengubah skor atau menjalankan perintah host.

Tidak ada perubahan kebijakan keamanan atau HTTP pada audit ini, sesuai arahan
pemilik proyek. Kerahasiaan hasil sampai pengumuman memerlukan perubahan payload
server tersendiri.

## Hasil pengujian otomatis

- `npm run test`: **63/63 lulus**, termasuk lima tes baru untuk podium.
- Kasus baru: ACK finish hilang; 25 pemanggilan serentak hanya mengirim satu
  perintah; perintah hilang lalu retry; pemulihan snapshot REVEAL terakhir;
  pemulihan snapshot SCOREBOARD terakhir.
- Tes pemulihan juga memeriksa skor tetap sama ketika semua pemain keluar,
  menunggu 60 detik tanpa otomatis membuka podium, penolakan perintah pemain,
  dan penolakan perintah host duplikat dengan revision lama.
- Suite yang sama menjalankan **100 Socket.io client × 40 soal / 4.000 jawaban**
  dengan jam dipercepat di localhost. Bukan uji 100 HP atau Wi-Fi event.
- `npm run build`, `npm run typecheck`, dan `npm run lint`: lulus. Build masih
  mencatat peringatan deprecation Node `module.register()`, tanpa kegagalan build.
- Pesan kegagalan penyimpanan di output suite berasal dari tes fault injection
  yang memang sengaja menggagalkan storage, dan kedua tes tersebut lulus.

## Tes Chrome pada build produksi

Command: `python scripts/check-podium-transition.py --faults`. **Lulus**, laporan
di `reports/podium-faults.json`, tanpa error JavaScript halaman yang tertangkap.
Satu konteks host dan satu konteks pemain aktif, dengan ukuran desktop 1366×768
dan HP 390×844. Room pertama memiliki satu soal/satu pemain; room kedua memiliki
dua soal/tiga identitas pemain, dua identitas tambahan tidak merender browser.

- Countdown preview berakhir otomatis. Scoreboard masih muncul antarsoal,
  sedangkan soal terakhir masuk layar tunggu tanpa daftar peringkat.
- Refresh host dan pemain mempertahankan layar tunggu. Tombol berada di tengah,
  dapat diaktifkan lewat Enter, dan tidak ada overflow horizontal pada ukuran
  yang diuji.
- ACK `finish` dibuang satu kali. Podium tetap terbuka dan banner kegagalan tidak
  muncul setelah batas waktu enam detik terlewati.
- Host dibuat offline sebelum menekan tombol. Aksi tidak membuka podium,
  tombol tidak terkunci permanen, lalu sesi pulih setelah koneksi kembali.
- Perintah pertama dibuang sebelum mencapai server: timeout muncul dan tombol
  dapat dicoba ulang. Sebanyak 25 klik pada retry menghasilkan satu paket baru
  yang ditahan sebentar lalu dikirim. Total dua paket: satu dibuang, satu retry.
- Pemain dibuat offline ketika host membuka podium. Setelah reconnect, halaman
  menampilkan hasil akhir dengan player ID yang sama.
- Podium tiga pemain muncul dalam urutan 3, 2, 1; skor dan peringkat sebelum dan
  sesudah transisi sama.

Dua percobaan awal alat ukur gagal pada pembandingan stage setelah reconnect,
meskipun UI pemain sudah menampilkan hasil akhir. Pencatat awal hanya membaca
broadcast WebSocket; penambahan pembacaan ACK WebSocket saja belum cukup.
Pemulihan dapat diterima lewat HTTP polling sebelum upgrade WebSocket. Pencatat
kini membaca kedua transport, memeriksa tampilan hasil akhir secara positif,
dan tetap membandingkan snapshot host/pemain. Run akhir mencatat keduanya FINAL,
tanpa respons polling yang gagal dibaca. Tidak ada perubahan aplikasi tambahan
untuk mengatasi kegagalan alat ukur tersebut.

Gangguan disuntikkan pada pesan protokol dan status koneksi Chrome di localhost;
ini bukan pengukuran kehilangan paket radio pada jaringan event. Audit ini
juga bukan profiling memori berjam-jam atau audit ulang semua dependency.

Seluruh data pengujian memakai fixture atau database sementara. Database kuis
asli tidak digunakan. Tidak ada commit, push, atau perubahan branch.
