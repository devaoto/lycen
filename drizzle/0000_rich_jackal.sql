CREATE TABLE `anime_genres` (
	`anime_id` integer,
	`genre` text NOT NULL,
	PRIMARY KEY(`anime_id`, `genre`),
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anime_studios` (
	`anime_id` integer,
	`studio` text NOT NULL,
	PRIMARY KEY(`anime_id`, `studio`),
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anime_synonyms` (
	`anime_id` integer,
	`synonym` text NOT NULL,
	PRIMARY KEY(`anime_id`, `synonym`),
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anime_tags` (
	`anime_id` integer,
	`tag` text NOT NULL,
	PRIMARY KEY(`anime_id`, `tag`),
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `animes` (
	`id` integer PRIMARY KEY NOT NULL,
	`id_mal` integer,
	`title_id` integer,
	`average_score` real,
	`banner_image` text,
	`country_of_origin` text,
	`cover_image` text,
	`color` text,
	`format` text,
	`duration` integer,
	`description` text,
	`popularity` integer,
	`season` text,
	`season_year` integer,
	`status` text,
	`trending` integer,
	`trailer` text,
	`start_date` text,
	`end_date` text,
	`type` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`anime_id` integer,
	`number` integer,
	`title` text,
	`is_filler` integer DEFAULT false,
	`image` text,
	`rating` real,
	`description` text,
	`provider` text NOT NULL,
	`type` text NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match_results` (
	`id` integer PRIMARY KEY NOT NULL,
	`anime_id` integer,
	`search_result_id` text,
	`index` integer NOT NULL,
	`similarity` real NOT NULL,
	`match_type` text NOT NULL,
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`search_result_id`) REFERENCES `search_results`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY NOT NULL,
	`anime_id` integer,
	`recommended_anime_id` integer,
	`title` text NOT NULL,
	`cover_image` text,
	`description` text,
	`episodes` integer,
	`status` text,
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `relations` (
	`id` integer PRIMARY KEY NOT NULL,
	`anime_id` integer,
	`character_name` text,
	`character_role` text,
	`related_media_title` text,
	`related_media_description` text,
	`related_media_episodes` integer,
	`related_media_id_mal` integer,
	FOREIGN KEY (`anime_id`) REFERENCES `animes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `search_results` (
	`id` text PRIMARY KEY NOT NULL,
	`title_id` integer,
	`url` text NOT NULL,
	`image` text NOT NULL,
	`released` text,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `titles` (
	`id` integer PRIMARY KEY NOT NULL,
	`romaji` text,
	`native` text,
	`english` text,
	`user_preferred` text NOT NULL
);
