CREATE INDEX "idx_user_ip_created_at" ON "user" USING btree ("ip","created_at");
--> statement-breakpoint
INSERT INTO "config" ("name", "value") VALUES ('auth_max_accounts_per_ip', '3') ON CONFLICT ("name") DO UPDATE SET "value" = '3';
