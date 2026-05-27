-- UI locale persisted per-user so the choice survives device/browser
-- changes (the `NEXT_LOCALE` cookie alone would not). Default EN_US;
-- existing rows back-fill to the default and users can switch via the
-- new Settings → Preferências tab.

CREATE TYPE "Locale" AS ENUM ('EN_US', 'PT_BR');

ALTER TABLE "users" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'EN_US';
