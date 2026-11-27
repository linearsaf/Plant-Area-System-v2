ALTER TABLE `inventory` ADD CONSTRAINT `inventory_material_location_rack_uq` UNIQUE(`material_id`,`location_id`,`rack`);--> statement-breakpoint
ALTER TABLE `inventory` DROP INDEX `inventory_material_location_uq`;--> statement-breakpoint
CREATE INDEX `inventory_location_rack_idx` ON `inventory` (`location_id`,`rack`,`id`);--> statement-breakpoint
ALTER TABLE `stock_documents` ADD `work_area` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_documents` ADD `borrow_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `document_work_area_idx` ON `stock_documents` (`location_id`,`work_area`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `stock_loans` (
	`id` varchar(36) NOT NULL,
	`number` varchar(30) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`movement_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`material_id` varchar(36) NOT NULL,
	`lender_inventory_id` varchar(36) NOT NULL,
	`borrower_area` varchar(100) NOT NULL,
	`lender_area` varchar(100) NOT NULL,
	`mmid` varchar(80) NOT NULL,
	`description` varchar(160) NOT NULL,
	`common_name` varchar(160) NOT NULL DEFAULT '',
	`unit` varchar(30) NOT NULL,
	`hec` varchar(20) NOT NULL DEFAULT '',
	`wo` varchar(100) NOT NULL DEFAULT '',
	`requester_name` varchar(100) NOT NULL,
	`requester_nik` varchar(30) NOT NULL DEFAULT '',
	`quantity` decimal(18,6) NOT NULL,
	`returned_quantity` decimal(18,6) NOT NULL DEFAULT '0.000000',
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`note` varchar(500) NOT NULL DEFAULT '',
	`actor_id` varchar(64) NOT NULL,
	`actor_name` varchar(100) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	`settled_at` timestamp(3),
	CONSTRAINT `stock_loans_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_loans_number_unique` UNIQUE(`number`),
	CONSTRAINT `stock_loans_quantity_positive` CHECK (`quantity` > 0),
	CONSTRAINT `stock_loans_returned_bounds` CHECK (`returned_quantity` >= 0 AND `returned_quantity` <= `quantity`)
);--> statement-breakpoint
CREATE TABLE `stock_loan_repayments` (
	`id` varchar(36) NOT NULL,
	`loan_id` varchar(36) NOT NULL,
	`method` varchar(20) NOT NULL,
	`quantity` decimal(18,6) NOT NULL,
	`borrower_inventory_id` varchar(36),
	`lender_inventory_id` varchar(36) NOT NULL,
	`out_movement_id` varchar(36),
	`in_movement_id` varchar(36) NOT NULL,
	`note` varchar(500) NOT NULL DEFAULT '',
	`actor_id` varchar(64) NOT NULL,
	`actor_name` varchar(100) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `stock_loan_repayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_loan_repayments_quantity_positive` CHECK (`quantity` > 0)
);--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `work_area` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `borrowed_from_area` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `loan_id` varchar(36);--> statement-breakpoint
ALTER TABLE `stock_loans` ADD CONSTRAINT `stock_loans_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `stock_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loans` ADD CONSTRAINT `stock_loans_movement_id_fk` FOREIGN KEY (`movement_id`) REFERENCES `stock_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loans` ADD CONSTRAINT `stock_loans_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loans` ADD CONSTRAINT `stock_loans_material_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loans` ADD CONSTRAINT `stock_loans_lender_inventory_id_fk` FOREIGN KEY (`lender_inventory_id`) REFERENCES `inventory`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loan_repayments` ADD CONSTRAINT `stock_loan_repayments_loan_id_fk` FOREIGN KEY (`loan_id`) REFERENCES `stock_loans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loan_repayments` ADD CONSTRAINT `stock_loan_repayments_borrower_inv_fk` FOREIGN KEY (`borrower_inventory_id`) REFERENCES `inventory`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loan_repayments` ADD CONSTRAINT `stock_loan_repayments_lender_inv_fk` FOREIGN KEY (`lender_inventory_id`) REFERENCES `inventory`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loan_repayments` ADD CONSTRAINT `stock_loan_repayments_out_move_fk` FOREIGN KEY (`out_movement_id`) REFERENCES `stock_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_loan_repayments` ADD CONSTRAINT `stock_loan_repayments_in_move_fk` FOREIGN KEY (`in_movement_id`) REFERENCES `stock_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_loan_id_fk` FOREIGN KEY (`loan_id`) REFERENCES `stock_loans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_loans_status_time_idx` ON `stock_loans` (`location_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `stock_loans_areas_idx` ON `stock_loans` (`location_id`,`borrower_area`,`lender_area`,`status`);--> statement-breakpoint
CREATE INDEX `stock_loan_repayments_loan_idx` ON `stock_loan_repayments` (`loan_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `movement_loan_idx` ON `stock_movements` (`loan_id`);--> statement-breakpoint
ALTER TABLE `stock_idempotency` ADD `repayment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `stock_idempotency` DROP CHECK `stock_idempotency_one_target`;--> statement-breakpoint
ALTER TABLE `stock_idempotency` ADD CONSTRAINT `stock_idempotency_one_target` CHECK (((`movement_id` IS NOT NULL) + (`document_id` IS NOT NULL) + (`repayment_id` IS NOT NULL)) = 1);--> statement-breakpoint
ALTER TABLE `stock_idempotency` ADD CONSTRAINT `stock_idempotency_repayment_id_fk` FOREIGN KEY (`repayment_id`) REFERENCES `stock_loan_repayments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE `stock_movements` v JOIN `inventory` i ON i.`id` = v.`inventory_id` SET v.`work_area` = i.`rack` WHERE v.`work_area` = '' AND i.`rack` <> '';
