export const OFFICE_SKILL = `---
name: office-artifacts-id
description: Membuat dokumen Word, workbook Excel, dan presentasi PowerPoint yang akurat, rapi, mudah diedit, serta siap diunduh melalui KonteksFlow.
---

# Office Artifacts

Gunakan skill ini untuk permintaan membuat .docx, .xlsx, atau .pptx. Jawab dalam bahasa pengguna. Sebelum membuat file, tentukan pembaca, tujuan, dan bahan yang tersedia. Jangan mengarang data, kutipan, sumber, atau rumus bisnis; tandai asumsi dengan jelas.

## Word (.docx)
- Susun dokumen dengan judul yang jelas, heading bertingkat, paragraf ringkas, daftar, dan tabel bila membantu. Untuk tabel pakai {"type":"table","rows":[["Kolom A","Kolom B"],["nilai","nilai"]]}.
- Gunakan bahasa profesional dan konsisten. Hindari satu blok teks panjang; masukkan ringkasan eksekutif hanya jika cocok untuk tujuan dokumen.
- Buat blok DSM:DOCX_CREATE JSON valid di akhir. Bentuk: {"title":"...","author":"","blocks":[{"type":"heading","level":1,"text":"..."},{"type":"paragraph","text":"..."},{"type":"bullets","items":["..."]},{"type":"numbered","items":["..."]},{"type":"table","rows":[["Judul kolom","Judul kolom"],["nilai","nilai"]]}]}. Maksimal 80 blok; jenis yang didukung paragraph, heading, bullets, numbered, table. Maksimal 60 baris per tabel.

## Excel (.xlsx)
- Buat satu sheet utama untuk kebutuhan sederhana; tambahkan sheet terpisah hanya bila data sumber, perhitungan, dan ringkasan memang punya fungsi berbeda.
- Tampilkan header jelas, data konsisten per kolom, angka sebagai angka, tanggal sebagai tanggal, satuan dan sumber secara eksplisit. Jangan menyimpan angka sebagai teks.
- Gunakan formula hanya saat bermanfaat dan dapat ditelusuri; jelaskan asumsi dan hindari formula yang mengarang hasil. Pisahkan input dan hasil, bekukan header, pasang filter bila sesuai, serta beri format angka yang masuk akal.
- Buat blok DSM:XLSX_CREATE JSON valid di akhir. Bentuk: {"title":"...","sheets":[{"name":"Ringkasan","headers":["Item","Nilai"],"rows":[["Contoh",12]],"columnWidths":[24,16],"freezeRows":1,"autoFilter":true,"formulas":[{"cell":"B3","formula":"SUM(B2:B2)"}]}]}. Maksimal 8 sheet, 500 baris dan 30 kolom per sheet. formulas bersifat opsional dan memakai alamat sel Excel standar.

## PowerPoint (.pptx)
- Rancang narasi dengan satu pesan inti per slide, urutan pembuka–isi–kesimpulan, kepadatan rendah, dan tata letak bervariasi. Tampilkan data hanya jika diberikan atau dihitung langsung dari bahan.
- Pilih palet yang sesuai topik, kontras tinggi, ruang kosong cukup, judul kuat, serta visual yang menjelaskan isi. Hindari garis bawah judul, bar aksen dekoratif, semua slide dengan layout sama, dan daftar bullet panjang.
- Pilih slide title, section, bullets, quote, stats, chart, cards, comparison, atau timeline. Untuk cards gunakan items:[{"title":"...","text":"..."}]; comparison gunakan leftTitle,leftItems,rightTitle,rightItems; timeline gunakan items:[{"title":"...","text":"..."}]. Maksimal 30 slide dan 4 kartu/4 langkah per slide.
- Buat blok DSM:PPTX_CREATE JSON valid di akhir. Sertakan judul dan sumber singkat di slide bila relevan. Jangan mengklaim file sudah tersimpan; pengguna perlu mengunduh hasil.

## Keluaran
Untuk file yang didukung, jelaskan singkat lalu keluarkan satu blok tag DSM yang valid di akhir tanpa code fence. Pastikan JSON dapat diparse dan hanya berisi data yang diperlukan. Biarkan pengguna meninjau lalu mengunduh file dari panel ekstensi.
`;

export const OFFICE_SKILL_META = { name: "Office Artifacts (Word, Excel, PowerPoint)", usage: "Word DOCX, Excel XLSX, PowerPoint PPTX, laporan, spreadsheet, presentasi, slide deck", content: OFFICE_SKILL };

export const PPT_DESIGN_SKILL = `---
name: ppt-design-and-routing-id
description: Panduan permanen untuk memilih pendekatan presentasi dan merancang slide yang sesuai tujuan, audiens, gaya, serta kebutuhan editabilitas.
---

# Desain Presentasi dan Pemilihan Pendekatan

Aktifkan untuk permintaan membuat, menyusun ulang, atau memperindah presentasi. Skill ini adalah panduan perancangan; fitur file yang tersedia di KonteksFlow menghasilkan PPTX yang dapat diedit.

## Tentukan pendekatan
- Jika hasil harus dibuka dan diedit di PowerPoint, buat PPTX native; susun layout memakai teks, bentuk, tabel atau chart yang bisa diedit.
- Jika pengguna memprioritaskan kebebasan visual atau format lain, jelaskan opsi yang memang tersedia di proyek sebelum menyatakan akan menghasilkan file.
- Jangan menyebut proyek pihak ketiga seolah-olah sudah terpasang. Jangan mengarang nama gaya, template, kemampuan atau prasyarat.

## Rancang deck
- Tentukan pembaca, tujuan dan satu kalimat inti. Susun alur pembuka, bukti, implikasi, rekomendasi/kesimpulan.
- Pilih gaya yang sesuai bahan dan audiens (mis. editorial, minimal, teknis, korporat, playful) dan konsistenkan palet, tipografi, jarak serta motif visual.
- Variasikan layout sesuai fungsi: judul, pembatas bab, narasi singkat, kutipan, metrik, chart, kartu, perbandingan, dan timeline. Jangan memaksa semua isi menjadi daftar bullet.
- Setiap slide membawa satu pesan utama. Pakai kontras yang jelas, judul yang kuat, teks secukupnya, ruang kosong, dan visual yang menerangkan data atau hubungan.
- Fakta, angka, kutipan dan sumber harus berasal dari bahan yang tersedia. Tampilkan asumsi secara eksplisit; jangan membuat metrik atau logo fiktif.
- Tinjau konsistensi, keterbacaan, kepadatan dan ejaan sebelum mengeluarkan blok PPTX. Ikuti format DSM:PPTX_CREATE yang disediakan ekstensi.

## Referensi dan atribusi
Panduan pemilihan pendekatan ini disusun ulang untuk KonteksFlow, terinspirasi oleh prinsip pemilihan skill dan perbandingan rute pada [many-ppt-skills](https://github.com/brycewang-stanford/many-ppt-skills). Perubahan dan adaptasi: panduan ringkas berbahasa Indonesia, disesuaikan untuk generator PPTX bawaan ekstensi. Materi tertulis repositori sumber berlisensi [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
`;

export const PPT_DESIGN_SKILL_META = { id: "recommended-ppt-design-id", name: "Desain Presentasi (persisten)", usage: "PowerPoint PPTX presentasi presentation slides slide deck desain visual layout gaya template visualisasi chart", content: PPT_DESIGN_SKILL, active: true };

export const PPT_MASTER_ADAPTATION = `---
name: ppt-master-workflow-id
description: Alur kerja presentasi bertahap untuk mengubah topik atau bahan menjadi deck native yang terstruktur dan mudah ditinjau.
---

# Alur Kerja Presentasi (adaptasi PPT Master)

Gunakan bersama generator presentasi KonteksFlow untuk permintaan membuat PPT. Ini adalah panduan desain dan struktur, bukan paket Python PPT Master dan bukan izin untuk mengaku menjalankan skrip/tool yang tidak tersedia.

## Alur
1. Kenali sumber bahan, audiens, tujuan presentasi, jumlah halaman yang diminta, dan kebutuhan editabilitas. Bila informasi tidak penting untuk mulai bekerja, simpulkan asumsi yang wajar dari konteks.
2. Ambil pesan inti bahan; bedakan fakta sumber, kesimpulan, dan rekomendasi. Jangan menciptakan fakta yang tidak tersedia.
3. Buat kerangka yang punya alur, bukan sekadar memecah paragraf menjadi slide: konteks → argumen/bukti → implikasi → kesimpulan atau tindakan.
4. Untuk tiap slide, pilih satu pekerjaan bagi pembaca dan satu komposisi visual yang melayani pekerjaan itu. Variasikan hierarki dan tata letak; pertahankan motif serta tipografi yang konsisten tanpa mengulang template yang sama terus-menerus.
5. Gunakan objek native yang tersedia: teks, bentuk, kartu, perbandingan, timeline, metrik, dan chart berbasis angka sumber. Labeli chart dengan jelas dan jangan mengubah data demi dekorasi.
6. Jaga teks tetap mudah dibaca, judul menyampaikan kesimpulan slide, kontras kuat, margin dan ruang kosong cukup. Setiap dekorasi harus membantu pemahaman.
7. Sebelum ekspor, cek urutan narasi, kecocokan data dengan sumber, repetisi layout, konsistensi bahasa, dan potensi teks terlalu padat.

Ikuti format keluaran serta jenis slide yang benar-benar disediakan oleh blok instruksi DSM:PPTX_CREATE. Bila pengguna meminta template PPTX existing, animasi PowerPoint, narasi, atau fitur lain yang tidak didukung generator terpasang, jelaskan statusnya secara jujur dan gunakan bagian yang tersedia tanpa mengklaim fitur tersebut selesai.

## Atribusi
Adaptasi alur perancangan dari [PPT Master](https://github.com/hugohe3/ppt-master), Copyright (c) 2025-2026 Hugo He, berlisensi [MIT](https://github.com/hugohe3/ppt-master/blob/main/LICENSE). Perubahan: diringkas dan diterjemahkan ke bahasa Indonesia, diarahkan ke format DSM:PPTX_CREATE dan kemampuan generator bawaan KonteksFlow.
`;

export const PPT_MASTER_SKILL_META = { id: "recommended-ppt-master-adaptation-id", name: "PPT Master Workflow (adaptasi)", usage: "PPT Master PowerPoint PPTX presentasi presentation slides slide deck dari dokumen materi PDF proposal laporan desain narasi native", content: PPT_MASTER_ADAPTATION, active: true };
