# BDCAHOOT Live

Kuis multiplayer di jaringan lokal: Host buat room, pemain masuk dengan kode, soal, pembahasan, scoreboard setiap ronde, dan podium akhir.

## Menjalankan

Gunakan Node.js 22+. Instal dan build sebelum acara saat Internet tersedia:

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

## Struktur

- server/gameEngine.ts: validasi, state machine, deadline monoton, scoring, proyeksi data.
- server/socketServer.ts: identitas koneksi, batas paket/request, ACK dan counter Host maksimal 10 Hz.
- server/index.ts: Next.js dan Socket.io pada satu port.
- context/GameContext.tsx: koneksi klien, pemulihan sesi dan pending submission.
- types/network.ts: kontrak transport.
- tests/: pengujian kode produksi.

Editor tetap menyimpan kuis di localStorage browser Host. BroadcastChannel, grid simulator dan tes yang menduplikasi logika produksi telah diganti.
