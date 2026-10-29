import { NextResponse } from "next/server";

import { requireFamilyAdult } from "@/lib/family-admin";
import { reviewTask } from "@/lib/tip-cycle";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adult = await requireFamilyAdult();
  if (!adult?.familyId || !adult.adultId) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const json = (await request.json().catch(() => null)) as { decision?: string; note?: string } | null;
  const decision = json?.decision;
  if (decision !== "approved" && decision !== "needs_improvement" && decision !== "rejected") {
    return NextResponse.json({ error: "Elige hecha, no hecha o mejorable." }, { status: 400 });
  }

  try {
    await reviewTask(adult.familyId, adult.adultId, id, decision, json?.note ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo revisar la tarea." }, { status: 400 });
  }
}
