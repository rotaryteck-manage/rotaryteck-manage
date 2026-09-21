CREATE TABLE `warehouse_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
