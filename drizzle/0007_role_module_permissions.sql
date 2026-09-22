CREATE TABLE IF NOT EXISTS "role_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid REFERENCES "organizations"("id") ON DELETE cascade,
	"role" varchar(50) NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
	"module_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
