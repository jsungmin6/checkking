import { getSchemeUri } from "@apps-in-toss/web-framework";

const REFERRER_ENDPOINT = "https://chesscode.duckdns.org/api/attendance/diagnostics/referrer";
let reported = false;

/** Records only the raw Apps in Toss referrer once per WebView launch. */
export function reportAppEntryReferrer(appName: string): void {
  if (reported) return;
  reported = true;

  if (typeof navigator === "undefined" || !navigator.userAgent.includes("TossApp")) return;

  let referrer: string | null = null;
  try {
    referrer = new URL(getSchemeUri()).searchParams.get("referrer");
  } catch {
    // Keep the entry with a missing referrer so unknown paths are measurable.
  }

  void fetch(REFERRER_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appName, referrer }),
    keepalive: true,
  }).catch(() => {});
}
