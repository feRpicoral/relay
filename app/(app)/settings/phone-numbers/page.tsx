import { redirect } from "next/navigation";

// Phone numbers are managed under /settings/telephony now (Twilio integration).
// This stub keeps the legacy URL alive for bookmarks/links.
export default function PhoneNumbersPage() {
  redirect("/settings/telephony");
}
