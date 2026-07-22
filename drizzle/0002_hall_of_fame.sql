CREATE TABLE IF NOT EXISTS "hall_of_fame_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hall_of_fame_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"award_key" text NOT NULL,
	"holder_tag" text NOT NULL,
	"holder_name" text NOT NULL,
	"record_value" integer NOT NULL,
	"value_label" text NOT NULL,
	"period_label" text,
	"achieved_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hall_of_fame_records_award_key_unique" UNIQUE("award_key")
);
