CREATE TABLE `approval_actions` (
	`id` varchar(36) NOT NULL,
	`revision_id` varchar(36) NOT NULL,
	`drawing_id` varchar(36) NOT NULL,
	`cycle` int NOT NULL,
	`level` int NOT NULL,
	`decision` varchar(12) NOT NULL,
	`note` varchar(1000) NOT NULL DEFAULT '',
	`actor_id` varchar(36) NOT NULL,
	`actor_name` varchar(100) NOT NULL,
	`actor_role` varchar(16) NOT NULL,
	`reviewed_file_id` varchar(36),
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `approval_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `approval_actions_cycle_level_uq` UNIQUE(`revision_id`,`cycle`,`level`)
);
--> statement-breakpoint
CREATE TABLE `revision_approval_steps` (
	`id` varchar(36) NOT NULL,
	`revision_id` varchar(36) NOT NULL,
	`level` int NOT NULL,
	`assignee_id` varchar(36) NOT NULL,
	`assignee_name` varchar(100) NOT NULL,
	`assigned_by_id` varchar(36) NOT NULL,
	`assigned_by_name` varchar(100) NOT NULL,
	`assigned_at` timestamp(3) NOT NULL,
	CONSTRAINT `revision_approval_steps_id` PRIMARY KEY(`id`),
	CONSTRAINT `revision_approval_steps_level_uq` UNIQUE(`revision_id`,`level`)
);
--> statement-breakpoint
CREATE INDEX `approval_actions_drawing_idx` ON `approval_actions` (`drawing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `revision_approval_steps_assignee_idx` ON `revision_approval_steps` (`assignee_id`,`level`);