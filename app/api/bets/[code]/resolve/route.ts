import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const bodySchema = z.object({
  token: z.string().min(1),
  winnerParticipantId: z.string().uuid()
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

    // Call resolve_bet RPC
    const { data, error } = await admin.rpc("resolve_bet", {
      p_code: code,
      p_creator_token: parsed.token,
      p_winner_participant_id: parsed.winnerParticipantId
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: error.message ?? "Failed to resolve bet" },
        { status: 400 }
      );
    }

    // Enrich settlement with participant names
    const settlement = (data?.settlement ?? []) as {
      from_participant_id: string;
      to_participant_id: string;
      amount: string;
      currency: string;
    }[];

    const participantIds = Array.from(
      new Set(
        settlement.flatMap((s) => [
          s.from_participant_id,
          s.to_participant_id
        ])
      )
    );

    let participantsById: Record<string, { id: string; display_name: string }> =
      {};

    if (participantIds.length > 0) {
      const { data: participants, error: participantsError } = await admin
        .from("participants")
        .select("id, display_name")
        .in("id", participantIds);

      if (participantsError) {
        console.error(participantsError);
      } else {
        participantsById = Object.fromEntries(
          (participants ?? []).map((p) => [p.id, p])
        );
      }
    }

    const enrichedSettlement = settlement.map((s) => ({
      ...s,
      from_name: participantsById[s.from_participant_id]?.display_name ?? "Unknown",
      to_name: participantsById[s.to_participant_id]?.display_name ?? "Unknown"
    }));

    return NextResponse.json({
      bet: data?.bet,
      settlement: enrichedSettlement
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

