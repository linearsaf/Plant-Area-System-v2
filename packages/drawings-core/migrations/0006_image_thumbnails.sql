ALTER TABLE `drawing_files` ADD `thumb_storage_key` varchar(200);--> statement-breakpoint
ALTER TABLE `drawing_files` ADD `thumb_size` bigint;--> statement-breakpoint
ALTER TABLE `drawing_files` ADD `thumb_sha256` char(64);--> statement-breakpoint
ALTER TABLE `drawing_files` ADD CONSTRAINT `drawing_files_thumb_storage_key_unique` UNIQUE(`thumb_storage_key`);