import Link from "next/link";

export default function HomePage() {
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
    </div>
  );
}

