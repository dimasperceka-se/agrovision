import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

/** Baca locale dari cookie. Server-only (memakai next/headers). */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("agrovision_locale")?.value;
  return v === "en" || v === "id" ? v : DEFAULT_LOCALE;
}
