# Status implementasi BDCAHOOT Live

Diperbarui 29 September 2026.

Fase 1–7 menghasilkan UI dan prototipe antar-tab. MockGameContext, BroadcastChannel,
grid simulator, dan skrip tes yang menyalin logika aplikasi sudah diganti.
Angka benchmark dan klaim "zero memory leaks" dari prototipe bukan bukti untuk engine LAN.

## Fase 8 — engine LAN

Sudah diimplementasikan:
- Next.js dan Socket.io dalam satu proses Node dan satu port.
- Otorisasi Host, identitas pemain, validasi paket, batas request dan ukuran kuis.
- Deadline dan skor dihitung server; kunci jawaban tidak dikirim sebelum reveal.
- Retry jawaban idempoten, pemulihan sesi dan pilihan setelah refresh/reconnect.
- Scoreboard setiap soal, urutan tie-break deterministik, podium akhir.
- Pembersihan room kedaluwarsa dan pembatasan resource.
- Tes engine produksi serta 100 koneksi Socket.io × 40 soal.

Gerbang penerimaan lapangan belum selesai: uji 50–100 HP pada access point lokasi,
termasuk layar terkunci, pindah aplikasi, reconnect, dan sesi 30+ soal tanpa Internet.
Tes transport lokal menggunakan clock soal dipercepat; hasilnya bukan pengukuran
rendering 100 HP, interferensi Wi-Fi, atau jaminan bebas kebocoran memori.

## Fase berikutnya — pemulihan setelah proses mati

State pertandingan masih di memori. Refresh browser dapat pulih; restart server
menghapus room. Penyimpanan snapshot pertandingan belum diimplementasikan.
Editor menyimpan kuis di localStorage browser Host.

Lihat README.md untuk menjalankan server dan batas operasional, SECURITY.md untuk
batas keamanan, serta tests/ untuk pemeriksaan yang dapat dijalankan ulang.
