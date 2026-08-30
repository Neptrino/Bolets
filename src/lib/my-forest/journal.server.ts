import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  journalSeasonWindow,
  summariseJournalSeason,
  type JournalAggregateRow,
} from "@/src/lib/my-forest/journal";

export async function readOwnerJournalSummary(userId: string, date = new Date()) {
  const window = journalSeasonWindow(date);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("read_owner_journal_season", {
    p_owner_id: userId,
    p_start_date: window.startDate,
    p_end_date: window.endDate,
  });
  if (error) throw new Error("Could not read owner journal summary");
  return summariseJournalSeason((data ?? []) as JournalAggregateRow[], date);
}
