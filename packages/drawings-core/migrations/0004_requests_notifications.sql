CREATE TABLE `drawing_notifications` (
	`id` varchar(36) NOT NULL,
	`recipient_id` varchar(36) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500) NOT NULL,
	`href` varchar(300) NOT NULL,
	`source_key` varchar(191) NOT NULL,
	`read_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `drawing_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawing_notifications_source_key_unique` UNIQUE(`source_key`)
);
--> statement-breakpoint
CREATE TABLE `drawing_requests` (
	`id` varchar(36) NOT NULL,
	`number` varchar(20) NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`requester_name` varchar(100) NOT NULL,
	`hac` varchar(40) NOT NULL,
	`description` text NOT NULL,
	`purpose` varchar(1000) NOT NULL,
	`status` varchar(32) NOT NULL,
	`reviewer_id` varchar(36),
	`reviewer_name` varchar(100),
	`review_note` varchar(1000) NOT NULL DEFAULT '',
	`drafter_id` varchar(36),
	`drafter_name` varchar(100),
	`drafter_note` varchar(1000) NOT NULL DEFAULT '',
	`drawing_id` varchar(36),
	`close_reason` varchar(500),
	`closed_at` timestamp(3),
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `drawing_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `drawing_requests_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `drawing_sequences` (
	`kind` varchar(16) NOT NULL,
	`year` int NOT NULL,
	`last_value` int NOT NULL,
	CONSTRAINT `drawing_sequences_kind_year_pk` PRIMARY KEY(`kind`,`year`)
);
--> statement-breakpoint
CREATE INDEX `drawing_notifications_recipient_idx` ON `drawing_notifications` (`recipient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_requests_status_idx` ON `drawing_requests` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `drawing_requests_requester_idx` ON `drawing_requests` (`requester_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `drawing_requests_drafter_idx` ON `drawing_requests` (`drafter_id`,`status`);--> statement-breakpoint
CREATE INDEX `drawing_requests_drawing_idx` ON `drawing_requests` (`drawing_id`);