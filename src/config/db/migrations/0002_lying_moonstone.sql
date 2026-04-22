CREATE TABLE "daily_checkin" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"checkin_date" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"credit_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"referral_code" text NOT NULL,
	"reward_credits" integer DEFAULT 0 NOT NULL,
	"reward_status" text DEFAULT 'pending' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"credit_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"rewarded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "daily_checkin" ADD CONSTRAINT "daily_checkin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_daily_checkin_user_date" ON "daily_checkin" USING btree ("user_id","checkin_date");--> statement-breakpoint
CREATE INDEX "idx_daily_checkin_user_created" ON "daily_checkin" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referral_referred_user" ON "referral" USING btree ("referred_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referral_referrer_referred" ON "referral" USING btree ("referrer_user_id","referred_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_referrer_created" ON "referral" USING btree ("referrer_user_id","created_at");