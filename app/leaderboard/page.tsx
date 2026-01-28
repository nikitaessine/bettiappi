import { supabaseServerClient } from "@/lib/supabaseClient";

export default async function LeaderboardPage() {
  const supabase = supabaseServerClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("net", { ascending: false });

  const rows =
    data?.map((row: any) => ({
      participant_id: row.participant_id as string,
      display_name: row.display_name as string,
      total_won: Number(row.total_won || 0),
      total_lost: Number(row.total_lost || 0),
      net: Number(row.net || 0),
      win_count: Number(row.win_count || 0),
      loss_count: Number(row.loss_count || 0)
    })) ?? [];

  const biggestWinner = rows[0];
  const biggestLoser = [...rows].sort((a, b) => a.net - b.net)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-300">
          Based on resolved bets only. This is a fun ledger&mdash;no real money
          is handled by this app.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          Failed to load leaderboard.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 text-sm">
        <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/20 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-300 mb-1">
            Biggest winner
          </div>
          {biggestWinner ?
            <div>
              <div className="text-lg font-semibold text-emerald-100">
                {biggestWinner.display_name}
              </div>
              <div className="mt-1 text-sm text-emerald-100">
                Net: {biggestWinner.net.toFixed(2)}
              </div>
            </div>
          : <div className="text-xs text-slate-200">No bets resolved yet.</div>}
        </div>
        <div className="rounded-lg border border-red-700/60 bg-red-950/20 p-4">
          <div className="text-xs uppercase tracking-wide text-red-300 mb-1">
            Biggest loser
          </div>
          {biggestLoser ?
            <div>
              <div className="text-lg font-semibold text-red-100">
                {biggestLoser.display_name}
              </div>
              <div className="mt-1 text-sm text-red-100">
                Net: {biggestLoser.net.toFixed(2)}
              </div>
            </div>
          : <div className="text-xs text-slate-200">No bets resolved yet.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 text-sm overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Won</th>
              <th className="px-3 py-2 text-right">Lost</th>
              <th className="px-3 py-2 text-right">Wins</th>
              <th className="px-3 py-2 text-right">Losses</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  No results yet&mdash;resolve some bets to populate the
                  leaderboard.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr
                key={row.participant_id}
                className="border-b border-slate-800 last:border-0"
              >
                <td className="px-3 py-2 text-xs text-slate-400">
                  #{idx + 1}
                </td>
                <td className="px-3 py-2">{row.display_name}</td>
                <td className="px-3 py-2 text-right">
                  {row.net.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.total_won.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.total_lost.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">{row.win_count}</td>
                <td className="px-3 py-2 text-right">{row.loss_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

