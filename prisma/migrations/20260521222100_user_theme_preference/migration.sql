-- Per-user theme preference, persisted server-side so the choice follows the
-- user across devices. localStorage alone resets on every new browser/device.
-- Default to DARK so existing users land on the brand-aligned dashboard look
-- without having to opt in.

CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK');

ALTER TABLE "users" ADD COLUMN "theme_preference" "ThemePreference" NOT NULL DEFAULT 'DARK';
