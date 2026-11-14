CREATE TABLE `areas` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `areas_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `disciplines` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `disciplines_id` PRIMARY KEY(`id`),
	CONSTRAINT `disciplines_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `drawings` (
	`id` varchar(36) NOT NULL,
	`number` varchar(100),
	`title` varchar(255),
	`hac` varchar(40) NOT NULL,
	`area_id` varchar(36) NOT NULL,
	`discipline_id` varchar(36),
	`description` text NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`owner_name` varchar(100) NOT NULL,
	`uploader_id` varchar(36) NOT NULL,
	`uploader_name` varchar(100) NOT NULL,
	`source` varchar(12) NOT NULL,
	`legacy_note` text,
	`current_revision_id` varchar(36),
	`released_revision_id` varchar(36),
	`work_status` varchar(24) NOT NULL,
	`ever_submitted` boolean NOT NULL DEFAULT false,
	`request_id` varchar(36),
	`released_at` timestamp(3),
	`voided_at` timestamp(3),
	`void_reason` varchar(500),
	`voided_by_id` varchar(36),
	`voided_by_name` varchar(100),
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	`number_active` varchar(100) GENERATED ALWAYS AS ((case when `voided_at` is null then `number` end)) STORED,
	CONSTRAINT `drawings_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawings_number_active_uq` UNIQUE(`number_active`)
);
--> statement-breakpoint
CREATE TABLE `drawing_idempotency` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36) NOT NULL,
	`request_key` varchar(128) NOT NULL,
	`payload_hash` char(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`status` int NOT NULL,
	`response` text NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `drawing_idempotency_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawing_idempotency_actor_key_uq` UNIQUE(`actor_id`,`request_key`)
);
--> statement-breakpoint
CREATE TABLE `drawing_revisions` (
	`id` varchar(36) NOT NULL,
	`drawing_id` varchar(36) NOT NULL,
	`revision_no` varchar(20) NOT NULL,
	`status` varchar(24) NOT NULL,
	`cycle` int NOT NULL DEFAULT 0,
	`working_file_id` varchar(36),
	`issued_file_id` varchar(36),
	`change_note` varchar(1000) NOT NULL DEFAULT '',
	`created_by_id` varchar(36) NOT NULL,
	`created_by_name` varchar(100) NOT NULL,
	`submitted_by_id` varchar(36),
	`submitted_by_name` varchar(100),
	`submitted_at` timestamp(3),
	`completed_at` timestamp(3),
	`obsolete_at` timestamp(3),
	`cancelled_at` timestamp(3),
	`cancel_reason` varchar(500),
	`cancelled_by_id` varchar(36),
	`cancelled_by_name` varchar(100),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	`revision_active` varchar(20) GENERATED ALWAYS AS ((case when `status` <> 'cancelled' then `revision_no` end)) STORED,
	CONSTRAINT `drawing_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawing_revisions_no_uq` UNIQUE(`drawing_id`,`revision_active`)
);
--> statement-breakpoint
CREATE INDEX `drawings_status_time_idx` ON `drawings` (`work_status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `drawings_released_idx` ON `drawings` (`released_at`,`id`);--> statement-breakpoint
CREATE INDEX `drawings_updated_idx` ON `drawings` (`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `drawings_owner_idx` ON `drawings` (`owner_id`);--> statement-breakpoint
CREATE INDEX `drawings_area_idx` ON `drawings` (`area_id`);--> statement-breakpoint
CREATE INDEX `drawings_hac_idx` ON `drawings` (`hac`);--> statement-breakpoint
CREATE INDEX `drawing_revisions_drawing_idx` ON `drawing_revisions` (`drawing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_revisions_status_idx` ON `drawing_revisions` (`status`,`updated_at`);--> statement-breakpoint
-- Seed: Discipline awal (PRD §5 aturan 5). Area dimulai kosong.
INSERT INTO `disciplines` (`id`,`name`,`active`,`sort_order`,`version`,`created_at`,`updated_at`) VALUES ('d15c0000-0000-4000-8000-000000000001','Mechanical',true,10,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)),('d15c0000-0000-4000-8000-000000000002','Piping',true,20,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)),('d15c0000-0000-4000-8000-000000000003','Structural',true,30,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)),('d15c0000-0000-4000-8000-000000000004','Electrical',true,40,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)),('d15c0000-0000-4000-8000-000000000005','Instrumentation',true,50,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)),('d15c0000-0000-4000-8000-000000000006','Civil',true,60,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3));
