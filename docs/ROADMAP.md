# Status implementasi BDCAHOOT Live

Diperbarui 1 Oktober 2026.

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

## Tahapan penerimaan menuju acara

| Tahap | Status | Bukti / pekerjaan tersisa |
| --- | --- | --- |
| 8A: mute, status, keluar/masuk | Perbaikan utama lolos tes otomatis dan browser lokal | Mute lintas efek dan refresh; keluar lobby membebaskan nama; navigasi keluar tidak ditimpa redirect sesi |
| 8B: gangguan koneksi | Perbaikan dan simulasi otomatis lokal lolos | ACK join/resume/jawaban hilang, reconnect berulang, jawaban terlambat, ACK soal lama, dan pemulihan saat halaman aktif; layar terkunci/background pada HP masih perlu diuji |
| 8C: ketahanan | Endurance server lokal lolos; profil UI belum | 100 pemain + Host × 40 soal, sekitar 7 menit jam nyata, CPU/memori/latensi terukur; profil rendering, sesi lebih panjang, dan perangkat LAN masih perlu |
| 9A: penyimpanan pertandingan | Belum | Simpan progres terkonfirmasi dan tentukan aturan melanjutkan soal setelah crash |
| 9B: pemulihan dan keamanan | Belum | Uji restart, konsistensi skor, token, spam, dan paket rusak |
| Persiapan dan rehearsal acara | Belum | Panduan operasional serta uji 50–100 HP pada router lokasi |

Hasil 8A dan simulasi 8B tidak berarti seluruh UI telah selesai diaudit atau seluruh Fase 8 siap acara.
Jumlah peserta Host adalah peserta terdaftar, bukan pengukuran jumlah socket yang sedang online.

## Penyimpanan pertandingan

State pertandingan masih di memori. Refresh browser dapat pulih; restart server
menghapus room. Penyimpanan snapshot pertandingan belum diimplementasikan.
Editor menyimpan kuis di localStorage browser Host.

Lihat README.md untuk menjalankan server dan batas operasional, SECURITY.md untuk
batas keamanan, serta tests/ untuk pemeriksaan yang dapat dijalankan ulang.
