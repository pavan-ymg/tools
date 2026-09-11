"use server";

import { revalidatePath } from "next/cache";
import { syncLeads } from "@/lib/lead-sync";

// Sync used to run on every /leads render (page load, pagination, search,
// page-size change) — each of those is a separate request that doesn't
// need fresher data than whatever the last sync produced. Now it only
// runs when someone explicitly hits Refresh.
export async function refreshLeadsAction(): Promise<{ error: string | null }> {
  try {
    await syncLeads();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed." };
  }
  revalidatePath("/leads");
  return { error: null };
}
