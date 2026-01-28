-- Quick Bets with Friends schema and policies

-- Enable extensions
create extension if not exists "pgcrypto";

-- Participants
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bets
create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text null,
  stake_amount numeric(12,2) not null,
  currency text not null default 'EUR',
  mode text not null check (mode in ('H2H','MULTI')),
  status text not null check (status in ('OPEN','LOCKED','RESOLVED')) default 'OPEN',
  creator_participant_id uuid not null references public.participants(id),
  creator_token text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  winner_participant_id uuid null references public.participants(id)
);

-- Bet participants
create table if not exists public.bet_participants (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  decision text not null check (decision in ('PENDING','ACCEPTED','DECLINED')) default 'PENDING',
  created_at timestamptz not null default now(),
  unique (bet_id, participant_id)
);

-- Ledger entries
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  from_participant_id uuid not null references public.participants(id),
  to_participant_id uuid not null references public.participants(id),
  amount numeric(12,2) not null,
  currency text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_bets_code on public.bets (code);
create index if not exists idx_bets_creator on public.bets (creator_participant_id);
create index if not exists idx_bet_participants_bet on public.bet_participants (bet_id);
create index if not exists idx_bet_participants_participant on public.bet_participants (participant_id);
create index if not exists idx_ledger_from on public.ledger_entries (from_participant_id);
create index if not exists idx_ledger_to on public.ledger_entries (to_participant_id);

-- RLS: public read, no anon writes
alter table public.participants enable row level security;
alter table public.bets enable row level security;
alter table public.bet_participants enable row level security;
alter table public.ledger_entries enable row level security;

-- Note: Postgres doesn't support "create policy if not exists" directly.
-- These policies are intended to be created once via this migration.
create policy participants_select_public
  on public.participants
  for select
  using (true);

create policy bets_select_public
  on public.bets
  for select
  using (true);

create policy bet_participants_select_public
  on public.bet_participants
  for select
  using (true);

create policy ledger_entries_select_public
  on public.ledger_entries
  for select
  using (true);

-- Block anon writes by default by not creating insert/update/delete policies.
-- Service role bypasses RLS and will be used from the Next.js server.

-- Leaderboard view
create or replace view public.leaderboard as
select
  p.id as participant_id,
  p.display_name,
  coalesce(won.total_won, 0) as total_won,
  coalesce(lost.total_lost, 0) as total_lost,
  coalesce(won.total_won, 0) - coalesce(lost.total_lost, 0) as net,
  coalesce(won.win_count, 0) as win_count,
  coalesce(lost.loss_count, 0) as loss_count
from public.participants p
left join (
  select
    to_participant_id as participant_id,
    sum(amount) as total_won,
    count(*) as win_count
  from public.ledger_entries
  group by to_participant_id
) won on won.participant_id = p.id
left join (
  select
    from_participant_id as participant_id,
    sum(amount) as total_lost,
    count(*) as loss_count
  from public.ledger_entries
  group by from_participant_id
) lost on lost.participant_id = p.id;

alter view public.leaderboard set (security_invoker = true);

-- Resolve bet RPC function
create or replace function public.resolve_bet(
  p_code text,
  p_creator_token text,
  p_winner_participant_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_bet public.bets;
  v_winner_id uuid;
  v_now timestamptz := now();
begin
  -- Lock the bet row for update
  select * into v_bet
  from public.bets
  where code = p_code
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;

  -- Verify creator token
  if v_bet.creator_token <> p_creator_token then
    raise exception 'Not authorized to resolve this bet';
  end if;

  -- Idempotency: if already resolved, just return summary
  if v_bet.status = 'RESOLVED' then
    return (
      select jsonb_build_object(
        'bet', to_jsonb(v_bet),
        'settlement', jsonb_agg(
          jsonb_build_object(
            'from_participant_id', le.from_participant_id,
            'to_participant_id', le.to_participant_id,
            'amount', le.amount,
            'currency', le.currency
          )
        )
      )
      from public.ledger_entries le
      where le.bet_id = v_bet.id
    );
  end if;

  -- Ensure winner is accepted participant
  select bp.participant_id into v_winner_id
  from public.bet_participants bp
  where bp.bet_id = v_bet.id
    and bp.participant_id = p_winner_participant_id
    and bp.decision = 'ACCEPTED';

  if v_winner_id is null then
    raise exception 'Winner must be an accepted participant';
  end if;

  -- Insert ledger entries for each accepted participant except winner
  insert into public.ledger_entries (
    bet_id,
    from_participant_id,
    to_participant_id,
    amount,
    currency,
    created_at
  )
  select
    v_bet.id,
    bp.participant_id as from_participant_id,
    v_winner_id as to_participant_id,
    v_bet.stake_amount as amount,
    v_bet.currency as currency,
    v_now as created_at
  from public.bet_participants bp
  where bp.bet_id = v_bet.id
    and bp.decision = 'ACCEPTED'
    and bp.participant_id <> v_winner_id;

  -- Update bet
  update public.bets
  set status = 'RESOLVED',
      winner_participant_id = v_winner_id,
      resolved_at = v_now
  where id = v_bet.id;

  -- Return final state and settlement
  return (
    select jsonb_build_object(
      'bet', to_jsonb(b),
      'settlement', jsonb_agg(
        jsonb_build_object(
          'from_participant_id', le.from_participant_id,
          'to_participant_id', le.to_participant_id,
          'amount', le.amount,
          'currency', le.currency
        )
      )
    )
    from public.bets b
    left join public.ledger_entries le on le.bet_id = b.id
    where b.id = v_bet.id
    group by b.id
  );
end;
$$;

