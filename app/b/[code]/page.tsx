import { supabaseServerClient } from "@/lib/supabaseClient";
import BetDetailClient from "./BetDetailClient";

interface BetDetailPageProps {
  params: { code: string };
}

export default async function BetDetailPage({ params }: BetDetailPageProps) {
  const supabase = supabaseServerClient();

  const { data: bet, error } = await supabase
    .from("bets")
    .select(
      `*,
       bet_participants (
         id,
         decision,
         participant_id,
         participants:participants!bet_participants_participant_id_fkey (
           id,
           display_name
         )
       )`
    )
    .eq("code", params.code)
    .single();

  if (error || !bet) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Bet not found</h1>
        <p className="text-slate-300 text-sm">
          This bet link may be invalid or may have been removed.
        </p>
      </div>
    );
  }

  // Load settlement if resolved
  let settlement: {
    from_participant_id: string;
    to_participant_id: string;
    amount: string;
    currency: string;
    from_name: string;
    to_name: string;
  }[] = [];

  if (bet.status === "RESOLVED") {
    const { data: ledger, error: ledgerError } = await supabase
      .from("ledger_entries")
      .select(
        `from_participant_id,
         to_participant_id,
         amount,
         currency,
         from:participants!ledger_entries_from_participant_id_fkey (id, display_name),
         to:participants!ledger_entries_to_participant_id_fkey (id, display_name)`
      )
      .eq("bet_id", bet.id);

    if (!ledgerError && ledger) {
      settlement = ledger.map((row: any) => ({
        from_participant_id: row.from_participant_id,
        to_participant_id: row.to_participant_id,
        amount: row.amount,
        currency: row.currency,
        from_name: row.from?.display_name ?? "Unknown",
        to_name: row.to?.display_name ?? "Unknown"
      }));
    }
  }

  return (
    <BetDetailClient
      initialBet={bet}
      code={params.code}
      initialSettlement={settlement}
    />
  );
}

