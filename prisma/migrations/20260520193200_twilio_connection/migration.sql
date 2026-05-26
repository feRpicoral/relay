-- AlterTable
ALTER TABLE "phone_numbers" ADD COLUMN "twilio_trunk_sid" TEXT;

-- CreateTable
CREATE TABLE "twilio_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "account_sid" TEXT NOT NULL,
    "api_key_sid" TEXT NOT NULL,
    "auth_token_encrypted" TEXT NOT NULL,
    "twilio_trunk_sid" TEXT,
    "twilio_trunk_domain" TEXT,
    "livekit_outbound_trunk_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "twilio_connections_org_id_key" ON "twilio_connections"("org_id");

-- AddForeignKey
ALTER TABLE "twilio_connections" ADD CONSTRAINT "twilio_connections_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
