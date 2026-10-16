CREATE TABLE `admins` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title_en` text NOT NULL,
	`title_zh` text,
	`title_ms` text,
	`body_en` text NOT NULL,
	`body_zh` text,
	`body_ms` text,
	`location` text NOT NULL,
	`start_at` text,
	`end_at` text,
	`diversion` text,
	`latitude` text,
	`longitude` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_events` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`status` text NOT NULL,
	`note_en` text NOT NULL,
	`note_zh` text,
	`note_ms` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`access_hash` text NOT NULL,
	`owner_user_id` text,
	`contact_email` text,
	`kind` text NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`photo_key` text,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_reference_unique` ON `reports` (`reference`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`categories` text NOT NULL,
	`updated_at` text NOT NULL
);
