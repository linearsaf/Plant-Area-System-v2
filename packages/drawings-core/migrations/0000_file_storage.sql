CREATE TABLE `drawing_audit` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36) NOT NULL,
	`actor_name` varchar(100) NOT NULL,
	`action` varchar(64) NOT NULL,
	`target_type` varchar(16) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`drawing_id` varchar(36),
	`details` text NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `drawing_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drawing_files` (
	`id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`purpose` varchar(16),
	`storage_key` varchar(200) NOT NULL,
	`original_name` varchar(200) NOT NULL,
	`mime` varchar(64) NOT NULL,
	`size` bigint NOT NULL,
	`sha256` char(64) NOT NULL,
	`page_count` int,
	`status` varchar(12) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`owner_name` varchar(100) NOT NULL,
	`parent_type` varchar(16),
	`parent_id` varchar(36),
	`created_at` timestamp(3) NOT NULL,
	`attached_at` timestamp(3),
	`orphaned_at` timestamp(3),
	CONSTRAINT `drawing_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawing_files_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE INDEX `drawing_audit_time_idx` ON `drawing_audit` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `drawing_audit_drawing_idx` ON `drawing_audit` (`drawing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_files_status_time_idx` ON `drawing_files` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_files_owner_idx` ON `drawing_files` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_files_parent_idx` ON `drawing_files` (`parent_type`,`parent_id`);