# Tindak lanjut dua laporan audit eksternal

Ditinjau 2 Oktober 2026. Temuan dibandingkan dengan implementasi dan diuji ulang.
Pujian maupun jaminan “nyaris mustahil macet” dari laporan tidak dianggap bukti.

| Temuan | Putusan dan tindakan |
| --- | --- |
| Sesi hilang saat tab baru | Valid. Tes kehilangan sessionStorage gagal sebelum perbaikan. Tambahkan cadangan token pemain terakhir di localStorage; receipt diambil kembali dari server. Sesi tab lebih diprioritaskan. Host, request pembuatan room, dan pending jawaban tidak dimigrasikan bersama-sama ke global storage. |
| Satu socket membuat banyak pemain | Valid. Tes dua pendaftaran dari socket pemain yang sama gagal sebelum perbaikan. Sekarang hanya retry identitas yang sama diperbolehkan sampai leave atau token tidak berlaku. Ini tidak mencegah Sybil melalui reconnect/perangkat lain. |
| Histori join 1.000 membuat lobby penuh | Valid untuk siklus join/leave baru; bukan reconnect biasa memakai token/requestId lama. Tes 1.100 siklus gagal sebelum perbaikan. Histori aktif dipertahankan; saat kapasitas tercapai, entri revoked tertua diganti. Retry revoked terbaru tetap ditolak. ID yang sudah dievikt diperlakukan sebagai join baru, bukan pemulihan token lama. |
| Satu alamat menghabiskan 1.000 koneksi | Valid sebagai celah pembatasan resource. Batas 200/alamat ditambahkan dan dites untuk penolakan serta pembebasan slot. Handshake serentak diperiksa ulang setelah terbentuk. Batas ini bukan jaminan menahan semua DoS dan bisa membatasi jaringan yang menggabungkan banyak pengguna lewat satu alamat. |
| Hapus/perpanjang timeout 5 detik | Tidak diterapkan tanpa bukti workload lapangan. Timeout menghentikan transport dan menolak koneksi baru, bukan membunuh proses atau menghapus database. Tes stall memastikan tidak ada ACK sukses palsu. Memperpanjang waktu juga memperpanjang keadaan pemain menunggu, sementara deadline soal terus berjalan. Gangguan disk fisik/antivirus tertentu belum direproduksi. |
| Recovery menutup soal aktif | Kebijakan yang disengaja, tetap dipertahankan. Jawaban tanpa ACK mungkin tersimpan atau hilang; receipt hasil recovery menentukan status. Soal tidak otomatis diulang atau dianulir untuk seluruh peserta. |
| Kloning sinkron mahal di banyak room | Risiko skalabilitas yang masuk akal, belum bug terbukti untuk target satu pertandingan 100 pemain. Angka 10 ms/200–300 ms dari reviewer tidak diadopsi sebagai hasil ukur sendiri. Tidak dilakukan rewrite atau penghapusan isolasi snapshot tanpa benchmark yang membenarkan. |
| brace-expansion high di devDependencies | Dikonfirmasi dengan npm audit dan npm ls. Perbarui hanya 1.1.18 → 1.1.21 dan 5.0.9 → 5.0.12 dalam lockfile, tanpa install scripts. Audit setelah perubahan melaporkan 0 advisory, termasuk development. |

## Bukti pengujian

- Empat reproduksi utama gagal sebelum fix: kehilangan sesi tab, lobby penuh oleh
  histori revoked, banyak pemain pada satu koneksi, dan koneksi melebihi batas alamat.
- `npm test`: 45/45 lulus, termasuk 100 socket × 40 soal, crash SQLite dan pemulihan ACK.
- Tambahan tes memastikan Host tab tidak tertimpa cadangan pemain, serta keluar dari
  tab pemain lama tidak menghapus cadangan pemain lain.
- Build produksi lulus sesudah perubahan kode. Lint dan typecheck lulus setelah
  pembaruan dua dependensi development. Tidak ada perubahan dependensi runtime.
- `npm audit --omit=dev` melaporkan 0 sebelum update; audit penuh awal melaporkan satu
  paket high. `npm audit --json` setelah update melaporkan 0.

Pemulihan pemain diuji melalui React/JSDOM, server Socket.io nyata, kehilangan storage
tab, dan remount. Ini bukan uji force-stop Android/iOS fisik. Browser bisa menolak atau
menghapus localStorage; profil/origin berbeda tidak berbagi cadangan. Pending join yang
belum menghasilkan token dan kredensial Host tetap bergantung penyimpanan tab.
Tidak ada benchmark durasi nyata baru atau rehearsal HP/router dalam tindak lanjut ini.
Tidak ada commit, push, atau perubahan branch.
