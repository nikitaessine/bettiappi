import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const bodySchema = z.object({
  token: z.string().min(1),
  lock: z.boolean()
});

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const code = params.code;

    const admin = supabaseAdminClient();

    const { data: bet, error: betError } = await admin
      .from("bets")
      .select("*")
      .eq("code", code)
      .single();

    if (betError || !bet) {
      console.error(betError);
      return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    }

    if (bet.creator_token !== parsed.token) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (bet.status === "RESOLVED") {
      return NextResponse.json({ error: "Bet already resolved" }, { status: 400 });
    }

    const newStatus = parsed.lock ? "LOCKED" : "OPEN";

    const { data: updated, error: updateError } = await admin
      .from("bets")
      .update({ status: newStatus })
      .eq("id", bet.id)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Failed to update bet status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bet: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

