import { ObjectId, type ClientSession } from "mongodb";

import { families } from "@/lib/collections";

/** Sube el contador de la familia para que otras pestañas refresquen. */
export async function bumpFamilySync(familyId: ObjectId, session?: ClientSession) {
  await (await families()).updateOne(
    { _id: familyId },
    { $inc: { syncVersion: 1 } },
    session ? { session } : {},
  );
}

export async function readFamilySyncVersion(familyId: ObjectId): Promise<number> {
  const row = await (await families()).findOne({ _id: familyId }, { projection: { syncVersion: 1 } });
  const value = row && "syncVersion" in row ? row.syncVersion : 0;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
