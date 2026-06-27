import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Banner } from "@/components/ui/banner";

/** Shown on admin-only settings pages when a member opens them: visible, locked. */
export async function AdminLockedNotice() {
  const t = await getTranslations("settings");

  return (
    <div className="max-w-3xl">
      <Banner tone="warning" icon={<Lock />}>
        {t("memberLockBanner")}
      </Banner>
    </div>
  );
}
