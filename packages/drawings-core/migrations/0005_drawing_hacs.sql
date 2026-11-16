CREATE TABLE `drawing_hacs` (
	`drawing_id` varchar(36) NOT NULL,
	`hac` varchar(40) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `drawing_hacs_drawing_id_hac_pk` PRIMARY KEY(`drawing_id`,`hac`)
);
--> statement-breakpoint
CREATE INDEX `drawing_hacs_hac_idx` ON `drawing_hacs` (`hac`);