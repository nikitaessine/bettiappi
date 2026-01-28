import Link from "next/link";
import { supabaseServerClient } from "@/lib/supabaseClient";

// Revalidate the home page every 10 seconds so new
// bets created via links show up without redeploy.
export const revalidate = 10;

export default async function HomePage() {
  const supabase = supabaseServerClient();

  const { data: bets } = await supabase
    .from("bets")
    .select("code, title, stake_amount, currency, status, mode, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Quick Bets with Friends
        </h1>
        <p className="text-slate-300 max-w-2xl">
          Create lightweight, friendly bets with your friends, track who won,
          and keep a fun ledger of bragging rights. No payments, no accounts,
          just links.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-400"
          >
            Create a Bet
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3 text-sm">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="font-semibold mb-2">No accounts, no friction</h2>
          <p className="text-slate-300">
            We use a per-device token and your display name to track your
            results. No emails, no passwords.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="font-semibold mb-2">Track only, never pay</h2>
          <p className="text-slate-300">
            This is a tracking tool only. It does not handle money or gambling
            transactions. It&apos;s just a scorekeeper.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="font-semibold mb-2">Shareable bet links</h2>
          <p className="text-slate-300">
            Create a bet, share a unique link, and let friends accept or
            decline from their own devices.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All bets</h2>
          <span className="text-xs text-slate-400">
            {bets?.length ?? 0} total
          </span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 text-sm">
          {!bets || bets.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-sm">
              No bets yet. Be the first to{" "}
              <Link href="/create" className="underline">
                create a bet
              </Link>
              .
            </div>
          ) : (
            bets.map((bet) => (
              <Link
                key={bet.code}
                href={`/b/${bet.code}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/70 transition-colors"
              >
                <div>
                  <div className="font-medium">{bet.title}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Stake: {bet.stake_amount} {bet.currency} ·{" "}
                    {new Date(bet.created_at as string).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      bet.status === "OPEN"
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                        : bet.status === "LOCKED"
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                        : "bg-sky-500/10 text-sky-300 border border-sky-500/40"
                    }`}
                  >
                    {bet.status}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                    {bet.mode === "H2H" ? "Head-to-head" : "Multi"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

