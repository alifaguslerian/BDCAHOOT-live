# Status implementasi BDCAHOOT Live

Diperbarui 2 Oktober 2026.

Tindak lanjut audit eksternal: pemulihan pemain setelah tab hilang, batas koneksi/alamat,
pencegahan pendaftaran berulang satu koneksi, dan pengelolaan histori join telah diuji.
45 tes lulus; keputusan setiap temuan ada di [AUDIT-RESPONSE.md](AUDIT-RESPONSE.md).

Tindak lanjut self-audit: halaman masuk memulihkan pemain ke arena, jam soal dimulai
setelah commit intent pembukaan, resume tidak memicu broadcast penuh ke seluruh peserta
room, dan kuis bawaan tidak dimuat ke bundle browser. Suite terbaru:
51 tes lulus. Lihat catatan terbaru di [verification.md](verification.md).

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
| 8C: ketahanan | Verifikasi lokal selesai | Engine 100 bot × 40 soal; Next.js produksi + UI Host/pemain + 99 bot × 40 soal selama 14m45s, CPU pemain 4×; lima siklus room dan cleanup lolos. Rehearsal HP/router tetap gerbang penerimaan acara |
| 9A: penyimpanan pertandingan | Implementasi dan verifikasi lokal selesai | SQLite worker, ACK setelah commit; 100 ACK serentak bertahan setelah process kill; 100 pemain × 40 soal dengan persistence lolos; soal aktif pulih ke scoreboard |
| 9B: pemulihan dan keamanan | Verifikasi otomatis lokal selesai | Timeout commit dan antrean terbatas; crash sebelum commit dan rollback transaksi SQLite; token/kick, konflik jawaban dua koneksi, spam, origin asing, dan paket besar lolos. Disk gagal/macet diuji lewat injeksi, bukan disk fisik penuh |
| Persiapan operasional | Panduan tersedia | Startup produksi, backup pertandingan/library kuis, penanganan gangguan, dan checklist penerimaan |
| Rehearsal acara | Belum dijalankan | Isi docs/REHEARSAL.md dengan hasil 50–100 HP pada router lokasi; jangan menandai lulus dari tes bot |

Hasil 8A dan simulasi 8B tidak berarti seluruh UI telah selesai diaudit atau seluruh Fase 8 siap acara.
Selesai lokal pada 8C berarti skenario otomatis dan profil pada mesin pengujian lolos;
bukan 100 HP sudah diuji atau jaminan tanpa lag/kebocoran memori. Tahap implementasi
berikutnya setelah 9B adalah persiapan operasional dan rehearsal perangkat/router lokasi.
Jumlah peserta Host adalah peserta terdaftar, bukan pengukuran jumlah socket yang sedang online.

## Penyimpanan pertandingan

Server normal menyimpan snapshot ke SQLite lokal. Refresh dan restart dapat memulihkan
room yang belum kedaluwarsa dengan database dan token browser yang sama. Soal yang
aktif saat restart ditutup ke scoreboard; Host melanjutkan secara manual. Database
berisi rahasia sesi dan harus dilindungi. Lihat README untuk operasi/backup.
Editor menyimpan kuis di localStorage browser Host.

Lihat README.md untuk menjalankan server dan batas operasional, SECURITY.md untuk
batas keamanan, serta tests/ untuk pemeriksaan yang dapat dijalankan ulang.

Mulai persiapan dari [OPERASIONAL.md](OPERASIONAL.md), lalu catat hasil lapangan
di [REHEARSAL.md](REHEARSAL.md). Dokumentasi tersedia tidak berarti rehearsal sudah lulus.
