CREATE TABLE "admin_logins" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"from_hash" varchar(64) DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily" (
	"day" varchar(10) NOT NULL,
	"path" text DEFAULT '' NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"uniques" integer DEFAULT 0 NOT NULL,
	"engaged_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"school" text NOT NULL,
	"degree" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"grade" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" varchar(64) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"name" varchar(40) NOT NULL,
	"path" text DEFAULT '' NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"value" real,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"start" varchar(7) NOT NULL,
	"end" varchar(7),
	"note" text DEFAULT '' NOT NULL,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"line" text NOT NULL,
	"positioning" text NOT NULL,
	"summary" text NOT NULL,
	"meta_description" text NOT NULL,
	"location" text NOT NULL,
	"tz" text NOT NULL,
	"tz_label" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cv" text NOT NULL,
	"github" text NOT NULL,
	"linkedin" text NOT NULL,
	"hashnode" text DEFAULT '' NOT NULL,
	"npm_card" text DEFAULT '' NOT NULL,
	"availability" text DEFAULT 'open · remote' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"heading" text DEFAULT '' NOT NULL,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tech" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extra_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"context" text NOT NULL,
	"status" text DEFAULT '' NOT NULL,
	"year" integer,
	"weight" real DEFAULT 0.5 NOT NULL,
	"github" text NOT NULL,
	"live" text DEFAULT '' NOT NULL,
	"langs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"planet" jsonb NOT NULL,
	"orbit" real NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scene_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"sun_radius" real DEFAULT 6 NOT NULL,
	"sun_color_core" integer DEFAULT 16774084 NOT NULL,
	"sun_color_edge" integer DEFAULT 16742938 NOT NULL,
	"sun_intensity" real DEFAULT 1 NOT NULL,
	"orbit_scale" real DEFAULT 1 NOT NULL,
	"belt_radius" real DEFAULT 65.5 NOT NULL,
	"belt_density" integer DEFAULT 1400 NOT NULL,
	"star_count" integer DEFAULT 3600 NOT NULL,
	"nebula_a" integer DEFAULT 3868516 NOT NULL,
	"nebula_b" integer DEFAULT 733038 NOT NULL,
	"bloom" real DEFAULT 1 NOT NULL,
	"fov" real DEFAULT 42 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"visitor_id" varchar(64) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"events" integer DEFAULT 0 NOT NULL,
	"engaged_seconds" integer DEFAULT 0 NOT NULL,
	"max_scroll" integer DEFAULT 0 NOT NULL,
	"entry_path" text DEFAULT '' NOT NULL,
	"exit_path" text DEFAULT '' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"group" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"state" varchar(16) DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"visitor_id" varchar(64),
	"country" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"email_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"placeholder" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"visits" integer DEFAULT 1 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"events" integer DEFAULT 0 NOT NULL,
	"engaged_seconds" integer DEFAULT 0 NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT '' NOT NULL,
	"device" varchar(16) DEFAULT 'desktop' NOT NULL,
	"os" text DEFAULT '' NOT NULL,
	"browser" text DEFAULT '' NOT NULL,
	"screen" text DEFAULT '' NOT NULL,
	"language" text DEFAULT '' NOT NULL,
	"first_referrer" text DEFAULT '' NOT NULL,
	"first_landing" text DEFAULT '' NOT NULL,
	"utm_source" text DEFAULT '' NOT NULL,
	"utm_medium" text DEFAULT '' NOT NULL,
	"utm_campaign" text DEFAULT '' NOT NULL,
	"door" varchar(8) DEFAULT '' NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_day_path_idx" ON "daily" USING btree ("day","path");--> statement-breakpoint
CREATE INDEX "events_visitor_idx" ON "events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "events_name_idx" ON "events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "events_at_idx" ON "events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "sessions_visitor_idx" ON "sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "sessions_started_idx" ON "sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "submissions_state_idx" ON "submissions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "visitors_last_seen_idx" ON "visitors" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "visitors_country_idx" ON "visitors" USING btree ("country");