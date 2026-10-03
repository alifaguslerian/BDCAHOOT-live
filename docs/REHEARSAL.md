# Checklist penerimaan lapangan

Status awal: **BELUM DIJALANKAN**. Isi hasil nyata; tes otomatis 39/39 pada 9B
tidak mencentang checklist ini. Ikuti [panduan operator](OPERASIONAL.md).

## Identitas sesi

| Data | Isi sebelum tes |
| --- | --- |
| Tanggal, lokasi, operator | |
| Versi kode yang diuji / penanda perubahan lokal | |
| Laptop, RAM, OS, versi Node | |
| Router/AP, koneksi laptop, SSID, IP/port | |
| Jumlah HP fisik / Android / iOS / browser | |
| Kuis, jumlah soal, timer | |
| Lokasi database uji privat | |

Gunakan kuis, nama pemain, dan database latihan. Bila mengganti DATABASE_PATH,
catat nilainya dan kembalikan konfigurasi acara sebelum menjalankan pertandingan asli.
Jangan menguji crash pada pertandingan yang sedang dipakai orang.

## Tahap 1: 3–5 HP, satu alur lengkap

- [ ] Build produksi berjalan; halaman dapat dibuka dari semua HP melalui LAN.
- [ ] Host membuat room; kode operator tidak terlihat pemain.
- [ ] Kode room salah dan nama duplikat ditolak dengan pesan yang bisa dipahami.
- [ ] Semua pemain terdaftar sesuai nama; kick di lobby mencabut akses pemain itu.
- [ ] Start menampilkan soal/pilihan yang sama di seluruh perangkat.
- [ ] Pilihan langsung memberi respons UI; jawaban yang diterima tetap terkunci.
- [ ] Klik berulang tidak mengganti jawaban atau menambah poin.
- [ ] Jawaban terlambat ditolak; pemain tetap bisa menjawab soal berikutnya.
- [ ] Pembahasan dan scoreboard muncul setiap soal; Host dapat lanjut.
- [ ] Mute bekerja; halaman tidak overflow atau menutup tombol pada HP terkecil.
- [ ] Soal terakhir berakhir pada podium; urutan dan skor sesuai scoreboard final.
- [ ] Buat room baru sesudah sesi: nama/sesi/jawaban lama tidak terbawa.

## Tahap 2: gangguan pada perangkat latihan

Uji satu gangguan pada satu HP dulu. Catat soal dan status sebelum/sesudah.

| Skenario | Hasil yang diperiksa | Hasil aktual / lulus-gagal |
| --- | --- | --- |
| Refresh setelah jawaban diterima | Identitas dan pilihan pulih; poin tidak berganda | |
| Matikan Wi-Fi 10 detik, hidupkan lagi | Tab sama pulih ke soal/tahap server; tidak membuat pemain kedua | |
| Pindah aplikasi 20 detik | Saat kembali, UI tidak tertahan di soal lama | |
| Kunci layar 30 detik | Setelah terbuka, tahap/clock benar dan soal berikutnya bisa dijawab | |
| Putus Wi-Fi tepat setelah klik | Setelah reconnect, status mengikuti receipt server; catat diterima/ditolak, bukan menebak dari animasi | |
| Restart normal server saat soal aktif | Room pulih ke scoreboard, skor tersimpan benar; Host lanjut manual | |
| Lepas Internet WAN, LAN tetap hidup | Halaman termasuk reload dan game tetap berjalan; jangan cabut router/AP | |

Untuk restart, gunakan Ctrl+C lalu `npm start` pada port/database sama. Ini rehearsal
restart normal; pengujian process kill telah dicatat terpisah dalam verification.md.
Tidak perlu mencabut listrik atau sengaja memenuhi disk laptop.

## Tahap 3: kapasitas acara

- [ ] Naikkan peserta bertahap: 10, 25, 50, lalu jumlah target acara (misalnya 100).
- [ ] Jalankan minimal 30 soal pada jumlah target, dengan timer dan jeda Host seperti acara.
- [ ] Gunakan lokasi/sebaran peserta dan router yang direncanakan; jangan berkumpul hanya di dekat AP.
- [ ] Lakukan burst jawaban serentak pada beberapa soal untuk memeriksa respons UI.
- [ ] Catat jumlah disconnect, UI macet, jawaban ambigu, dan intervensi operator.
- [ ] Amati CPU/memori proses server di Task Manager saat awal, pertengahan dan akhir.
- [ ] Semua peserta mencapai scoreboard/podium, kecuali pengecualian yang tercatat jelas.
- [ ] Cocokkan skor/urutan peserta sampel dengan riwayat jawabannya.

Jangan menyebut “100 pemain lulus” jika yang diuji hanya 25 HP ditambah bot.
Catat bot terpisah. Angka Task Manager adalah observasi, bukan pengukuran ACK p95;
jangan menyalin angka benchmark localhost sebagai angka Wi-Fi lapangan.

## Log masalah

| Waktu / soal | Perangkat / browser | Gejala dan langkah pemicu | Lama gangguan | Tindakan dan hasil |
| --- | --- | --- | --- | --- |
| | | | | |

Simpan screenshot yang sudah menutupi rahasia. Catat apakah masalah terjadi sebelum
atau sesudah konfirmasi jawaban, jumlah perangkat terdampak, dan pesan terminal.

## Keputusan siap acara

- [ ] Tidak ada kehilangan jawaban yang sudah dikonfirmasi, skor ganda, atau akses lintas pemain.
- [ ] Tidak ada kegagalan yang menghentikan sesi 30+ soal atau memerlukan reset pertandingan.
- [ ] Gangguan pada HP uji pulih dan pemain bisa mengikuti soal berikutnya.
- [ ] Tidak ada jeda UI berulang yang menghalangi pemain menjawab dalam timer acara.
- [ ] Backup, asal kuis, URL LAN, dan prosedur restart dipahami operator.
- [ ] Semua kegagalan yang memengaruhi permainan diperbaiki dan skenarionya dites ulang.

Keputusan operator: **BELUM / LULUS untuk ___ HP / GAGAL**.
Tanggal dan catatan pengecualian: ____________________.

Lulus berlaku untuk konfigurasi dan jumlah perangkat yang diuji. Jika masih gagal,
tunda penggunaan pada skala target atau turunkan skala setelah rehearsal ulang;
jangan menyatakan siap 100% berdasarkan build atau bot saja.
