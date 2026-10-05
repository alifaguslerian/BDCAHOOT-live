# BDCAHOOT Live

Kuis multiplayer di jaringan lokal: Host buat room, pemain masuk dengan kode, soal, pembahasan, scoreboard setiap ronde, dan podium akhir.

Untuk acara: [panduan operator dan backup](docs/OPERASIONAL.md),
[checklist rehearsal HP/router](docs/REHEARSAL.md), dan [status progres](docs/ROADMAP.md).

## Menjalankan

Gunakan Node.js 22.22.2+ (seri 22), 24.15.0+ (seri 24), atau 26+. Versi minimum ini juga memenuhi kebutuhan lingkungan DOM pengujian. Instal dan build sebelum acara saat Internet tersedia:

```sh
npm ci
npm run build
npm start
```

Terminal menampilkan URL lokal, alamat LAN, dan kode operator. Host membuka URL lokal, memasukkan kode operator untuk membuka koleksi kuis, memilih kuis lalu membuat room. Pemain membuka alamat LAN yang tercetak (contoh http://192.168.1.10:3000/player/join) dari Wi-Fi yang sama. Bagikan kode room, bukan kode operator.

Setelah pemain masuk, Host menekan Mulai Game. Server menutup jawaban setelah deadline + toleransi 200 ms. Pembahasan 3-5 detik dilanjutkan scoreboard. Host melanjutkan soal berikutnya atau menampilkan podium setelah soal terakhir.

Pengembangan: `npm run dev`. `PORT` mengubah port; `HOST_KEY` menetapkan kode operator minimal 12 karakter. Tanpa HOST_KEY, server membuat kode acak saat startup. Gunakan `.env.local` untuk konfigurasi (lihat `.env.example`). Gunakan build produksi saat acara.

## Batas operasional

- Server menyimpan pertandingan ke SQLite lokal (`data/game.sqlite`, dapat diubah lewat `DATABASE_PATH`). Satu proses server per database. Jangan menutup terminal atau membiarkan laptop tidur saat pertandingan; restart akan mengakhiri soal yang sedang aktif dan memulihkannya ke scoreboard.
- Sesi aktif dipisahkan per tab melalui sessionStorage. Token pemain terakhir juga dicadangkan di localStorage agar tab baru pada profil/origin yang sama dapat memulihkan pemain dan receipt server. Sesi Host dicadangkan per kode room di localStorage; URL room yang sama dapat memulihkannya jika sessionStorage hilang. Menghapus site data atau berganti browser/origin dapat menghilangkan identitas.
- Batas: 150 pemain/room, 200 soal/kuis, payload kuis maksimal 200 KiB, 16 room aktif. Room kedaluwarsa setelah enam jam tanpa aktivitas terautentikasi.
- Firewall perlu mengizinkan port server di jaringan privat. Wi-Fi guest dengan client isolation dapat menghalangi akses ke laptop.
- HTTP lokal ditujukan untuk LAN tepercaya. Tidak melindungi token dari penyadap jaringan; gunakan TLS untuk jaringan tidak tepercaya. Jangan expose langsung ke Internet.
- Gameplay dan font tidak bergantung Internet. Font WOFF2 dimuat dari server LAN, dengan fallback font sistem.
- Ranking: skor, total durasi jawaban server, lalu urutan bergabung. Latensi Wi-Fi ikut memengaruhi waktu penerimaan; nol delay tidak dijanjikan.

## Pemulihan pertandingan (9A)

ACK sukses untuk perubahan permainan baru dikirim setelah transaksi SQLite selesai.
Penulisan berjalan di worker dan perubahan yang berdekatan dapat digabung dalam satu
snapshot. Server menyimpan room, urutan soal, token Host/pemain, jawaban, receipt retry,
skor, urutan bergabung, dan penghapusan room. Snapshot tidak dikirim ke browser.

Pembukaan soal disimpan dahulu sebagai QUESTION yang belum memiliki waktu mulai.
Setelah commit selesai, server mengaktifkan jam soal sebelum mengirimnya ke pemain;
waktu menunggu commit pembukaan tidak memakan durasi menjawab. Clock aktif ikut snapshot
berikutnya. Bila server crash sebelum snapshot berikutnya, intent QUESTION tersimpan
tetap dipulihkan ke scoreboard, bukan membuka ulang soal. Latensi pengiriman LAN tetap ada.

Setelah restart dengan database yang sama:

- LOBBY, SCOREBOARD dan FINAL kembali ke tahap tersimpan.
- QUESTION/REVEAL dipulihkan ke SCOREBOARD soal tersebut. Jawaban tersimpan tetap
  dihitung, pemain yang belum menjawab tidak mendapat poin, dan penalti waktu untuk
  tie-break diterapkan satu kali. Host melanjutkan ke soal berikutnya secara manual.
- Host kembali memakai URL, origin dan tab yang sama, dengan sessionStorage
  masih ada. Pemain dapat memakai cadangan lokal pada profil/origin yang sama bila tab hilang.
  Hanya pemain terakhir yang memiliki cadangan per origin; untuk banyak pemain pada satu
  perangkat, gunakan profil browser terpisah. Token/kode room tetap berlaku untuk room yang belum kedaluwarsa. Database
  tidak mengembalikan token browser yang sudah dihapus. HOST_KEY yang tetap memudahkan
  retry pembuatan room setelah restart; token Host room lama tidak bergantung key baru.
- Room tanpa aktivitas tetap kedaluwarsa setelah enam jam. Aktivitas terakhir disimpan
  secara periodik (sekitar 30 detik di luar waktu penulisan), juga ketika ada perubahan game
  dan saat shutdown normal.

Jika disk gagal ditulis atau commit tidak selesai dalam 5 detik, server memutus koneksi permainan, menolak koneksi baru dan
menampilkan error di terminal. Perbaiki penyimpanan lalu restart; jangan menghapus
database untuk menghilangkan error. Database rusak atau versi tidak didukung membuat
startup gagal tanpa menggantinya dengan pertandingan kosong.

Request yang menunggu dibatasi 8 per koneksi dan 1.000 seluruh server. Kelebihannya
ditolak sementara dengan RATE_LIMIT sebelum mengubah game. Timeout bukan bukti bahwa
write dibatalkan: commit yang terlambat mungkin sudah tersimpan. Setelah restart,
gunakan sesi dan receipt server sebagai sumber status jawaban. Jika disk/worker benar-benar
hang sehingga shutdown tidak selesai, operator perlu menghentikan proses lalu memeriksa disk.

Gunakan disk lokal yang andal, bukan folder jaringan/cloud-sync. Lindungi folder data
dengan izin akun operator (terutama ACL Windows); database menyimpan rahasia sesi dan
kunci jawaban dalam bentuk tidak terenkripsi. Jangan taruh di `public`, commit,
unggah, atau bagikan kepada pemain. Untuk backup sederhana, hentikan server normal
lalu salin database; simpan backup aman sebelum upgrade aplikasi/Node. Recovery sudah
diuji terhadap process kill setelah ACK, bukan terhadap pencabutan listrik atau disk
rusak secara fisik. Durabilitas tetap bergantung filesystem/perangkat menghormati sync.

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
npm run test:endurance -- --players=100 --questions=40 --database=reports/durable-test.sqlite --report=reports/durable-test.json
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
Tambahkan `--database` untuk memasukkan biaya persistence seperti server normal.
Tanpa opsi ini, harness memakai memori saja. Gunakan database pengujian terpisah;
jangan arahkan benchmark ke database pertandingan acara.

## Struktur

- server/gameEngine.ts: validasi, state machine, deadline monoton, scoring, proyeksi data.
- server/socketServer.ts: identitas koneksi, batas paket/request, ACK dan counter Host maksimal 10 Hz.
- server/index.ts: Next.js dan Socket.io pada satu port.
- context/GameContext.tsx: koneksi klien, pemulihan sesi dan pending submission.
- types/network.ts: kontrak transport.
- tests/: pengujian kode produksi.

Koleksi kuis dan draft editor disimpan di tabel `quizzes` dalam SQLite server (`data/game.sqlite`, mengikuti `DATABASE_PATH`). Pindah Wi-Fi/IP atau browser tidak mengganti koleksi selama terhubung ke server dengan file database yang sama. Semua operasi koleksi membutuhkan kode operator; kunci jawaban tidak tersedia ke pemain melalui koleksi. Kode operator diingat di sessionStorage tab sampai ditutup. Jika server mengganti kode saat restart, buka ulang halaman dan masukkan kode baru.

Saat membuka koleksi dari browser/alamat lama, aplikasi otomatis mengimpor kuis localStorage. Setelah seluruh impor dikonfirmasi server, data lama diarsipkan ke `bdcahoot_quiz_library_v1_backup`; kegagalan tetap mempertahankan data sumber. Impor tidak menimpa ID yang sudah ada di server dan tidak menghidupkan kembali kuis yang dihapus. Browser tidak bisa membaca penyimpanan dari origin lain: buka alamat lama sekali untuk memindahkan kuis yang dibuat di sana. Simpan salinan backup browser bila ada konflik ID yang perlu dipulihkan manual.

Editor menunggu konfirmasi database sebelum menampilkan status tersimpan. Autosave digabung selama 400 ms; tombol kembali/pengaturan menunggu penyimpanan selesai. Koneksi putus atau konflik edit dua tab menampilkan error, bukan status sukses. Tunggu “Tersimpan otomatis” sebelum menutup tab. Dua tab dengan versi berbeda tidak boleh saling menimpa; muat ulang tab lama sebelum melanjutkan. Batas koleksi 500 kuis aktif, 200 soal/kuis, 200 KiB/kuis. Draft boleh belum lengkap; validasi bermain tetap diterapkan saat membuat room. `/host/manage` mengarah ke editor koleksi yang sama agar tidak ada jalur draft sementara terpisah.

Untuk backup kuis beserta pertandingan, hentikan server lalu salin file database ke lokasi cadangan. SQLite tetap lokal, bukan cloud: memindah server ke laptop lain membutuhkan file database tersebut. File ini juga mengandung token pertandingan; jangan bagikan ke pemain.

Tes browser produksi: setelah `npm run build`, jalankan `python scripts/check-quiz-library.py` (Chrome + Playwright seperti tes endurance). Menggunakan database sementara; menguji edit, navigasi sebelum debounce, konflik dua tab, offline/retry, restart, origin berbeda, dan pembuatan room. Laporan tersimpan di `reports/quiz-library-browser.json`.

BroadcastChannel, grid simulator dan tes yang menduplikasi logika produksi telah diganti.

Database baru mulai dengan library kosong; materi kuis contoh dan kuncinya tidak lagi
disisipkan ke bundle publik. Kuis localStorage Host dimigrasikan dengan cadangan seperti dijelaskan di atas.
Jangan gunakan kuis contoh dari versi lama sebagai materi kompetisi rahasia, karena
materi itu pernah tersedia publik. Buat soal sendiri sebelum acara.


### Avatar pemain

Pada langkah isi nama, pemain dapat memilih satu dari 12 ilustrasi robot Bottts (default Robot 1). Avatar muncul di lobby, hasil pemain, leaderboard host dan podium. Pilihan disimpan bersama pemain dalam snapshot pertandingan sehingga reconnect dan recovery mempertahankannya. Pemain dari snapshot lama memakai tampilan Robot 1.

Aset SVG lokal berada di `public/avatars/` (sekitar 62 KiB total), tanpa permintaan internet saat bermain. Sumber/lisensi tercatat di `public/avatars/README.txt`. Server menerima ID avatar dari daftar tetap; URL atau upload gambar tidak diterima. Retry join memakai pilihan dari permintaan awal yang belum terkonfirmasi agar identitas tetap konsisten. Avatar tidak memengaruhi poin atau tie-breaker.


### Pemulihan operator saat room masih aktif

Refresh pada URL `/host/room/KODE` memulihkan sesi dari sessionStorage, atau cadangan Host khusus kode room pada browser/origin yang sama. Jika keduanya hilang atau operator pindah browser/alamat, buka URL room tersebut dan pilih **Pulihkan kendali room** memakai kode operator dari terminal server. Form yang sama tersedia di Library melalui **Pulihkan room yang masih aktif**. Library juga menyediakan tautan ke room Host yang masih tersambung.

Pemulihan memerlukan kode operator yang valid; kode room saja tidak memberikan kendali. Pemulihan tidak membuat room baru, mereset timer, atau mengubah pemain/poin. Room yang ditutup atau kedaluwarsa tidak dapat dipulihkan. Tombol **Tutup room** tersedia juga selama soal/reveal/scoreboard, meminta konfirmasi, lalu mengakhiri sesi semua pemain. Penutupan menghapus cadangan sesi Host tersebut. Restart proses server tetap mengikuti aturan pemulihan pertandingan: soal aktif diakhiri ke scoreboard; berbeda dari refresh browser.

Verifikasi 2026-10-04: 55 tes regresi, build dan lint lolos. Chrome produksi menguji refresh saat soal aktif, sessionStorage hilang, seluruh storage hilang, penolakan kode operator salah, pemulihan room, serta penutupan yang melepaskan pemain. Penyebab kehilangan sesi pada browser pengguna belum terkonfirmasi; refresh normal berhasil dalam pengujian.


### Keluar room dari perangkat pemain

Tombol **Keluar room** tersedia pada lobby, soal, pembahasan, leaderboard dan hasil akhir. Pada game aktif, pemain mengonfirmasi keluar; token aksesnya dicabut dan cadangan sesi perangkat dihapus setelah server mengonfirmasi. Refresh setelah keluar tidak memasukkan pemain kembali. Nilai/jawaban yang sudah tercatat tetap menjadi bagian hasil pertandingan, tetapi pemain ditandai tidak terhubung. Pemain tidak dapat bergabung ulang ke game yang telah dimulai. Keluar membutuhkan koneksi ke server agar pencabutan sesi terkonfirmasi.

Refresh browser Host di URL room yang sama memulihkan room secara otomatis dan tidak mengulang pertanyaan atau timer. Pengujian Chrome mencakup refresh di lobby, soal aktif dan scoreboard serta tombol keluar pada setiap fase aktif sampai final. Verifikasi pembaruan: 56 tes regresi, build dan lint lolos.
