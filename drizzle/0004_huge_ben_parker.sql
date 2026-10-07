ALTER TABLE "payment_methods" ADD COLUMN "type" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "card_kind" text;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "last4" text;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "email_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;