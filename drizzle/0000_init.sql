CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" text NOT NULL,
	"cap_season" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"prop_id" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_prop_manager_unique" UNIQUE("prop_id","manager_id")
);
--> statement-breakpoint
CREATE TABLE "manager" (
	"sleeper_user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text,
	"claimed_at" timestamp,
	CONSTRAINT "manager_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "prop" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"week" integer NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"params" jsonb NOT NULL,
	"payout_cents" integer NOT NULL,
	"push_payout_cents" integer DEFAULT 0 NOT NULL,
	"locks_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"result" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"graded_at" timestamp,
	CONSTRAINT "prop_season_week_unique" UNIQUE("season","week"),
	CONSTRAINT "prop_payout_nonnegative" CHECK ("prop"."payout_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"prop_id" integer NOT NULL,
	"manager_id" text NOT NULL,
	"option" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_prop_id_manager_id_pk" PRIMARY KEY("prop_id","manager_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_manager_id_manager_sleeper_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."manager"("sleeper_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_prop_id_prop_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."prop"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager" ADD CONSTRAINT "manager_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop" ADD CONSTRAINT "prop_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_prop_id_prop_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."prop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_manager_id_manager_sleeper_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."manager"("sleeper_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "ledger_cap_season_idx" ON "ledger_entry" USING btree ("cap_season");