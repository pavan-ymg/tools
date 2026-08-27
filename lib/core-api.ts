// Thin client for core-api's read-only lead index endpoint (Phase 1,
// docs/tools/PLAN.md §3.2). core-api never learns anything about this
// app's schema or database engine — it just returns JSON, authenticated
// by a shared service token, not a user credential.

export type CoreApiLead = {
  sourceId: string;
  name: string;
  phone: string;
  email: string;
  domain: string;
  slug: string;
  state: string;
  createdAt: string; // ISO 8601
};

type LeadsResponse = {
  leads: CoreApiLead[];
};

/**
 * Fetch leads created at or after `since`. Inclusive on purpose — the
 * caller's upsert-by-sourceId makes re-fetching an already-synced lead
 * a harmless no-op, which is simpler and safer than trying to get an
 * exact exclusive boundary right across clock skew (§ lead-sync.ts).
 */
export async function fetchLeadsSince(since: Date): Promise<CoreApiLead[]> {
  const baseUrl = process.env.CORE_API_URL;
  const token = process.env.CORE_API_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("CORE_API_URL / CORE_API_SERVICE_TOKEN not configured");
  }

  const url = new URL("/internal/leads", baseUrl);
  url.searchParams.set("since", since.toISOString());

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // This is a live sync call triggered by a page load, not something
    // to cache — always hit core-api fresh.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`core-api /internal/leads returned ${res.status}`);
  }

  const data: LeadsResponse = await res.json();
  return data.leads;
}
