CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "app_accounts" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_accounts" ADD CONSTRAINT "app_accounts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "categories" ("user_id", "name") SELECT DISTINCT "user_id", "category" FROM "app_accounts" WHERE "category" IS NOT NULL ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "app_accounts" a SET "category_id" = c."id" FROM "categories" c WHERE c."user_id" = a."user_id" AND c."name" = a."category";--> statement-breakpoint
ALTER TABLE "app_accounts" DROP COLUMN "category";