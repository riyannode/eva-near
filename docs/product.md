EVA
Product Requirements Document dan spesifikasi implementasi
Versi 1.0 | 12 November 2026 WIB | Scope disepakati, implementasi belum dimulai

Pembaruan navigasi produk, 13 November 2026

- Halaman utama menyediakan pintu masuk untuk verifikasi link, persiapan permintaan freelancer, dan panduan penerbit. Draft permintaan disalin untuk dikirim melalui kanal agensi yang sudah dipakai. EVA tidak mengirim permintaan.
- `/verify` menerima link utuh dari origin yang sama dan tetap memverifikasi link yang dibuka langsung. Browser mengolah fragment, dan pembacaan status tetap hanya memakai ID.
- `/demo` menampung contoh interaktif berlabel Sample data. Juri yang menjalankan Docker dapat mengikuti penerbitan, verifikasi, dan pencabutan sungguhan melalui `/issue` di Local NEAR Sandbox. AC-01 dan AC-02 mengacu pada layar contoh di `/demo`.
- Publikasi NEAR Testnet memakai kontrak dan issuer yang tercatat di README. Penerbitan Testnet tetap menggunakan CLI operator. Verifikasi dan demo publik tersedia tanpa wallet.

01. Produk dan tesis hackathon

Freelancer yang mengerjakan proyek rahasia sering tidak dapat menunjukkan file, menyebut klien, atau memakai proyek itu sebagai studi kasus. Perekrut tetap perlu sumber yang bisa dimintai pertanggungjawaban untuk satu klaim kontribusi. EVA memberi freelancer sebuah link berisi klaim yang disetujui untuk dibagikan dan ditandatangani agensi yang menangani pekerjaan. Perekrut membuka link tanpa akun dan memeriksa apakah referensinya masih berlaku.

Tesis. Pengalaman kerja bisa diverifikasi dengan membuka satu pernyataan yang diizinkan. Identitas klien dan artefak proyek tetap berada di luar alur produk. NEAR memberi pihak ketiga sumber status pencabutan yang dapat diperiksa selama kontrak dan jaringan tersedia, sekalipun operator CLI sedang offline.

Pitch demo dalam bahasa Inggris.
"Verify the work. Keep the client confidential."
"A recruiter checks one agency-signed contribution while the client and project files stay private."

Pilih track utama 03, Privacy & Private AI, dengan ID `privacy`. Klaim bertanda tangan disimpan bersama pemegang link. Kontrak NEAR mencatat commitment dan status. Aturan Q-010 mengizinkan Testnet. Q-011 mengizinkan kontrak NEAR sendiri yang sesuai track. MVP memakai kontrak registri dan RPC NEAR. AI, TEE, NFT, Chain Signatures, Intents, token, pembayaran dan relayer berada di luar scope. [S1] [S2]

Sinyal masalah berasal dari diskusi freelancer yang kesulitan memakai pekerjaan di bawah NDA dalam portofolio. Pencarian NearHunt menemukan Merit sebagai pembanding dekat. Merit memakai stamp yang mencatat skill dan penerbit di chain. EVA mengesahkan satu klaim kontribusi yang sudah disetujui, lalu membatasi pengungkapan pada isi link. Hasil pencarian terbatas pada katalog dan bukti publik yang diperiksa. Satu pengguna sasaran yang bisa diuji adalah freelancer yang pernah bekerja melalui agensi. [S3] [S4]

Klaim yang dapat diverifikasi. Agensi dengan public key yang dipercaya menandatangani nama atau alias profesional dan kalimat kontribusi. Payload itu cocok dengan catatan yang terdaftar pada kontrak NEAR yang dikonfigurasi, dengan status yang dibaca dari blok final. Perekrut tetap menilai reputasi agensi. Proses pengesahan agensi dan identitas orang yang mengirim link tetap mengandalkan proses perekrutan biasa. Nama atau alias yang ditandatangani mengikat isi referensi ke nama itu, tanpa mengautentikasi pembawa link.

02. Aktor dan lingkup

- Agensi. Satu agensi demo menjadi penerbit dan pencabut. Agensi memastikan sendiri bahwa kalimat referensi telah diizinkan untuk dibagikan. Persetujuan klien terjadi di luar EVA. Semua materi demo memakai identitas dan proyek sintetis.
- Freelancer. Menerima link dan membagikannya dalam alur lamaran yang sudah ada. Siapa pun yang memegang link dapat membaca payload dan meneruskannya.
- Perekrut. Membuka link, melihat kontribusi dan agensi, lalu memeriksa status. Halaman dapat dibuka tanpa akun, wallet atau ekstensi.
- Juri. Bisa memahami satu referensi dalam 5–10 detik, mencoba contoh di frontend, menjalankan alur lengkap di Docker, dan membuka contoh Testnet di VPS.

MVP mencakup penerbitan, pembacaan, verifikasi dan pencabutan. Referensi aktif sampai dicabut. Pencabutan permanen. Perbaikan isi menghasilkan referensi baru dengan ID dan link baru. Rilis ini memakai satu agensi, satu kontrak per lingkungan, dan satu format versi 1. Produk tidak mengelola berkas NDA, bukti kerja, pengiriman email, akun perekrut, pasar kerja, daftar portofolio publik, pembayaran, persetujuan klien dalam aplikasi, atau identitas lintas agensi.

03. Tiga demo dan bukti yang dihasilkan

Mode 1. Contoh di frontend, `/`.
- First screen langsung menampilkan satu klaim sintetis, nama agensi demo, status `VALID` berlabel `Sample data`, dan aksi `Try the demo`. Tiga pilihan `Valid`, `Revoked`, `Edited` mengganti referensi contoh di halaman yang sama. Link README memberi juri jalur ke demo Testnet.
- Contoh memakai payload dan signature sintetis yang sudah dibuat sebelumnya, kunci publik contoh, serta data registri contoh lokal. Jalan verifikasi format, digest dan signature sama dengan produksi. Sumber status diberi label `Sample data`. Gagal memperoleh status Testnet tidak pernah mengalihkan pengguna ke contoh.
- Bukti penerimaan adalah tampilan tiga hasil yang berbeda tanpa wallet atau permintaan RPC. Mode ini menjelaskan produk dan menguji alur verifikasi. Data registri contoh tetap diberi label di layar dan dalam video.

Mode 2. Docker juri, `http://127.0.0.1:8080`.
- Juri menjalankan `docker compose up` dari checkout baru. Buka `/issue`, isi atau pakai contoh, setujui kalimat yang akan dibagikan, lalu klik `Issue reference`. Backend lokal menjalankan NEAR Sandbox dan menginisialisasi kontrak `Reference` dengan agensi sintetis. Link baru muncul setelah transaksi sukses dan record terbaca pada blok final. Buka link di tab lain, lihat `VALID`, kembali ke `/issue`, cabut, lalu muat ulang link dan lihat `REVOKED`.
- Backend memakai WASM kontrak sungguhan, transaksi lokal, dan RPC Sandbox. Akun, saldo, dan kedua jenis kunci demo terbatas pada runtime lokal. Juri tidak memerlukan akun NEAR eksternal, faucet, wallet, atau API key. Build atau pull pertama perlu internet. Uji putus koneksi dilakukan setelah image lengkap tersedia. Data dan link Sandbox bisa hilang ketika backend atau Sandbox dimulai ulang. Compose memberi tahu juri sebelum menerbitkan.
- Catat exit code build, kesiapan kontrak, blok dan receipt lokal, serta bukti tangkapan layar. Tampilkan label `Local NEAR Sandbox` untuk seluruh alur ini. Port backend dan RPC Sandbox tetap privat.

Mode 3. VPS publik, HTTPS dan NEAR Testnet.
- VPS menyediakan halaman contoh dan verifikasi publik. `/verify#r=…` memeriksa data link di browser dan memakai backend untuk membaca NEAR Testnet. Publikasikan di README satu tautan referensi sintetis aktif dan satu yang sudah dicabut. Operator memberi izin publikasi untuk kedua payload itu. Pakai referensi ketiga saat merekam pencabutan agar tautan aktif tetap valid untuk juri. Link tersebut tidak perlu masuk konfigurasi atau log VPS.
- Operator agensi menerbitkan dan mencabut dari CLI di perangkatnya sendiri. VPS memuat konfigurasi publik dan koneksi RPC baca saja. Halaman publik tidak menawarkan form penerbitan atau pencabutan. Rute demo yang memutasi state tidak terdaftar di mode VPS.
- Bukti penerimaan adalah transaksi issue dan revoke yang berhasil di Testnet, hasil baca `final`, konfigurasi issuer yang cocok, serta perubahan status pada URL VPS yang sama. Rekam contract account ID, issuer account ID, transaction hash, block height atau block hash, commit, dan SHA-256 WASM. Publikasikan explorer link yang sudah diperiksa. Label `NEAR Testnet` tampil di halaman.

04. Perjalanan pengguna dan perilaku

FR-01. Agensi menyiapkan `subject` dan `claim`. Contoh sintetis dalam UI adalah `Alex Morgan` dan `Designed the checkout flow for an e-commerce project.` Form menunjukkan teks yang akan masuk ke link. Operator menegaskan bahwa teks itu boleh dibagikan. Agensi yang menulis klaim bertanggung jawab atas isinya. Aplikasi memeriksa format, bukan isi NDA.

FR-02. Penerbitan membuat ID acak dan salt, membentuk payload, menandatanganinya, lalu mencatat commitment. Rute atau CLI menunggu outcome sukses dan membaca kembali record final yang cocok. Di Docker, browser membuat ID acak sekali saat submit agar respons HTTP yang hilang tetap bisa dicoba ulang dengan ID yang sama. Backend menahan satu envelope per ID di memori. Dua klik pada aksi yang sedang berjalan tidak mengirim pekerjaan baru dari UI. Timeout setelah submit menghasilkan `ISSUE_PENDING`. Retry mempertahankan ID, salt, byte payload dan signature.

FR-03. Freelancer menyalin link dari hasil penerbitan. Docker menampilkan `Copy link` dan `Open reference` setelah receipt final. CLI menyimpan link pada file privat yang dipilih operator. Link memakai URL fragment. Browser penerima membaca isi link, melakukan verifikasi lokal dan meminta status dengan ID referensi saja. Link hilang atau rusak menghasilkan layar kesalahan yang jelas dengan tindakan kembali ke demo.

FR-04. Perekrut melihat status setelah cek otomatis ketika membuka link. Satu tombol `Check again` membaca ulang status. Pada halaman yang terbuka, status berlaku untuk pembacaan final terakhir yang dicantumkan. Mulai cek ulang menyembunyikan status lama sampai hasil baru tersedia. Refresh browser membuka kembali alur yang sama.

FR-05. Penerbit bisa mencabut referensi aktif. Konfirmasi menyebut dampaknya dan ID lokal yang dipilih. Pencabutan yang berhasil harus terbaca melalui view final sebelum UI atau CLI melaporkan sukses. Link tetap bisa dibuka dan menampilkan `REVOKED`. Halaman menyembunyikan kartu klaim saat dicabut. Salinan link atau payload yang sudah dibagikan tetap bisa disimpan dan dibaca oleh penerima.

FR-06. Koneksi putus, timeout, respons RPC rusak, atau kontrak yang salah menghasilkan `UNAVAILABLE`. Record yang benar-benar tidak ditemukan setelah view final pada kontrak yang diharapkan, signature palsu, payload rusak, atau commitment berbeda menghasilkan `INVALID`. Browser yang tidak mendukung Ed25519 menerima `UNAVAILABLE` dengan arahan menggunakan browser yang didukung. Jangan tampilkan klaim sebagai sah saat status belum diketahui.

05. Batas data, format referensi dan verifikasi

Nama produk pada UI, repo dan submission adalah EVA. Istilah internal yang dipakai konsisten adalah `Reference` (referensi), `Issuer` (agensi), `Subject` (nama atau alias profesional yang diklaim), `Claim` (satu kalimat yang disetujui), `Commitment` (SHA-256 payload), dan `Reference ID` (ID acak). Nama klien, project slug, file, URL sumber, NDA, email, detail kontrak, dan metadata internal tidak menjadi field. Jangan menyisipkannya dalam claim contoh.

Format v1 dikunci sebagai satu array JSON UTF-8 dengan urutan berikut.

    ["eva:reference:v1", network, contractId, issuerId,
     referenceId, salt, subject, claim]

Baris di atas hanya diagram posisi. Encoder memakai `JSON.stringify` pada array delapan string tanpa spasi tambahan dan `TextEncoder` untuk menghasilkan byte sebenarnya. `network` bernilai `sample`, `sandbox`, atau `testnet` sesuai sumber yang dipilih aplikasi. `contractId` dan `issuerId` harus cocok dengan konfigurasi yang diharapkan. `referenceId` adalah 16 byte CSPRNG, berupa 32 karakter hex huruf kecil. `salt` adalah 32 byte CSPRNG independen, berupa 43 karakter base64url tanpa padding. `subject` wajib 1–80 byte UTF-8 dan `claim` wajib 1–240 byte UTF-8. Form dan CLI menormalisasi NFC, trim dan menolak karakter kontrol, baris baru, karakter pengarah bidi, dan surrogate yang tidak valid. Parser memeriksa aturan yang sama dan menolak teks yang bukan bentuk kanonik. Simpan golden vector Unicode untuk membuktikan byte Node dan browser identik. Format array ini adalah protokol EVA versi 1, dan tidak diklaim sebagai implementasi umum RFC 8785 atau W3C VC.

Algoritme yang digunakan adalah Ed25519, tanda tangan terpisah 64 byte, atas byte payload yang sama. Node memakai `node:crypto` untuk membuat kunci dan menandatangani. Browser memakai `crypto.subtle` untuk memeriksa Ed25519 dan SHA-256. Gunakan public key Ed25519 32 byte dalam base64url tanpa padding. Commitment adalah digest SHA-256 payload dalam 64 karakter hex huruf kecil. NEAR transaction key adalah kunci terpisah. Kunci transaksi tidak pernah dipakai untuk menandatangani payload EVA. Signature referensi bukan NEP-413 karena alurnya tidak memakai wallet login. [S5] [S6]

    /verify#r=<base64url(payloadBytes)>.<base64url(signatureBytes)>

Batasi bagian `r` hingga 2048 karakter ASCII. Terima tepat satu `r`, satu pemisah titik, alphabet base64url dan bentuk tanpa padding yang kanonik. Tolak UTF-8 yang rusak dan byte payload yang tidak sama dengan hasil encoding ulang setelah parsing. Jangan membaca URL, API endpoint, display name issuer, atau trust key dari payload sebagai konfigurasi. Mode sample memakai konfigurasi contoh yang dikemas, bukan input pengguna. Verifier live mendapat profil dari origin aplikasi yang dikonfigurasi dan membandingkannya dengan hasil kontrak.

Urutan verifikasi browser.
1. Parse fragment dan cek versi, panjang, bentuk dan field. Cocokkan network, contract ID, dan issuer ID dengan profil tepercaya dari mode aktif.
2. Baca `GET /api/references/<referenceId>` pada origin yang sama untuk Sandbox dan Testnet. Sumber sample mengambil record dari data contoh lokal. Jangan kirim fragment, signature, salt, nama, atau claim dalam permintaan status.
3. Cocokkan issuer pada hasil kontrak, pastikan bentuk public key sesuai dan hitung commitment dari byte asli. Verifikasi signature dengan public key issuer yang dicatat oleh kontrak yang sudah dipilih. Abaikan konfigurasi yang datang dari link. Tampilkan `VALID` hanya jika semua pemeriksaan lolos dan record aktif.
4. Jika seluruh pemeriksaan integritas lolos tetapi record dicabut, tampilkan `REVOKED`. Jika isi diubah, tampilkan `INVALID` sekalipun ID merujuk pada record yang sudah dicabut. Kegagalan RPC atau respons yang tidak sah tampil sebagai `UNAVAILABLE`. Selalu tampilkan sumber bukti.

Fragment tidak dikirim browser dalam permintaan HTTP normal. Link tetap dapat terlihat oleh pemegangnya, riwayat browser, aplikasi yang menerima link, dan ekstensi browser. Base64url adalah encoding. Kerahasiaan klien berasal dari data minimization dan kebijakan agensi, bukan enkripsi link. Commitment disalt untuk mempersulit tebakan dari data publik. ID, digest, waktu transaksi, akun issuer dan metadata chain bersifat publik. Browser mempercayai origin verifier dan respons dari RPC yang dikonfigurasi. Untuk rilis demo, sajikan URL dari origin resmi repo, dan sediakan langkah baca kontrak secara independen di README. [S7] [S8]

06. Smart contract `Reference`

Rust crate `reference`, file `backend/contract/src/lib.rs`, artifact `reference.wasm`. Akun deployment Testnet diisi oleh operator ketika disiapkan dan dicatat di README setelah diverifikasi. Pakai `cargo near new` dari `backend/` untuk menghasilkan folder `contract/`. Jalankan scaffold pada tahap implementasi. Susun file hasil scaffold agar hanya ada `backend/`, `frontend/`, dan `docs/` di root. NEAR mendokumentasikan React/Vite sebagai opsi dApp dan Rust sebagai opsi kontrak. Frontend EVA tidak memerlukan wallet connector. [S9] [S10]

State v1 memakai `#[near(contract_state)]`, `PanicOnDefault`, tipe `AccountId`, `near_sdk::store::LookupMap` dengan prefix stabil, dan Borsh untuk penyimpanan. Simpan `issuer_id`, raw Ed25519 `issuer_key`, `issued_count`, serta satu `LookupMap<[u8; 16], Record>`. `Record` menyimpan commitment 32 byte dan satu flag `revoked`. Referensi yang dicabut tetap mengisi cap. JSON hanya untuk interface eksternal. Gunakan `overflow-checks = true` pada profil release dan operasi hitung yang diperiksa. Payload dan public display name tidak masuk kontrak.

Interface kontrak.

    init(issuer_id, issuer_key) -> Reference
    issue(reference_id, commitment) -> "ISSUED" | "UNCHANGED"
    revoke(reference_id) -> "REVOKED" | "UNCHANGED"
    get_reference(reference_id) -> {
      issuer_id, issuer_key, record: null | { commitment, revoked }
    }

`issuer_key` pada JSON memakai representasi base64url di bagian 05. `reference_id` dan `commitment` pada interface publik memakai hex lowercase. Semua metode menolak argumen format salah. `init` hanya sekali melalui `#[init]` dengan `predecessor_account_id() == current_account_id()`. Deployment Testnet sebaiknya memasang WASM dan memanggil init dalam transaksi akun kontrak yang sama. Deployment Sandbox mengikuti aturan yang sama. Tanda tangan transaksi dan hash dicek pada release penerimaan. [S11] [S12]

`issue` dan `revoke` hanya menerima `predecessor_account_id() == issuer_id`. Keduanya tanpa `#[payable]` dan memakai deposit 0. Penerbit memakai function-call key yang dibatasi ke akun kontrak dan dua nama metode itu. Akun kontrak membiayai storage dari saldo yang disiapkan saat provisioning. Batas tetap 1024 ID per deployment. Ukur ukuran per record dan biaya storage pada konfigurasi release. Operator mendanai ruang yang direncanakan dan menyimpan margin sebelum membuka demo. Issuer tunggal mencegah publik mengisi storage. [S11] [S12]

Transisi state.

    Tidak ada record + issue valid   -> aktif, issued_count naik satu
    Aktif + issue dengan hash sama   -> UNCHANGED, state sama
    Aktif + issue dengan hash lain   -> REFERENCE_CONFLICT, state sama
    Aktif + revoke                   -> dicabut
    Dicabut + revoke                 -> UNCHANGED, state sama
    Dicabut + issue                  -> REFERENCE_REVOKED, state sama
    Tidak ada record + revoke        -> REFERENCE_NOT_FOUND, state sama
    Cap tercapai + ID baru           -> CAP_REACHED, state sama

Validasi akses dan input sebelum write. Pencabutan bersifat monoton. Tidak ada transfer dana, daftar referensi, admin method untuk menimpa record, callback, maupun cross-contract call. Code deploy key menjadi bagian dari asumsi kepercayaan operasional. Simpan full-access key akun kontrak di luar VPS dan operator harian. Jika kunci payload hilang, referensi yang sudah ada tetap bisa diverifikasi dan issuer masih bisa mencabut jika akses transaksi tersedia. Untuk rotasi kunci payload atau pergantian kontrak, siapkan deployment baru. Pertahankan profil baca deployment lama selama tautannya masih harus berfungsi. MVP mengandalkan satu profil per origin. Catat pemisahan ini di runbook rilis.

07. Aplikasi, interface HTTP dan file

Frontend adalah SPA React/Vite yang disajikan oleh Caddy. Backend Fastify mengurus pembacaan NEAR serta penerbitan lokal khusus mode juri. Caddy meneruskan prefix `/api/` ke backend tanpa menghapus prefix. Frontend dan backend satu origin untuk browser. `/` dan `/verify` tersedia di kedua Compose. Caddy memakai konfigurasi mode dari Compose untuk menyajikan `/issue` di Sandbox dan mengembalikan 404 di VPS. Tidak perlu router library. Gunakan pathname eksplisit dan fallback HTML terbatas pada rute UI yang dikenal. Rute API yang tidak dikenal mengembalikan 404 JSON.

`backend/reference.ts` berisi encoder, parser, digest, aturan format, tipe dan verifikasi browser-safe. Ekspor sebagai subpath workspace `@eva/backend/reference`. Frontend mengimpor subpath ini saja. Modul tersebut memakai API Web standar, tanpa `node:` atau import server. Tanda tangan privat dan penyimpanan file operator berada di `issuer.ts` dan `cli.ts`. Pertahankan satu implementasi aturan dan encoder. Uji kompatibilitas dengan golden vector yang sama. Build output frontend tidak berisi signer, environment key, dependensi Sandbox, atau rute tulis server.

`backend/near.ts` berisi pembuatan `JsonRpcProvider`, pembacaan `get_reference`, decode serta validasi hasil, dan transaksi berwenang untuk adapter lokal atau CLI. `near-api-js` 7.5.3 membedakan view `provider.callFunctionRaw({contractId, method, args, blockQuery:{finality:'final'}})` dan transaksi `Account.callFunctionRaw({contractId, methodName, args, deposit:0n, gas, waitUntil:'FINAL'})`. Periksa status transaksi dan receipt, lalu cocokkan hasil baca final. Jangan menganggap promise resolve berarti transaksi sukses. Buktikan bentuk tipe dari package yang terkunci dan pastikan deadline transport tanpa retry tak terbatas. [S8] [S13]

Interface HTTP v1. `network` adalah `sandbox` atau `testnet` pada backend. `sample` dipilih oleh frontend secara lokal. Gunakan `Cache-Control: no-store` untuk semua respons API. Batasi request body JSON maksimum 2 KiB. Nonaktifkan coercion dan penghapusan field ekstra pada validasi schema. Status code berikut berlaku juga untuk JSON parser, timeout dan rute yang salah.

    GET /api/config
    200 { network, contractId, issuerId, issuerLabel, canIssue }

    GET /api/references/:id
    200 { issuerId, issuerKey, commitment, revoked, blockHeight, blockHash }
    400 INVALID_INPUT | 404 REFERENCE_NOT_FOUND | 503 UNAVAILABLE

    GET /api/health
    200 { ok: true }                     Proses HTTP hidup.

    GET /api/ready
    200 { ready: true }                  Profil kontrak, issuer dan view final cocok.
    503 { code: "UNAVAILABLE" }         Dependensi belum siap atau gagal.

    POST /api/demo/references            Sandbox saja
    body { referenceId, subject, claim, approved: true }
    201 { referenceId, link }            Hasil final, link hanya dikirim ke browser lokal.
    202 { code: "ISSUE_PENDING", referenceId }
    400 INVALID_INPUT | 403 FORBIDDEN | 409 REFERENCE_CONFLICT, REFERENCE_REVOKED, or CAP_REACHED | 503 UNAVAILABLE

    GET /api/demo/references/:id         Sandbox saja, tindak lanjut penerbitan
    200 { referenceId, link }            Intent lokal ditemukan dan record final cocok.
    202 { code: "ISSUE_PENDING", referenceId }
    404 REFERENCE_NOT_FOUND | 503 UNAVAILABLE

    POST /api/demo/references/:id/revoke Sandbox saja, konfirmasi di UI
    200 { referenceId, revoked: true }
    202 { code: "REVOKE_PENDING", referenceId }
    400 INVALID_INPUT | 403 FORBIDDEN | 404 REFERENCE_NOT_FOUND | 503 UNAVAILABLE

Rute demo menerima Host loopback yang dikonfigurasi. Write meminta JSON dan menolak origin asing. Aksi `Check status` untuk issue memakai GET demo. Untuk revoke, gunakan GET status biasa. Jika penerbitan tetap pending atau respons hilang, `Retry same reference` mengirim kembali body asli dan ID yang sama. Backend menyimpan envelope per ID di memori, menolak isi berbeda untuk ID yang sama, dan memakai satu proses transaksi aktif per ID. Batasi jumlah intent sesuai cap. Baca status final sebelum retry. CLI menyimpan envelope pending pada file privat operator sebelum broadcast. Ulangi `issue` hanya melalui `resume` dengan file pending yang sama. Jika digest dari record berbeda, hentikan. Untuk revoke yang belum pasti, lakukan view final sebelum mengirim retry. CLI melaporkan status dan transaksi, tanpa menulis seluruh link ke log atau stdout.

Susunan root yang diharapkan. Baris berikut menetapkan nama file utama. File config standar dari scaffold boleh dipertahankan jika masih dipakai. Artefak build dan hasil test dikecualikan dari source control.

    eva/
      AGENTS.md
      README.md
      LICENSE
      compose.yaml
      compose.vps.yaml
      package.json
      pnpm-workspace.yaml
      pnpm-lock.yaml
      rust-toolchain.toml
      .env.example
      .gitignore
      .dockerignore
      backend/
        Dockerfile
        package.json
        tsconfig.json
        server.ts
        near.ts
        reference.ts
        issuer.ts
        cli.ts
        sandbox.ts
        reference.test.ts
        contract/
          Cargo.toml
          Cargo.lock
          src/lib.rs
      frontend/
        Dockerfile
        Caddyfile
        package.json
        tsconfig.json
        vite.config.ts
        index.html
        src/main.tsx
        src/Demo.tsx
        src/Verify.tsx
        src/Issue.tsx
        src/demo.json
        src/style.css
        tests/demo.spec.ts
      docs/
        product.md
        design.md
        errors.md

`docs/product.md` menampung spesifikasi utama PRD ini. Bagian terakhir file ini menyediakan isi untuk dua dokumen lain dan `AGENTS.md`. Tidak perlu direktori helper, shared, services atau scripts di root. `server.ts` menyusun rute dan readiness. `near.ts` mengisolasi asumsi RPC dan outcome transaksi. `reference.ts` mengisolasi format kanonik dan hasil verifier. `issuer.ts` mengelola penerbitan, signature dan pemulihan retry. `sandbox.ts` menjalankan node, deploy dan init secara lokal. `cli.ts` menghubungkan operator dan `issuer.ts`. Ketika suatu fungsi cukup satu panggilan tanpa aturan tambahan, panggil langsung dari pemiliknya. Interface publik adalah permukaan uji, bukan detail fungsi privat.

08. Stack dan versi yang diperiksa

Snapshot stabil diperiksa 12 November 2026. Pin versi langsung pada manifest, commit lockfile, dan pin base image serta binary dengan digest atau checksum sebelum acceptance. Versi yang terbit dan bentuk API yang dibaca bukan bukti paket sudah berjalan bersama di EVA. Langkah P0 membuktikan kompatibilitas pada image yang ditetapkan.

    Komponen                              Pin rencana
    Node.js LTS                           26.13.1
    pnpm                                  12.18.0
    TypeScript                            7.0.2
    React / react-dom                     19.3.1 / 19.3.1
    Vite / @vitejs/plugin-react           8.3.8 / 6.3.0
    Fastify                               5.12.8
    near-api-js                           7.5.3
    near-sandbox / nearcore Sandbox       0.3.5 / 2.14.0
    Rust stable / near-sdk Rust           1.99.1 / 5.30.1
    cargo-near / near-cli-rs              0.23.0 / 0.31.1
    Playwright / Oxlint                   1.65.0 / 1.93.0
    Caddy / Docker Compose referensi      2.11.9 / 5.7.1

Gunakan Node LTS yang memenuhi minimum Node 22.22.2 pada near-api-js dan near-sandbox. Backend menjalankan TypeScript yang dapat dihapus tipenya oleh Node, dengan `strict`, `noEmit`, `erasableSyntaxOnly` dan import ESM eksplisit. Jalankan `tsc` terpisah karena Node tidak memeriksa tipe. Frontend memakai React, Vite, dan CSS standar. Caddy melayani aset statis. Dokumen runtime Node, metadata npm, release Rust dan registry crate adalah sumber pin di atas. [S13] [S14] [S15] [S16]

`near-sandbox@0.3.5` dipilih langsung. Default paketnya memakai nearcore 2.14.0. SDK Rust 5.30 memerlukan host function nearcore 2.14/protokol 87 atau lebih baru. `near-workspaces@5.0.0` masih membawa rentang `near-sandbox:^0.1.1`, sehingga dependensi itu tidak dipakai untuk startup. `Sandbox.start`, akun genesis lokal, dan near-api-js cukup untuk deploy, init, call dan view. Gunakan binary dari rilis resmi dan `NEAR_SANDBOX_BIN_PATH` yang menunjuk ke salinan di image. Buktikan pemilihan binary saat build dan boot tanpa unduhan. `linux/amd64` adalah platform penerimaan pertama. Uji ARM64 sebelum mencantumkannya sebagai dukungan Docker EVA. [S10] [S17] [S18]

09. Docker juri, VPS dan runbook operator

Compose juri. `compose.yaml` berjalan dari root, tanpa .env wajib. Backend menjalankan target build `judge` dan frontend menjalankan Caddy. Publish hanya `127.0.0.1:8080` dari frontend. Backend mendengarkan port internal Compose, RPC Sandbox mendengarkan loopback dalam kontainer backend. Build image menyiapkan deps terkunci, binary Sandbox 2.14.0 serta WASM. Sandbox dan deploy/init dikerjakan saat runtime dengan direktori sementara dan akun sintetis. Backend menjadi ready setelah RPC, deploy, init dan view final tervalidasi. Healthcheck dan `depends_on: condition: service_healthy` memastikan frontend mulai setelah backend ready. Ketika start gagal, tampilkan failure yang jelas pada log tanpa mengeluarkan kunci. Jangan mendeteksi kegagalan sebagai izin berpindah ke Testnet. [S17] [S19]

    docker compose up
    docker compose ps
    docker compose down

Alur offline pada image yang sudah dimuat harus diuji dengan akses eksternal dinonaktifkan dan loopback serta komunikasi Compose tetap berfungsi. First run dari source perlu internet untuk image dasar, dependency package dan binary yang dipin. Catat prosedur pengujian offline dan konfigurasi host yang dipakai. Stop menutup child Sandbox dan membersihkan direktori milik proses. Tidak ada volume produk yang perlu dihapus untuk reset. Dokumentasikan bahwa sesi restart membuat ID lama hilang. Gunakan port alternatif hanya jika 8080 dipakai dan sinkronkan origin publik lokal yang sah.

Compose VPS. `compose.vps.yaml` adalah file mandiri. Build backend target `server` tanpa binary Sandbox atau konfigurasi issuer privat. Jalankan dengan `docker compose -f compose.vps.yaml up -d --build` setelah konfigurasi publik, domain dan izin deploy tersedia. Caddy dalam kontainer menyajikan SPA dan proxy API. Sajikan contoh frontend walaupun readiness RPC sedang gagal. Verifier live tetap memerlukan pembacaan final. Publish frontend di loopback VPS. Reverse proxy yang sudah ditentukan untuk domain meneruskan HTTPS ke frontend loopback. Lokasi dan pengaturan reverse proxy mengikuti host aktual saat deploy disetujui. Jalankan non-root di container runtime dan beri write access hanya pada path yang diperlukan. Gunakan pembatasan restart atau observasi fail-fast saat config salah. Tidak perlu database, volume data, container blockchain atau signer pada VPS.

Konfigurasi VPS minimum. `NEAR_RPC_URL`, `NEAR_CONTRACT_ID`, `NEAR_ISSUER_ID`, `ISSUER_LABEL`, `PUBLIC_ORIGIN` dan `APP_MODE=testnet`. `.env.example` hanya memakai nama variabel dan contoh nilai yang jelas bertanda placeholder. `PUBLIC_ORIGIN` adalah HTTPS. Backend memeriksa identitas jaringan `testnet`, validitas account ID, kesesuaian issuer dari kontrak, bentuk public key, dan HTTPS provider yang operator pilih. RPC berasal dari konfigurasi operator. Pemeriksaan baca `/status` pada 12 November 2026 mendapati endpoint Testnet NEAR dan FastNEAR melaporkan `testnet`, nearcore 2.14.1, protokol 88. Ulangi pengecekan saat provisioning. Pembacaan yang gagal mengembalikan status `UNAVAILABLE`. [S8]

Operasional VPS. Pakai satu domain, TLS, pemeriksaan liveness dan readiness, serta timeout request RPC yang dibatasi. Budget cek UI 8 detik sebelum menampilkan aksi retry. Log metadata minimum berupa kode error, mode, dan durasi. Hindari access log request path berisi ID, request body, dan URL share. Konfigurasi verifikasi memakai `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, CSP `default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` dan tanpa analytics atau script pihak ketiga. Serve media, CSS dan font dari origin sendiri. Terapkan `X-Content-Type-Options: nosniff`. Batasi ukuran body dan durasi koneksi. Format dan render klaim sebagai teks React. Hash aset Vite boleh dicache. Setelah deploy, catat commit dan digest image, uji URL publik dan alur Testnet, dan periksa akses `/issue` serta endpoint mutasi. Rollback aplikasi dengan image release sebelumnya yang kompatibel dengan format v1. Kontrak dan data referensi tidak diganti ketika rollback image.

CLI operator. Skrip `backend/cli.ts` memberikan `issue`, `resume`, dan `revoke`. Perintah paket yang akan disediakan adalah `pnpm --filter @eva/backend run reference issue <request-file> <output-file>`, `… run reference resume <pending-file> <output-file>`, dan `… run reference revoke <reference-id>`. Request file berisi `subject`, `claim`, dan `approved: true`. Sebelum transaksi, CLI memvalidasi profil, public key payload yang terdaftar, dan akses transaksi issuer. Simpan private key payload dalam PKCS#8 melalui mekanisme penyimpanan privat operator. Simpan access key NEAR yang dibatasi pada `issue,revoke` di perangkat operator. Path kunci diberikan lewat `ISSUER_KEY_FILE` dan `NEAR_TX_KEY_FILE` hanya pada perangkat operator. Gunakan izin file terbatas pada OS-nya. Rilis dokumen menjelaskan pembuatan akun dan scoped key melalui `near-cli-rs`, pengecekan allowance, funding storage, dan cara memulihkan status dari receipt. `near` dipakai untuk provisioning dan inspeksi. Operasi sehari-hari memakai CLI EVA agar payload dan commitment konsisten. [S5] [S11] [S20]

Identitas WASM release. Build artifact terkunci dengan `cargo near build non-reproducible-wasm --locked` di builder yang dipin. Salin `reference.wasm` yang sama dari image juri release untuk deploy Testnet dan catat SHA-256 kedua salinan. Rebuild source dari commit yang sama tetap harus lulus smoke test. Kesetaraan byte hanya dilaporkan untuk artifact dengan checksum yang benar-benar sama, bukan berdasarkan nama atau commit saja.

10. Urutan implementasi dan bukti selesai

P0. Scaffold dan kompatibilitas. Buat struktur tiga folder, generate kontrak dengan cargo-near, pin dependency, toolchain, base image dan binary. Build WASM, boot Sandbox dengan binary di image, deploy dan init melalui API yang dipilih, lalu baca view final. Rekam versi aktual dan hasil. Jika browser target atau SDK gagal, pilih patch stabil yang lulus dan dokumentasikan perubahan dari snapshot sebelum lanjut.

P1. Kontrak. Buat state machine di bagian 06, lock issuer, validasi format, cap dan state transitions. Gunakan test Rust untuk invariant penting dan integrasi pada Sandbox. Selesai bila pihak asing gagal issue/revoke, pencabutan permanen, retry tidak mengubah count, serta view mengembalikan issuer dan record yang benar.

P2. Referensi dan operator. Buat encoder, parser, signature/digest, penerbitan, retry dan rute baca. Selesai bila golden vector Node/browser sama, satu byte yang diubah gagal, sumber salah ditolak, dan timeout bisa diperiksa ulang tanpa membuat ID kedua.

P3. Pengalaman juri. Implementasi contoh frontend, verifier, form lokal, dan pencabutan. Selesai bila pembaca baru memahami klaim dan apa yang dirahasiakan dari layar pertama serta dapat mengikuti skenario Docker tanpa bantuan. Periksa served preview, mobile dan keyboard.

P4. Bukti rilis. Uji `docker compose up` dari clean checkout, uji runtime offline dari image yang disiapkan, lalu validasi VPS dan Testnet setelah tindakan eksternal disetujui. Pakai satu checklist `do X, see Y` di README. Selesai ketika bukti di bagian 11 tersedia dan tiap demo berlabel sumber yang benar.

11. Kriteria penerimaan

AC-01. Pengguna baru di halaman `/` bisa menyebut kontribusi, siapa penerbitnya, dan apa yang dirahasiakan setelah 5–10 detik tanpa bantuan. Uji minimal tiga pembaca. Rekam jawaban dan waktu. Penilaian UX ini terpisah dari pengukuran latency RPC.

AC-02. Browser menampilkan `VALID`, `REVOKED`, dan `INVALID` untuk tiga contoh lokal. Data contoh tidak menghasilkan permintaan RPC. Pakai golden vector dengan Unicode dan uji perubahan pada subject, claim, signature, salt, ID, network, serta kontrak. Payload palsu atau tidak kanonik gagal. Kegagalan satu field tidak boleh menampilkan klaim sebagai valid.

AC-03. `docker compose up` pada `linux/amd64` menghasilkan frontend siap dan kontrak yang bisa dibaca. Juri tanpa akun eksternal dapat issue, membuka link, revoke, lalu refresh. Simpan receipt Sandbox yang menunjuk perubahan state pada WASM yang dipin. Ulangi dengan jaringan eksternal dimatikan setelah image siap.

AC-04. Kontrak menguji init hanya sekali dan dari akun kontrak, predecessor asing ditolak, duplikat digest yang sama aman, digest berbeda ditolak, pencabutan permanen dan idempotent, cap tidak bisa dilewati, input panjang salah ditolak, dan deposit nonnol gagal. Lakukan setidaknya satu uji negatif signer/predecessor dengan konteks berbeda. Biaya storage yang terukur dan saldo kontrak dicatat sebelum demo Testnet.

AC-05. Verifier menolak paket milik issuer, kontrak atau network lain. Signature harus cocok dengan public key on-chain yang diharapkan. Status `VALID` mensyaratkan record yang cocok dari pembacaan final. Putuskan RPC dan lihat `UNAVAILABLE`. Record yang benar-benar hilang dari kontrak yang siap menghasilkan `INVALID`. UI tidak menukar sumber status.

AC-06. Pemeriksaan request browser dan log membuktikan bahwa HTTP verifikasi hanya meminta ID acak. Tidak ada nama, klaim, signature, salt, fragment atau private key pada request maupun log VPS. Pemeriksaan chain mengonfirmasi transaksi hanya membawa ID, commitment, dan metadata yang ditentukan kontrak. Pengujian ini memakai data sintetis.

AC-07. Pada viewport 360 px dan desktop, halaman tidak overflow dan status terbaca tanpa mengandalkan warna. Fokus terlihat, tombol dapat dioperasikan dengan keyboard, error dapat diumumkan lewat status aksesibel, dan opsi reduced motion berfungsi. Uji Chromium, Firefox, dan WebKit dengan Web Crypto aktif. Cek demo HTTPS serta loopback. Jika browser menolak API crypto, hasilnya `UNAVAILABLE`.

AC-08. Pada VPS, `/verify` dapat dibuka tanpa wallet atau login. Dashboard dan mutasi khusus juri mengembalikan 404. Image VPS dan konfigurasi runtime tidak mengandung kunci privat operator atau runner Sandbox. Issue dan revoke Testnet sungguhan memindahkan status dari `VALID` ke `REVOKED` pada link yang sama. Simpan hash dan baca final yang mendukung klaim ini. Deploy produksi dan Testnet masih merupakan langkah mendatang pada PRD ini.

AC-09. Buat cek yang dapat diulang melalui `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `cargo fmt --check`, `cargo clippy`, `cargo test --locked`, dan build WASM. Root scripts memanggil cek workspace yang relevan. Uji Compose dengan kedua file `docker compose config`. Tulis exit code dan limit pengujian dalam catatan review. Jalankan pemeriksaan tampilan pada server yang benar-benar menyajikan build itu. Pengujian Testnet dan VPS dicatat terpisah dari fixture dan Sandbox.

12. Submission dan demo video

Lampiran `HACKATHON (1).md` cocok dengan versi resmi saat isi teks dibandingkan setelah normalisasi baris dan whitespace tepi pada 12 November 2026 WIB. Baca versi resmi kembali sebelum submit. Deadline 14 November 2026 pukul 23.59 UTC atau 15 November pukul 06.59 WIB. Jadikan repo publik sebelum batas tersebut dan sertakan `LICENSE`. Gunakan MIT jika pemilik memilihnya. Dokumentasikan kode baseline, library/template, bagian NEAR yang dibuat dalam window resmi, dan proyek lain jika aturan Q-015 berlaku. Gunakan repo dan aset yang ditetapkan untuk proyek ini. [S1]

Video pendek berbahasa Inggris. Detik 0–5 buka referensi dan tampilkan satu klaim yang disahkan agensi. Detik 5–10 tunjukkan `NEAR Testnet` dan status. Tunjukkan nama klien serta artefak tidak menjadi bagian referensi dengan menjelaskan data yang memang dibagikan. Lalu perlihatkan transaksi pencabutan untuk link ketiga dan refresh hingga `REVOKED`. Akhiri dengan instruksi Docker di README. Tampilkan label jelas ketika pindah dari Testnet ke Sandbox. Pakai video supaya alur tetap dapat dinilai jika URL publik tidak terbuka. [S1]

README untuk juri menggunakan tiga bagian `do X, see Y`: buka contoh browser, jalankan Docker, buka link Testnet. Sertakan versi, sumber status, batas kepercayaan agensi, kontrak Testnet yang telah diuji, explorer links, checksum release, dan troubleshooting ringkas. Jadwalkan VPS tersedia selama penjurian dan idealnya sampai 25 November sesuai panduan. [S1]

Pemilik menayangkan post publik di X dengan `@NEARProtocol` dan `#NEARHackathon`, lalu mengirim satu submission yang menyertakan URL repo publik dan URL post. Gunakan form resmi atau prosedur API dari dokumen resmi. Data tim, account payout, link akhir, serta consent berasal dari pemilik. Untuk pengiriman API, minta persetujuan atas payload final dan gunakan requestId yang sama saat retry yang didukung. Koreksi submission yang sudah tersimpan menggunakan halaman request changes. Lampiran menetapkan persyaratan event. Permintaan saat ini memberi izin untuk menulis PRD. Deployment, publikasi, transaksi dan submission mengikuti persetujuan terpisah. [S1]

13. Isi `docs/design.md`

# Design

## First screen

EVA memakai tampilan seperti surat referensi singkat. Di atas fold, urutkan konten seperti ini.

1. `EVA` dan label sumber yang sesuai.
2. Kalimat `Verify the work. Keep the client confidential.` pada halaman demo. Pada link langsung, utamakan heading `Work reference`.
3. Satu kartu berisi claim dalam ukuran teks paling jelas, subject, dan `Signed by Studio A` pada contoh. Tampilkan status di dekat tanda tangan. Nama agensi berasal dari profil aplikasi yang sudah cocok dengan chain.
4. Baris `Client name and project files are kept private.` Sertakan `Try the demo` pada halaman awal atau `Check again` pada verifier.

UI dan demo berbahasa Inggris. Judul, claim, status dan sumber bukti muat di viewport mobile. Pemeriksaan teknis lengkap berada di disclosure `Verification details`. Di sana tampilkan network, contract ID dan hasil baca final jika ada. Gunakan explorer link hanya untuk bukti sintetis Testnet yang sudah diverifikasi. Jangan menampilkan salt, signature, fragment atau payload mentah dalam UI umum.

## Screens

- `/` menampilkan contoh valid langsung dari data contoh lokal dan satu aksi utama. Tiga pilihan contoh mempunyai label teks. Demo Testnet bisa dibuka melalui link di README. Mode juri lokal mendapat link `Issue a reference`.
- `/verify` memeriksa secara otomatis saat link dibuka. Klaim yang belum terverifikasi tidak dipasang sebagai bukti. Tampilkan label sumber dan teks hasil. `Check again` tersedia untuk live dan Sandbox. Jika hash fragment hilang, arahkan kembali ke demo dengan pesan yang menjelaskan link tidak lengkap.
- `/issue` hanya tersedia di Docker juri. Dua field, preview teks yang dibagikan, satu persetujuan eksplisit dan satu tombol submit. Pada hasil final tampilkan `Copy link`, `Open reference` dan `Revoke`. Konfirmasi pencabutan menggunakan dialog dengan fokus awal pada aksi aman. Selama pending tampilkan `Check status` dan pertahankan ID yang sama. Setelah pencabutan, fokus kembali ke status referensi.

## Status copy

| Status | Copy | Action |
| --- | --- | --- |
| Checking | Checking the reference… | Keep the card area stable |
| VALID | Reference verified | Check again |
| REVOKED | The agency revoked this reference | Check again |
| INVALID | This link could not be verified | Open the original link or return to the demo |
| UNAVAILABLE | Verification is unavailable right now | Try again |
| Issue pending | Waiting for NEAR to confirm this reference | Check status |
| Revoke pending | Waiting for NEAR to confirm revocation | Check status |

Teks penyebab khusus di `errors.md`. Jangan memakai banner gagal merah untuk status checking atau pemutusan koneksi yang bisa diulang. `VALID` memerlukan hasil nyata dari sumber yang terlihat. Status dibaca melalui teks dan ikon dekoratif yang memiliki `aria-hidden`, bukan warna saja. Sebelum hasil valid, gunakan ruang tetap dengan placeholder singkat agar kartu tidak meloncat.

## Layout and interaction

- Gunakan Inter jika font dan lisensinya tersedia untuk self-host. Cadangan system sans. Aksen monospace hanya untuk ID atau angka blok. Tidak perlu font jaringan agar Docker bisa offline.
- Dasar warna `#F7F7F4`, surface `#FFFFFF`, teks `#18211E`, teks sekunder `#46534D`, border `#D8DFDA`, aksen `#075444`. Cek kontras pasangan aktual, termasuk label kecil, outline dan semua status. Gunakan satu aksen serta latar tenang.
- Lebar kartu sekitar 640 px, padding 24–32 px pada desktop dan 16 px pada layar sempit. Gunakan skala jarak 4/8/12/16/24/32 px. Heading claim menyesuaikan dengan `clamp` dan dapat membungkus teks panjang. Target tombol sekurang-kurangnya 44 px. Detail teknis menggunakan wrap dan copy yang terarah.
- Pakai tombol HTML, label eksplisit, outline fokus yang terlihat dan dialog dengan penanganan Escape serta pengembalian fokus. Gunakan `aria-live="polite"` untuk status async dan hubungan label/error yang tepat pada field. Klik `Copy link` menampilkan konfirmasi singkat di dekat tombol tanpa memindahkan fokus. Jika clipboard tidak tersedia, sediakan input readonly yang mudah disalin.
- Terapkan prinsip Emil Kowalski untuk feedback yang pendek. Gunakan `transform: scale(0.97)` pada press pointer jika sesuai. Durasi 120–160 ms dan `cubic-bezier(0.23, 1, 0.32, 1)` untuk feedback. Dialog sesekali 160–220 ms dengan opacity dan skala dari 0.97. Status yang sering diperiksa tampil langsung atau memakai perubahan opacity singkat. Navigasi keyboard memberi hasil tanpa menunggu animasi.
- Untuk `prefers-reduced-motion: reduce`, hilangkan pergeseran dan skala. Feedback teks tetap tampil. Batasi hover ke perangkat dengan pointer yang mendukung. Jangan animasikan tinggi kartu atau menunda tampilan hasil demi motion. Hindari background animasi, transisi halaman dan library motion di MVP.

## Review UI

Periksa served build pada desktop, lebar 360 px, keyboard dan reduced motion. Uji status loading, RPC lambat, error, pencabutan dan link rusak. Saat meninjau perubahan UI, laporkan temuan sebagai tabel `Before | After | Why` sesuai skill design. Catat bagian yang benar-benar dilihat atau diuji.

14. Isi `AGENTS.md`

# EVA

EVA menerbitkan referensi kontribusi yang disahkan agensi untuk proyek rahasia. `backend/`, `frontend/`, dan `docs/` adalah tiga folder tingkat atas. Gunakan nama domain `reference`, `issuer`, `claim` dan `commitment` saat menamai file serta fungsi.

## Read before changing

- Product, wire format, contract, Docker or release changes → `docs/product.md`. Jalankan acceptance yang terdampak dan sebutkan mode buktinya.
- UI, copy, keyboard, or motion changes → `docs/design.md`. Periksa build yang sedang disajikan.
- New failures, RPC mapping, or status changes → `docs/errors.md`. Perbarui kode dan pesan pada dokumen itu.

## Work

1. Nyatakan asumsi yang memengaruhi perilaku dan target yang bisa diperiksa. Ambil pekerjaan terkecil yang mengubah hasil untuk pengguna. Gunakan urutan P0–P4 di `docs/product.md` untuk pekerjaan lintas sesi.
2. Baca pemanggil dan invariant modul yang disentuh. Pertahankan kontrak publik dan data yang sudah diterbitkan. Tempatkan validasi format dalam modul reference, kebijakan issuer dalam modul penerbitan dan kontrak, dan akses RPC dalam modul near. Uji melalui interface yang dipakai pemanggil.
3. Pakai API standar sebelum menambah dependency. Setiap file tambahan perlu tanggung jawab yang jelas. Terapkan deletion test pada wrapper yang hanya meneruskan panggilan. Pertahankan locality perubahan format, status dan otorisasi.
4. Jalankan pemeriksaan dari `package.json` dan acceptance terkait. Gunakan test untuk regression yang dapat mengubah signature, akses, pencabutan, privacy, atau status. Laporkan perintah, hasil, dan bukti yang belum diperoleh. Beri label `Sample data`, `Local NEAR Sandbox`, dan `NEAR Testnet` pada bukti yang sesuai.

## Review and authorization

- Review diff dalam dua lintasan. Pertama periksa kebenaran, akses, privacy dan bukti. Kedua gunakan Ponytail Review untuk mendeteksi dependency, adapter dan wrapper yang tidak diperlukan. Gunakan audit seluruh repo jika ruang lingkup memang memerlukannya. Findings audit tidak mengubah kode otomatis.
- Simplifikasi mempertahankan hasil, error, ordering dan efek samping. Pisahkan perubahan perilaku dari refactor. Jalankan kembali cek yang terpengaruh dan jaga perubahan pengguna di luar scope.
- Simpan kunci dan envelope privat pada perangkat operator sesuai runbook. Gunakan data sintetis dalam repo, demo dan pengujian. Pertahankan origin verifier yang sudah ditetapkan. Hentikan pekerjaan eksternal pada batas izin pemilik, termasuk deploy, publikasi, commit/push, transaksi dan submission.

15. Isi `docs/errors.md`

# Errors

`VALID`, `REVOKED`, `INVALID`, dan `UNAVAILABLE` adalah status UI. HTTP memakai objek `{ code }` untuk error. `ISSUE_PENDING` dan `REVOKE_PENDING` memakai HTTP 202 bersama `referenceId`. Pesan internal kontrak terdiri dari kode stabil. Pemetaan memeriksa kode yang diketahui. Sanitasi respons RPC, stack trace, log dan output CLI sebelum menampilkannya.

| Code | Meaning | UI / operator action |
| --- | --- | --- |
| INVALID_INPUT | ID, body, approval atau format argumen salah | HTTP 400. Perbaiki field yang ditunjuk. |
| REQUEST_TOO_LARGE | Body melewati batas rute | HTTP 413. Persingkat input. |
| UNSUPPORTED_MEDIA_TYPE | Body untuk aksi lokal bukan JSON | HTTP 415. Kirim JSON dari UI yang disediakan. |
| INVALID_LINK | Fragment hilang, rusak atau formatnya tidak didukung | `INVALID`. Buka kembali link asli. |
| PROFILE_MISMATCH | Paket mengacu pada network, kontrak atau issuer lain | `INVALID`. Buka link pada origin dan profil penerbitnya. |
| SIGNATURE_INVALID | Signature gagal terhadap key issuer | `INVALID`. Minta link asli dari penerbit. |
| COMMITMENT_MISMATCH | Payload tidak cocok dengan record final | `INVALID`. Minta link asli dari penerbit. |
| REFERENCE_NOT_FOUND | View final dari kontrak yang siap mengembalikan record kosong | HTTP 404 untuk read API, `INVALID` pada verifier. |
| REFERENCE_REVOKED | Record dicabut, atau issue mencoba memakai ulang ID tersebut | Verifier menampilkan `REVOKED` hanya untuk paket yang lolos cek integritas. Percobaan issue ulang menghasilkan HTTP 409. |
| REFERENCE_CONFLICT | ID aktif sudah terikat pada commitment berbeda | HTTP 409. Hentikan retry otomatis dan periksa file pending. |
| ISSUE_PENDING | Penerbitan belum dapat dikonfirmasi | HTTP 202. Periksa lagi dengan ID yang sama atau lanjutkan file pending. |
| REVOKE_PENDING | Pencabutan belum dapat dikonfirmasi | HTTP 202. Baca state final sebelum mengulang write. |
| FORBIDDEN | Predecessor, origin lokal, atau pemanggil tidak berwenang | HTTP 403 untuk rute mutasi yang terdaftar. Periksa akun dan origin lokal. |
| ALREADY_INITIALIZED | Init dipanggil ulang pada kontrak yang sudah diinisialisasi | Hentikan provisioning dan periksa kontrak. SDK dapat menghasilkan error init sendiri. CLI memetakan saat relevan. |
| CAP_REACHED | Batas referensi kontrak tercapai | HTTP 409 pada penerbitan lokal. Operator menyiapkan deployment baru sesuai runbook. |
| UNAVAILABLE | RPC timeout, read gagal, konfigurasi kontrak tidak cocok, atau Web Crypto tidak tersedia | HTTP 503 untuk gangguan backend atau status UI `UNAVAILABLE`. Coba lagi atau periksa konfigurasi/browser. |
| ROUTE_NOT_FOUND | Rute tidak ada di mode yang aktif | HTTP 404. Kembali ke halaman yang disediakan. |

Kesalahan bootstrap melaporkan satu diagnosis yang terikat pada langkah yang gagal. Contohnya binary Sandbox tidak ditemukan, WASM gagal deploy, atau issuer mismatch. Cek readiness memberi respons 503 selama konfigurasi atau dependensi belum cocok. Liveness tetap membedakan proses yang hidup. Browser tidak memakai cache status, result yang lama atau fixture sebagai pengganti pembacaan yang gagal.

16. Sumber teknis dan aturan

[S1] NEAR HACKATHON, aturan dan prosedur resmi. https://nearhackathon.com/HACKATHON.md
[S2] Contoh track 03 oleh NEAR AI. https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/03-privacy.md
[S3] Diskusi freelancer tentang portofolio dan NDA. https://www.reddit.com/r/freelance/comments/1fsi0u8/
[S4] Merit di NearHunt dan implementasinya. https://nearhunt.xyz/p/ef2f6858-ddf3-43c4-8148-5f29e67fdb7a dan https://github.com/Isaiah-54/merit
[S5] Ed25519 dan API crypto Node. https://www.rfc-editor.org/rfc/rfc8032 dan https://nodejs.org/api/crypto.html
[S6] Web Crypto di browser. https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
[S7] Semantik URL fragment. https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment
[S8] NEAR RPC, kontrak, transaksi dan daftar provider. https://docs.near.org/api/rpc/contracts dan https://docs.near.org/api/rpc/transactions dan https://docs.near.org/api/rpc/providers
[S9] NEAR dApp quickstart dan template. https://docs.near.org/web3-apps/quickstart dan https://github.com/near/create-near-app
[S10] cargo-near 0.23.0 dan scaffold Rust. https://github.com/near/cargo-near/releases/tag/cargo-near-v0.23.0 dan https://github.com/near/cargo-near-new-project-template
[S11] NEAR access keys. https://docs.near.org/protocol/accounts-contracts/access-keys
[S12] NEAR contract security, penyimpanan dan collections. https://docs.near.org/smart-contracts/security/checklist dan https://docs.near.org/smart-contracts/anatomy/collections
[S13] Dokumentasi dan metadata near-api-js yang dipin. https://docs.near.org/tools/near-api dan https://registry.npmjs.org/near-api-js/7.5.3
[S14] Node LTS dan TypeScript runtime. https://nodejs.org/en/blog/release/v26.13.1 dan https://nodejs.org/api/typescript.html
[S15] Rust stable dan crate index. https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/ dan https://index.crates.io/ne/ar/near-sdk
[S16] Registry npm dan release Vite. https://registry.npmjs.org/ dan https://github.com/vitejs/vite/releases
[S17] NEAR Sandbox v0.3.5 dan integrasi resmi. https://github.com/near/near-sandbox-js/releases/tag/v0.3.5 dan https://docs.near.org/smart-contracts/testing/integration-test
[S18] Kompatibilitas nearcore/SDK. https://github.com/near/devex/issues/63 dan https://registry.npmjs.org/near-workspaces/5.0.0
[S19] Compose readiness, versi Compose dan Caddy. https://docs.docker.com/compose/how-tos/startup-order/ dan https://github.com/docker/compose/releases/tag/v5.7.1 dan https://github.com/caddyserver/caddy/releases/tag/v2.11.9
[S20] near-cli-rs untuk provisioning operator. https://docs.near.org/tools/cli dan https://github.com/near/near-cli-rs/releases/tag/v0.31.1
