# BDCAHOOT Live

Kuis multiplayer di jaringan lokal: Host buat room, pemain masuk dengan kode, soal, pembahasan, scoreboard setiap ronde, dan podium akhir.

## Menjalankan

Gunakan Node.js 22.22.2+ (seri 22), 24.15.0+ (seri 24), atau 26+. Versi minimum ini juga memenuhi kebutuhan lingkungan DOM pengujian. Instal dan build sebelum acara saat Internet tersedia:

```sh
npm ci
npm run build
npm start
```

Terminal menampilkan URL lokal, alamat LAN, dan kode operator. Host membuka URL lokal, memilih kuis, memasukkan kode operator lalu membuat room. Pemain membuka alamat LAN yang tercetak (contoh http://192.168.1.10:3000/player/join) dari Wi-Fi yang sama. Bagikan kode room, bukan kode operator.

Setelah pemain masuk, Host menekan Mulai Game. Server menutup jawaban setelah deadline + toleransi 200 ms. Pembahasan 3-5 detik dilanjutkan scoreboard. Host melanjutkan soal berikutnya atau menampilkan podium setelah soal terakhir.

Pengembangan: `npm run dev`. `PORT` mengubah port; `HOST_KEY` menetapkan kode operator minimal 12 karakter. Tanpa HOST_KEY, server membuat kode acak saat startup. Gunakan `.env.local` untuk konfigurasi (lihat `.env.example`). Gunakan build produksi saat acara.

## Batas operasional

- Satu proses server memiliki state dalam memori. Refresh browser aman; restart proses menghapus room. Jangan tutup terminal atau biarkan laptop tidur saat pertandingan.
- Reconnect memulihkan sesi pada tab yang sama melalui sessionStorage. Menutup tab atau menghapus penyimpanan dapat menghilangkan identitas pemain.
- Batas: 150 pemain/room, 200 soal/kuis, payload kuis maksimal 200 KiB, 16 room aktif. Room kedaluwarsa setelah enam jam tanpa aktivitas terautentikasi.
- Firewall perlu mengizinkan port server di jaringan privat. Wi-Fi guest dengan client isolation dapat menghalangi akses ke laptop.
- HTTP lokal ditujukan untuk LAN tepercaya. Tidak melindungi token dari penyadap jaringan; gunakan TLS untuk jaringan tidak tepercaya. Jangan expose langsung ke Internet.
- Gameplay tidak bergantung Internet. Google Fonts opsional dengan fallback font lokal.
- Ranking: skor, total durasi jawaban server, lalu urutan bergabung. Latensi Wi-Fi ikut memengaruhi waktu penerimaan; nol delay tidak dijanjikan.

## Verifikasi

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm audit
```

Tes mengimpor engine produksi dan menjalankan Socket.io sungguhan: 100 koneksi x 40 soal, retry, reconnect, isolasi sesi dan skor yang dihitung independen. Clock soal dipercepat dalam tes; ACK diukur memakai waktu nyata. Hasil loopback bukan pengganti rehearsal dengan perangkat/access point lokasi acara.

### Endurance dengan jam nyata (8C)

```sh
npm run test:endurance
npm run test:endurance -- --players=100 --questions=40 --seconds=15 --report=reports/endurance-15s.json
```

Default: 100 pemain plus satu Host, 40 soal, 5 detik menjawab, 4 detik pembahasan,
dan 1 detik scoreboard; sekitar 7 menit tanpa percepatan jam. Contoh kedua memakai
15 detik menjawab dan berlangsung sekitar 14 menit. Jalankan tanpa build atau tes
lain bersamaan untuk mengurangi gangguan pada pengukuran.

Script membuka server Socket.io/engine produksi pada port loopback acak dalam proses
Node terpisah dari pembangkit pemain. Tidak perlu menyalakan aplikasi terlebih dahulu.
Setiap soal mengirim satu burst jawaban serentak, menunggu scoreboard diterima semua
pemain, lalu memeriksa riwayat jawaban dan skor final. Setelah reset, jumlah room dan
socket harus nol. Error, timeout, disconnect tak terduga, atau skor tidak konsisten
menghasilkan exit code nonzero; kegagalan saat run juga dicatat dalam laporan.

`reports/endurance.json` menyimpan sampel CPU, RSS, heap, external memory, event-loop
delay per detik serta persentil ACK. Folder reports diabaikan Git. CPU memakai skala
100% = satu core penuh, bukan persentase seluruh mesin. P99 event loop pada ringkasan
adalah nilai tertinggi di antara jendela sampel, bukan p99 gabungan. Resolusi monitor
event loop 10 ms. RSS/heap adalah nilai yang tersampel, sehingga lonjakan singkat dapat
terlewat. Tidak ada forced GC; heap yang tidak langsung turun setelah reset sendiri
bukan bukti kebocoran. Status `passed` berarti alur dan konsistensi lolos, bukan lolos
ambang performa universal.

Run ini tidak menjalankan Next.js/rendering browser, tidak mengukur UI freezing,
dan tidak merepresentasikan 100 HP atau router lokasi. Proses terpisah masih berbagi
CPU mesin yang sama. Profil UI dan rehearsal perangkat nyata tetap wajib.

Profil UI produksi dan pengulangan siklus room:

```sh
python -m pip install --target reports/python playwright==1.63.0
npm run build
npm run test:endurance -- --browser --players=100 --questions=40 --seconds=15 --report=reports/endurance-ui-100x40.json
npm run test:endurance -- --players=100 --questions=2 --rounds=5 --report=reports/endurance-lifecycle.json
```

Mode browser membutuhkan Python dan Google Chrome terpasang. Script Python memakai
Playwright dari `reports/python`; tidak ada dependensi browser testing dalam bundle
aplikasi. Server menjalankan Next.js produksi bersama Socket.io. Dari 100 pemain,
99 adalah bot dan satu pemain memakai halaman browser 390×844; Host memakai halaman
1440×900. Satu socket Host tambahan mengamati state untuk pemeriksaan konsistensi.
Browser Host benar-benar menekan Start/Lanjut/Podium, dan pemain browser mengklik
jawaban pada semua soal. Viewport kecil bukan emulasi kemampuan perangkat fisik.

CPU renderer pemain diperlambat 4×; ubah melalui variabel lingkungan
`ENDURANCE_CPU_RATE` bila diperlukan. Timer/rendering background browser dinonaktifkan
throttling-nya agar kedua halaman tetap dirender. Ini menguji beban UI aktif, bukan
suspensi aplikasi di HP. Laporan `.browser.json` mencatat long tasks, jeda frame,
Event Timing, heap/DOM/listener pada scoreboard, error JavaScript, overflow horizontal,
dan waktu aksi Playwright sampai teks konfirmasi tampil. Waktu aksi ini mencakup
driver/polling, bukan INP atau latensi jaringan murni. GC dipaksa hanya pada browser
setelah semua pengukuran pertandingan untuk diagnostik objek yang masih tertahan;
tidak ada forced GC server atau saat pertandingan. Screenshot adalah bukti tambahan,
bukan pengganti metrik. Mode `--rounds` membuat/menutup beberapa room dalam proses
server yang sama dan mencatat kondisi setelah setiap cleanup.

## Struktur

- server/gameEngine.ts: validasi, state machine, deadline monoton, scoring, proyeksi data.
- server/socketServer.ts: identitas koneksi, batas paket/request, ACK dan counter Host maksimal 10 Hz.
- server/index.ts: Next.js dan Socket.io pada satu port.
- context/GameContext.tsx: koneksi klien, pemulihan sesi dan pending submission.
- types/network.ts: kontrak transport.
- tests/: pengujian kode produksi.

Editor tetap menyimpan kuis di localStorage browser Host. BroadcastChannel, grid simulator dan tes yang menduplikasi logika produksi telah diganti.
