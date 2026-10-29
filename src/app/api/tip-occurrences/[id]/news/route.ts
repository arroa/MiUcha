import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getChildSession } from "@/lib/child-account";
import { tipOccurrences } from "@/lib/collections";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const child = await getChildSession();
  if (!child) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Aviso no encontrado." }, { status: 400 });
  const json = (await request.json().catch(() => null)) as { action?: string } | null;
  if (json?.action !== "read" && json?.action !== "dismiss") {
    return NextResponse.json({ error: "Elige marcar leída o eliminar." }, { status: 400 });
  }

  const now = new Date();
  const result = await (await tipOccurrences()).updateOne(
    {
      _id: new ObjectId(id),
      childId: child._id,
      status: { $in: ["approved", "rejected", "needs_improvement"] },
      newsDismissedAt: null,
    },
    json.action === "dismiss" ? { $set: { newsDismissedAt: now, newsReadAt: now } } : { $set: { newsReadAt: now } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Ese aviso ya no está." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
