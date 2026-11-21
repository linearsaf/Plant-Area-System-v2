# Rencana polish Ringkasan Bag Filter

Tanggal: 21 November 2026. Status: **diimplementasikan; hasil pemeriksaan dicatat pada [VALIDATION.md](../VALIDATION.md)**. Branch: `feat/bag-dashboard-polish`.

Ringkasan Bag Filter saat ini lebih banyak menjawab "seberapa lengkap data kita" daripada "bag mana yang harus diganti". Rencana ini mengganti empat widget kelengkapan data dengan metrik operasional. Info kelengkapan dipindah ke banner sementara. Hierarki rail kanan, aktivitas, dan kartu Equipment juga dirapikan. Grafik kuartal di hero dan kartu Distribusi umur **tidak diubah**.

Acuan: [PRD v2](../PRD-v2.md), [API](../API.md), [tema UI](../UI-THEME.md), source [dashboard.tsx](../../packages/ui/src/dashboard.tsx), [insights.ts](../../packages/bag-core/src/insights.ts), [page.tsx](../../apps/bag-filter/app/page.tsx), dan [monitor.tsx](../../apps/bag-filter/app/equipment/[code]/monitor.tsx).

## 1. Temuan dari screenshot dan source

| Temuan                                                                                                         | Penyebab di source                                                                             | Keputusan                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Belum tercatat", "Cakupan pemasangan", "Posisi terpasang", dan "Per equipment" mengulang satu fakta yang sama | Keempatnya diturunkan dari `installed / total`                                                 | Ganti dengan metrik umur dan WO; kelengkapan dipindah ke banner sementara                            |
| Bucket 1.050–1.259 hari (185 bag) dan `older1260` per unit tidak tampil sebagai sinyal                         | `distribution[5]` dan `perEquipment[].older1260` sudah ada di respons, tetapi tidak dipakai    | Tampilkan di KPI rail, Per equipment, dan spotlight                                                  |
| Kartu "Satu batch, banyak posisi" bersifat edukasi dan memakan ruang tengah                                    | Teks statis, sedangkan "Buka peta" mengikuti `featured` hasil siklus chevron                   | Ganti dengan "Kompartemen paling kritis"; mosaic dipertahankan sebagai dekorasi                      |
| Spotlight hijau tidak menjelaskan mengapa 561-BF1 yang disorot                                                 | `featured = perEquipment[selectedEquipment]`, dimulai dari indeks 0 dan berputar lewat chevron | Spotlight menjadi "Prioritas tertinggi" yang dipilih otomatis                                        |
| Aktivitas terbaru sulit dipindai karena "Tanpa WO" menjadi judul berulang                                      | `<strong>{item.wo \|\| 'Tanpa WO'}</strong>` dipakai sebagai baris utama                       | Judul `UNIT · N bag`; status WO menjadi pill                                                         |
| Kartu Equipment bawah hanya berisi spesifikasi statis                                                          | Grid dirender server di `page.tsx` dari katalog `equipment`, tanpa data umur                   | Pindahkan ke `<Dashboard />`, tambah jumlah kritis dan bar distribusi mini                           |
| Pemisah desimal tidak seragam (`94,0%` di Portal, `94.0%` di dashboard)                                        | Dashboard memakai `toFixed`, sedangkan `portalSummary` memakai `.replace('.', ',')` manual     | Satu helper `formatPercent` berbasis `id-ID`                                                         |
| Alasan penggantian tidak dapat diagregasi                                                                      | `reason` adalah teks bebas                                                                     | "Distribusi alasan" **tidak** dikerjakan; perlu normalisasi alasan terlebih dahulu (di luar cakupan) |

## 2. Tata letak baru

```text
Heading: EQUIPMENT PROCESS / BAG FILTER                 [Buka peta ▾] [Data aktual]
Banner (hilang saat 0): 1.134 posisi belum punya catatan pemasangan ·
                        561-BF1 664 · L62-BF1 419 · 562-BF1 51
┌──────────────── hero: PEMASANGAN BAG (tetap) ────────────┬─ KPI rail ──────┐  ┌ Prioritas tertinggi ┐
│ grafik kuartal + dropdown tahun                          │ Total posisi    │  │ L62-BF1 (contoh)    │
│                                                          │ Mendekati batas │  │ N bag ≥ 1.260 hari  │
│                                                          │ Umur ≥ 1.260    │  │ Buka peta →         │
└──────────────────────────────────────────────────────────┴─────────────────┘  ├ Aktivitas terbaru ──┤
┌ Kepatuhan WO (tahun terpilih) ┐ ┌ Kompartemen paling kritis + mosaic ┐         │ L62-BF1 · 348 bag   │
└───────────────────────────────┘ └────────────────────────────────────┘         │ [Tanpa WO]          │
┌ Distribusi umur (tetap) ┐ ┌ Indeks Kesehatan (gauge) ┐ ┌ Beban umur kritis ┐  │ Filtras · aktor ·   │
└─────────────────────────┘ └──────────────────────────┘ └───────────────────┘  └─────────────────────┘
Equipment (6 kartu): kode · posisi bag · kompartemen · ≥1.260: N · bar distribusi mini
```

## 3. Spesifikasi per widget

### 3.0 Grafik pemasangan

- Legenda dan rincian kuartal menampilkan `Pabrikan belum diisi` untuk batch tanpa pabrikan, agar tidak rancu dengan banner posisi "belum tercatat". Kunci API `Belum tercatat` di `series[].brands` tidak berubah.

### 3.1 KPI rail

Urutan: **Total posisi**, lalu **Mendekati batas**, lalu **Umur ≥ 1.260 hari**.

- **Mendekati batas** = `distribution[5]`, yaitu bag terpasang berumur 1.050–1.259 hari. Sublabel `1.050–1.259 hari`. Warna angka memakai `ageStops[5].color` atau token peringatan yang setara dan kontrasnya lolos di tema terang/gelap. Kartu bisa diklik ke peta unit prioritas dengan `?age=1050`.
- **Umur ≥ 1.260 hari** tetap bernada bahaya (`negative-text`).
- Kelas `.kpi-rail` / `.metric-block` dipakai bersama oleh `stock-summary.tsx` dan `portal-app-card.tsx`. Perubahan gaya untuk Bag Filter harus memakai modifier, bukan mengubah kelas dasar.

### 3.2 Banner "Belum tercatat"

- Dirender di bagian atas `<Dashboard />`, tepat di bawah heading, hanya jika `neverInstalled > 0`.
- Isi: `{n} posisi belum punya catatan pemasangan`, diikuti rincian unit dengan `total - installed > 0`, diurutkan dari kekurangan terbesar. Tiap unit adalah link ke petanya.
- Tidak ada tombol tutup. Nada informasi netral, tidak bernada bahaya, dan memakai `role="status"`.

### 3.3 Kepatuhan WO (menggantikan "Cakupan pemasangan")

- Basis hitung: jumlah **bag** (`position_count`) dari batch tidak dibatalkan yang `installed_at`-nya jatuh pada **tahun terpilih** (batas WIB, aturan sama dengan `series`). Kartu ikut berubah saat dropdown tahun diganti.
- Tampilan: `x,x%`, progress bar, `N dari M bag memakai WO`, dan `K batch tanpa WO`.
- Nada netral, tanpa target (konstanta target dapat ditambahkan di `@plant/contracts` nanti).
- Jika tahun terpilih tidak punya pemasangan: tampilkan `—` dan `Belum ada pemasangan pada {tahun}.`
- "WO terisi" berarti WO memuat huruf atau angka (`hasWorkOrder`; SQL `REGEXP '[[:alnum:]]'`). Nilai seperti `-` dihitung tanpa WO dan tampil dengan pill `Tanpa WO`.

### 3.4 Kompartemen paling kritis (menggantikan "Satu batch, banyak posisi")

- Tiga kompartemen teratas lintas unit dalam cakupan. Kunci urutan: `older1260` turun, lalu `warning` (1.050–1.259) turun, lalu urutan katalog (unit, sisi, nomor kompartemen).
- Kompartemen yang nilai keduanya 0 tidak ditampilkan. Jika daftar kosong, tampilkan keadaan sehat: `Tidak ada kompartemen ≥ 1.050 hari.`
- Baris: `L62-BF1 · Comp. 12`, lalu keterangan `136/136 kritis  Terpasang 9 Mei 2022` (tanggal WIB dari `oldestInstalledAt`, yaitu bag tertua yang masih terpasang; tanggal turun utuh ke baris berikutnya bila kartu sempit; awalan `Comp.` sama dengan peta; label tampilan dari `displayCompartment`); keterangan berisi `N/kapasitas kritis`, `M/kapasitas mendekati` (kapasitas = bag per kompartemen, mis. `136/136 kritis`). Link: `/bag-filter/equipment/{code}?compartment={label}&age=1260`, atau `age=1050` jika tidak ada bag kritis.
- Teks edukasi "Pilih hingga 500 bag…" dihapus dari dashboard.
- Mosaic 4×4 dipertahankan apa adanya dari kartu tip lama (warna dan posisi di kanan, dalam alur). Percobaan menjadikannya latar kartu dibatalkan karena visualnya memburuk. Agar muat di samping mosaic pada 1280–1366 px, jumlah kritis ditulis di bawah nama kompartemen, bukan rata kanan.

### 3.5 Indeks Kesehatan Bag (menggantikan gauge "Posisi terpasang")

- Rumus: `(installed − older1260) / installed`. Penyebutnya bag **terpasang**, bukan total posisi. Pada data screenshot: (17.650 − 4.094) / 17.650 ≈ **76,8%**.
- Caption: `{n sehat} dari {installed} bag terpasang di bawah 1.260 hari`.
- Jika `installed = 0`: tampilkan `—` dan `Belum ada bag terpasang.`
- Geometri, gradient, dan hatch SVG yang ada dipertahankan. Hanya nilai dan label yang berubah.

### 3.6 Beban umur kritis per equipment (menggantikan "Per equipment")

- Per unit: bar dua segmen (kritis merah + mendekati batas oranye) sebagai porsi dari bag **terpasang** unit itu, dengan label `N bag · x,x%`. Persen di label adalah porsi kritis.
- Urutan: `compareBagLoad`, sama dengan spotlight (3.7). Unit teratas daftar selalu sama dengan Prioritas tertinggi.
- Tanpa baris keterangan kedua per unit. Legenda di bawah judul menjelaskan dua segmen bar (≥ 1.260 hari dan 1.050–1.259 hari).
- Unit dengan `installed = 0` tetap tampil di akhir dengan teks `Belum ada bag terpasang`.
- Baris adalah link ke peta unit dengan `?age=1260`.

### 3.7 Spotlight "Prioritas tertinggi"

- Urutan bersama `compareBagLoad` (keputusan revisi 21 November 2026: berbasis persentase): porsi bag ≥ 1.260 hari terhadap bag terpasang, lalu jumlahnya, lalu porsi dan jumlah 1.050–1.259 hari, lalu urutan katalog.
- Tingkat: unit teratas bernada kritis jika punya bag ≥ 1.260 hari; jika tidak ada, mendekati batas; jika keduanya 0, keadaan sehat `Semua unit di bawah 1.050 hari`.
- Label `PRIORITAS TERTINGGI` berupa pill dengan titik merah (kritis), oranye (mendekati batas), atau hijau (sehat). Latar hijau limau tetap sebagai identitas kartu spotlight.
- Isi: eyebrow `PRIORITAS TERTINGGI`, kode unit, angka besar (jumlah bag pada tingkat itu), label `bag ≥ 1.260 hari` atau `bag 1.050–1.259 hari`, `x,x% dari bag terpasang`, dan CTA `Buka peta →` ke `?age=1260`/`?age=1050`.
- Tombol chevron siklus "Equipment berikutnya" dan state `selectedEquipment` dihapus. Efek tilt pointer tetap ada (sudah menghormati reduced motion).
- Pada keadaan sehat, CTA mengarah ke menu header atau unit pertama. Tidak ada angka besar yang menyesatkan.
- Logika pemilihan dibuat sebagai fungsi murni di `@plant/contracts`, misalnya `pickPriority(perEquipment)`, agar bisa di-unit-test dan dipakai bersama oleh `portalSummary` (`primaryEquipment`).

### 3.8 Aktivitas terbaru

- Baris utama: `L62-BF1 · 348 bag` (kode unit memakai `code-text`).
- Di samping judul: pill peringatan `Tanpa WO` jika `wo` kosong; jika terisi, nomor WO ditampilkan sebagai teks mono netral.
- Baris kedua: `pabrikan · aktor · waktu WIB`. Pabrikan kosong ditulis `Pabrikan belum diisi`, sama dengan Portal.
- Kolom angka di kanan dihapus. Link `?batch=` tidak berubah.
- Konsekuensi lain: assertion `.history-item` "Tanpa WO" di `platform.spec.ts` berada di halaman peta, bukan dashboard, jadi tidak terdampak.

### 3.9 Menu "Buka peta ▾" di header

- Tombol menu di `Heading` (`page.tsx`), di samping badge `Data aktual`, berisi unit dari `grant.equipment`. Tombol dirender server sehingga langsung tersedia.
- Badge jumlah kritis per unit muncul setelah data dashboard dimuat. Sumbernya data yang sama, misalnya lewat komponen klien kecil yang menerima data dari `<Dashboard />` atau fetch yang sama. Pendekatan yang tidak menambah request dipilih saat implementasi.
- Pola menu mengikuti komponen menu/overlay yang sudah ada di `packages/ui` (menu akun) untuk keyboard, focus, dan Escape.

### 3.10 Kartu Equipment bawah

- Grid dipindah dari `page.tsx` ke `<Dashboard />` sehingga memakai fetch yang sama. Judul seksi `Equipment · Sesuai cakupan Anda` ikut pindah.
- Isi per kartu: eyebrow, kode, jumlah posisi bag, `kompartemen · sisi`, `≥ 1.260 hari: N` (nada bahaya jika > 0), dan bar distribusi 7 bucket mini dari `perEquipment[].distribution`.
- Legend statis `Umur otomatis 24/7` dan `Skala 0–1.260+ hari` dihapus.
- Selama skeleton dashboard tampil, grid ikut menampilkan placeholder. Tidak ada kartu statis yang berkedip lalu berganti.

### 3.11 Format angka

- Tambah `formatPercent(value: number, digits = 1)` di `@plant/contracts`, berbasis `Intl.NumberFormat('id-ID', { minimumFractionDigits, maximumFractionDigits })` dengan akhiran `%`. Hasilnya `94,0%`, `30,0%`, `76,8%`.
- Semua `toFixed` untuk tampilan di `dashboard.tsx` diganti, termasuk tren `↑ 30,0%` dan `aria-label`. `portalSummary` memakai helper yang sama dan `.replace('.', ',')` dihapus.

## 4. Perubahan API (aditif)

`GET /bag-filter/api/dashboard?year=`: semua field lama tetap ada. Tambahan:

```ts
perEquipment: {
  code; total; installed; older900; older1260;
  distribution: number[]; // baru: 7 bucket, sama dengan distribution global
}[];
compartments: {          // baru: maksimal 3, sudah diurutkan (aturan 3.4)
  equipmentCode: EquipmentCode;
  side: Position['side'];
  compartment: number;   // nomor lokal per sisi
  label: string;         // displayCompartment
  installed: number;
  older1260: number;
  warning: number;       // 1.050–1.259 hari
  oldestInstalledAt: string; // ISO, pemasangan tertua yang masih terpasang
}[];
woCompliance: {          // baru: tahun terpilih, batch tidak dibatalkan
  bags: number;
  bagsWithWo: number;
  batches: number;
  batchesWithoutWo: number;
};
priority: {              // baru: hasil pickPriority (aturan 3.7)
  level: 'critical' | 'warning' | 'healthy';
  code: EquipmentCode | null;
  count: number;
  installed: number;
};
```

- Kueri posisi terkini sekarang juga memilih `side` dan `compartment` (`ROW_NUMBER` yang sama). Agregasi kompartemen dilakukan di memori, seperti distribusi.
- Kepatuhan WO: satu kueri `SUM(position_count)` dan `COUNT(*)` dikelompokkan berdasarkan `TRIM(wo) <> ''`, dengan filter tahun dan pembatalan yang sama seperti `series`.
- [API.md](../API.md) baris dashboard diperbarui dengan field baru beserta artinya.

## 5. Deep link peta

[monitor.tsx](../../apps/bag-filter/app/equipment/[code]/monitor.tsx) saat ini hanya mengenali `?age=1260` (bucket 6) dan `?batch=`.

- `?age=<hari>` menerima nilai yang tepat sama dengan salah satu `ageStops[i].days` dan memilih bucket `i`. Nilai lain diabaikan tanpa error. `?age=1260` tetap berperilaku sama.
- `?compartment=<label>` diselesaikan dengan `compartmentFromLabel` dan membuka detail kompartemen itu (fungsi `showComp` yang sama dengan klik judul kompartemen). Label sudah unik per unit (`12`, `3A`, `16`), jadi satu parameter label menggantikan pasangan `side` + `compartment` yang dibahas sebelumnya dan URL-nya lebih terbaca. Seleksi tidak berubah. Label tidak dikenal diabaikan.
- Gulir ke detail memakai perilaku `showComp` yang sudah ada: smooth, atau instan saat `prefers-reduced-motion`.

## 6. Urutan pengerjaan (satu PR, commit bertahap)

1. **contracts**: `formatPercent` dan `pickPriority` + unit test. `portalSummary` memakai keduanya.
2. **bag-core**: field aditif `dashboard()` + [API.md](../API.md) + integration test.
3. **bag-filter map**: deep link `?age=<hari>` dan `?compartment=<label>`.
4. **ui dashboard**: KPI rail, banner, Kepatuhan WO, Kompartemen kritis + mosaic, Indeks Kesehatan, Beban umur kritis, spotlight Prioritas, Aktivitas terbaru, beserta CSS di `dashboard.css` (memakai modifier, tanpa mengubah kelas bersama).
5. **bag-filter page**: menu `Buka peta ▾` di heading; grid Equipment dipindah ke `<Dashboard />` dengan isi data hidup.
6. **e2e**: pembaruan assertion dan skenario baru.
7. **docs**: [VALIDATION.md](../VALIDATION.md) dan status dokumen ini.

## 7. Validasi

| Lapisan                 | Cakupan                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`        | Seluruh workspace                                                                                                                                                                                                                                                                                                                                   |
| `pnpm test` (unit)      | `formatPercent` (koma, digit, 0, 100); `pickPriority` (kritis, fallback mendekati batas, sehat, nilai seri berdasarkan persen lalu katalog, daftar kosong)                                                                                                                                                                                          |
| `pnpm test:integration` | `dashboard()`: `perEquipment[].distribution` berjumlah sama dengan `installed`; urutan dan batas 5 pada `compartments`; batch yang dibatalkan tidak dihitung; WO kosong/spasi dihitung tanpa WO; `woCompliance` mengikuti batas tahun WIB; `portalSummary` memakai koma                                                                             |
| `pnpm test:e2e`         | Ganti assertion `Skala 0–1.260+ hari` di `bag-map.spec.ts:861`; skenario baru: banner muncul/hilang, spotlight memilih unit prioritas, pill `Tanpa WO`, menu header dengan keyboard, deep link `?compartment=` dan `?age=1050`, format koma. Cek `theme.spec.ts` dan screenshot `consumables-ui.spec.ts` yang memotret `.dashboard-grid` Bag Filter |
| `pnpm format:check`     | Seluruh perubahan                                                                                                                                                                                                                                                                                                                                   |

Integration dan E2E dijalankan di `plant-v2-test` sesuai README, hanya jika Docker Engine uji disposable sudah terverifikasi. Jika belum, pekerjaan berhenti di langkah itu dan dilaporkan; lingkungan `plant-v2-dev` tidak dipakai sebagai pengganti.

## 8. Di luar cakupan

- Normalisasi alasan penggantian dan grafik distribusi alasan.
- Target resmi kepatuhan WO.
- Perubahan grafik kuartal, kartu Distribusi umur, dan halaman peta selain deep link.
- Perubahan tampilan kartu Bag Filter di Portal, kecuali format persen.
