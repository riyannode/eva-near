# EVA · PRD produk dan roadmap

## Produk dan pelanggan pertama

**EVA membantu agensi memberi freelancer referensi kerja yang bisa diperiksa perekrut ketika proyeknya terikat NDA.** Freelancer biasanya punya dua pilihan yang buruk: menghilangkan pekerjaan itu dari portofolio, atau menjelaskan kontribusinya tanpa bukti yang bisa diperiksa. Agensi harus memastikan tiap kalimat aman dibagikan. Perekrut butuh konteks singkat dan penerbit yang bisa dipercaya.

Pelanggan pertama adalah agensi digital yang rutin memakai freelancer untuk beberapa proyek rahasia. Mulai dari satu agensi yang punya pekerjaan berulang dan satu operator yang berwenang menyetujui teks. Gunakan satu referensi singkat untuk satu kontribusi. Contoh: “Designed the checkout flow for an online store.” Nama klien dan file proyek tetap berada di sistem agensi.

## Hackathon MVP

| Peran | Halaman | Alur |
| --- | --- | --- |
| Freelancer | `/freelancer` | Siapkan nama atau alias profesional dan usulan klaim, lalu salin permintaan untuk dikirim ke kontak agensi yang sudah digunakan. |
| Agensi | `/agency` | Hubungkan wallet NEAR Testnet, tinjau teks dan konfirmasi izin berbagi, lalu issue. Setelah pembacaan final menghasilkan `VALID`, salin atau buka link. Pemilik akun yang sama dapat mengecek link yang disimpan dan mencabutnya. |
| Perekrut | `/recruiter`, `/verify` | Tempel atau buka link dari CV dan periksa kontribusi, akun penerbit, serta status. |

Beranda menjelaskan EVA dan menunjukkan satu contoh. **Open EVA** membuka dialog pemilihan peran. Wallet hanya digunakan di halaman agensi. Freelancer dan perekrut dapat langsung memakai halamannya tanpa akun. `/project` memberi navigasi ke halaman peran dari bookmark yang sudah ada.

Setelah wallet diminta mengirim transaksi, status yang ditampilkan bergantung pada hasil baca final. Jika hasil belum diketahui, periksa record sebelum mengulang aksi. Penerbitan ulang setelah hasil tidak pasti memakai ID dan payload yang sama. Salin link yang sudah terbit untuk membagikannya dan untuk membuka kembali referensi saat perlu mencabutnya. Pencabutan bersifat permanen. Perbaikan teks menghasilkan referensi baru.

| Jalur juri | Bukti |
| --- | --- |
| **Sample data** | `/demo` memeriksa fixture lokal untuk status Valid, Revoked, dan Edited. |
| **Local NEAR Sandbox** | Docker menjalankan WASM registri dan signer lokal. Juri membuka `/issue` untuk issue → verifikasi `VALID` → revoke → verifikasi `REVOKED` pada link yang sama tanpa wallet eksternal. Restart menghapus record lokal. |
| **NEAR Testnet** | Setelah rilis disetujui, agensi menerbitkan melalui browser dan perekrut memeriksa hasil final pada registry yang dikonfigurasi. Agensi mencabut dengan akun yang menerbitkan. Bukti publik mengikuti [runbook rilis](operator.md#prepare-the-testnet-release). |

### Data dan kepercayaan

Agensi bertanggung jawab atas akurasi kontribusi dan izin berbagi teks. Perekrut tetap menilai reputasi agensi dan identitas kandidat. EVA membuktikan bahwa akun NEAR yang terlihat mencatat commitment atas teks di link, serta menunjukkan apakah akun itu sudah mencabut referensinya.

Payload hanya berisi informasi yang dibutuhkan untuk verifikasi. Nama klien, artefak proyek, NDA, kontak dan catatan internal tetap di kanal agensi. Fragment memuat teks yang dapat dibaca siapa pun yang mendapat link. Browser tidak menyertakan fragment dalam permintaan HTTP normal. Verifier hanya meminta ID referensi ke backend. Chain menyimpan ID acak, akun penerbit, commitment, status pencabutan, dan metadata transaksi NEAR.

### Format referensi

```text
["eva:reference:v2", network, contractId, issuerId, referenceId, salt, subject, claim]
/verify#r=<base64url(payloadBytes)>
```

`eva:reference:v2` adalah penanda format di parser. Byte payload berasal dari `JSON.stringify` array delapan string dan UTF-8. `network` adalah `sample`, `sandbox`, atau `testnet`. Encoder membuat ID 16 byte CSPRNG dalam hex huruf kecil dan salt 32 byte CSPRNG independen dalam base64url tanpa padding. Normalisasi teks dengan NFC dan trim. Batas `subject` adalah 1–80 byte UTF-8 dan `claim` 1–240 byte. Karakter kontrol, karakter pengarah bidi dan surrogate yang rusak ditolak. Parser menolak base64url, UTF-8, atau payload yang berbeda dari encoding kanonik.

Verifier memakai network dan kontrak dari konfigurasi tepercaya. Setelah format dan profil cocok, verifier membaca record pada blok final. Akun `issuerId` di payload harus sama dengan pemilik record. SHA-256 dari byte payload harus sama dengan commitment record. Setelah kedua pemeriksaan lolos, flag `revoked` menghasilkan `REVOKED` atau `VALID`. Link rusak, profil salah, record hilang, atau ketidakcocokan integritas menghasilkan `INVALID`. Pembacaan atau kriptografi yang gagal menghasilkan `UNAVAILABLE`.

### Registri NEAR

```text
Record { issuer_id: AccountId, commitment: [u8; 32], revoked: bool }
init()
issue(reference_id, commitment) → ISSUED | UNCHANGED
revoke(reference_id) → REVOKED | UNCHANGED
get_reference(reference_id) → null | { issuer_id, commitment, revoked }
```

`init` dipanggil akun kontrak saat deployment. ID dan commitment masing-masing memakai 32 dan 64 karakter hex huruf kecil. `issue` mengambil pemilik dari `env::predecessor_account_id()`. Deposit menutup selisih storage aktual berdasarkan biaya per byte runtime. Kontrak mengembalikan kelebihan deposit dan menolak deposit yang kurang. ID aktif hanya idempoten untuk pemilik dan commitment yang sama. Retry tersebut tidak menambah storage. ID yang dicabut tidak dapat digunakan kembali. `revoke` mengizinkan pemilik record dan idempoten untuk pemilik setelah pencabutan. [Biaya penyimpanan NEAR](https://docs.near.org/smart-contracts/security/storage)

### Aplikasi dan deployment

SPA React/Vite menggunakan NEAR Connect untuk Agency dan Web Crypto untuk SHA-256. `backend/reference.ts` adalah modul browser-safe bersama untuk encoding, parsing, hashing dan verifikasi. `backend/near.ts` membaca `get_reference` menggunakan `finality: final`. API Fastify memberi profil melalui `GET /api/config` serta hasil baca melalui `GET /api/references/:id`. Hasil baca berisi `issuerId`, `commitment`, `revoked`, `blockHeight` dan `blockHash`.

Caddy menyajikan frontend dan proxy API pada satu origin. Docker juri mempublikasikan frontend di loopback. Backend memakai akun sintetis, binary NEAR Sandbox yang dipin, dan WASM kontrak. Rute `/api/demo/*` melakukan mutasi lokal dan memeriksa origin. Backend menyimpan envelope lokal dalam memori untuk retry yang memakai ID yang sama. `compose.vps.yaml` menyajikan browser flow dengan RPC Testnet untuk baca final. Kunci transaksi berada di wallet. `/issue` dan `/api/demo/*` hanya tersedia di Sandbox.

### Urutan dan kriteria penerimaan

| Tahap | Bukti |
| --- | --- |
| P0 · Runtime | Toolchain dan lockfile terpakai. WASM bisa dibangun dan dibaca setelah bootstrap Sandbox. |
| P1 · Registry | Unit test meliputi ownership, deposit dan refund, input, konflik, duplikat, dan pencabutan permanen. |
| P2 · Protokol | Golden vector Unicode identik di Node dan browser. Perubahan payload, issuer mismatch, record hilang, revoke, dan RPC gagal memberi status yang sesuai. Verifikasi mengirim ID saja. |
| P3 · Peran | Uji browser meliputi 360 px, desktop, fokus, Escape dan reduced motion. Wallet fixture menguji pemilihan akun, transaksi issue/revoke, kegagalan dan baca final. Docker menguji issue dan revoke pada WASM sungguhan. |
| P4 · Rilis | Jalankan pemeriksaan README. Setelah persetujuan rilis, rekam hash WASM yang diuji, commit, akun kontrak, transaksi dan blok final untuk bukti Testnet. |

## Post-hackathon

Ruang lingkup lanjutan mencakup inbox permintaan privat, workspace agensi persisten, tim agensi dengan beberapa pengguna, akun freelancer, identitas dan otorisasi produksi, workflow persetujuan dengan database, notifikasi, riwayat dan analitik, SaaS multi-agensi, serta billing dan langganan. Alur persetujuan internal dapat menghubungkan permintaan yang disetujui ke referensi yang sudah terbit.

## Model bisnis

Hipotesisnya adalah **langganan bulanan per workspace agensi**. Freelancer gratis meminta dan membawa referensinya. Perekrut gratis mengecek. Agensi membayar untuk alur persetujuan yang konsisten, akses tim, riwayat penerbitan, dan pencabutan di satu tempat. Biaya gas dan penyimpanan kontrak adalah biaya operasional yang perlu diukur per referensi.

Validasi pemakaian ulang dan kesediaan membayar sebelum implementasi billing. Rekrut agensi melalui pemilik atau manajer operasional yang mengurus freelancer. Ukur berapa proyek yang menghasilkan referensi, waktu permintaan hingga keputusan, proporsi yang diterbitkan, dan apakah agensi memakai EVA lagi pada proyek berikutnya. Minta komitmen bayar dari pengguna yang sudah mengulang alurnya. Harga, paket volume, dan fitur tim mengikuti hasil pilot.

## Konteks hackathon

Track utama adalah Privacy & Private AI. EVA membatasi informasi yang dibagikan dalam satu referensi kerja. Video berbahasa Inggris menunjukkan Agency wallet → issue → `VALID` pada verifier → revoke → `REVOKED` pada URL yang sama, lalu memberi petunjuk Docker. Tampilkan label bukti ketika berpindah sumber. [Aturan NEAR HACKATHON](https://nearhackathon.com/HACKATHON.md)

[Design](design.md) · [Errors](errors.md) · [Operator runbook](operator.md)
