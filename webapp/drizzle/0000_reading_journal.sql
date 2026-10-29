CREATE TABLE `admin` (
	`id` integer PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`created_at` integer NOT NULL
);

--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`review` text NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "review_length" CHECK(length("entries"."review") BETWEEN 200 AND 10000)
);

--> statement-breakpoint
CREATE INDEX `entries_created_idx` ON `entries` (`created_at`);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);

--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`csrf` text NOT NULL,
	`expires` integer NOT NULL
);
