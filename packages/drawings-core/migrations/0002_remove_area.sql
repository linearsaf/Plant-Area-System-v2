-- Keputusan pemilik 2026-11-15: Area tidak dipakai (K10 direvisi). Drawing Database belum pernah
-- dirilis, sehingga tabel dan kolom dari 0001 dihapus tanpa memengaruhi data produksi.
DROP TABLE `areas`;--> statement-breakpoint
DROP INDEX `drawings_area_idx` ON `drawings`;--> statement-breakpoint
ALTER TABLE `drawings` DROP COLUMN `area_id`;