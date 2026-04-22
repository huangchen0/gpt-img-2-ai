CREATE TABLE IF NOT EXISTS "site_activity_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"site" text NOT NULL,
	"activity_date" text NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"first_path" text DEFAULT '/' NOT NULL,
	"last_path" text DEFAULT '/' NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_name" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"source" text DEFAULT 'server' NOT NULL,
	"site" text DEFAULT '' NOT NULL,
	"user_id" text,
	"session_id" text,
	"order_no" text,
	"task_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"payload" text NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "tracking_event_event_id_unique" UNIQUE("event_id"),
	CONSTRAINT "tracking_event_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "referrer_domain" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "signup_site" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "first_seen_site" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_seen_site" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_activity_daily" ADD CONSTRAINT "site_activity_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tracking_event" ADD CONSTRAINT "tracking_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_site_activity_daily_site_date_visitor" ON "site_activity_daily" USING btree ("site","activity_date","visitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_site_activity_daily_site_date" ON "site_activity_daily" USING btree ("site","activity_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_site_activity_daily_user_date" ON "site_activity_daily" USING btree ("user_id","activity_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_event_site_created_at" ON "tracking_event" USING btree ("site","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_event_name_created_at" ON "tracking_event" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tracking_event_user_created_at" ON "tracking_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_signup_site" ON "user" USING btree ("signup_site");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_last_seen_site" ON "user" USING btree ("last_seen_site");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_last_active_at" ON "user" USING btree ("last_active_at");
