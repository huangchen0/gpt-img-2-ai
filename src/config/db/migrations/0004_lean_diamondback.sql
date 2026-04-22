CREATE TABLE "referral_reward_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"reward_date" text NOT NULL,
	"reward_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_reward_daily" ADD CONSTRAINT "referral_reward_daily_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referral_reward_daily_user_date" ON "referral_reward_daily" USING btree ("referrer_user_id","reward_date");--> statement-breakpoint
CREATE INDEX "idx_referral_reward_daily_user_date" ON "referral_reward_daily" USING btree ("referrer_user_id","reward_date");