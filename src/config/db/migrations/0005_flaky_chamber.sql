CREATE TABLE IF NOT EXISTS "ip_login_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"slot" integer NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ip_login_slot" ADD CONSTRAINT "ip_login_slot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ip_login_slot_ip_slot" ON "ip_login_slot" USING btree ("ip_address","slot");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ip_login_slot_ip_user" ON "ip_login_slot" USING btree ("ip_address","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ip_login_slot_ip_expires" ON "ip_login_slot" USING btree ("ip_address","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ip_login_slot_user_id" ON "ip_login_slot" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_ip_expires" ON "session" USING btree ("ip_address","expires_at");