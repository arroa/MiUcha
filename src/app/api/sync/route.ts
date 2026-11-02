import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getAdultSession } from "@/lib/adult-session";
import { getChildSession } from "@/lib/child-account";
import { readFamilySyncVersion } from "@/lib/family-sync";
import { jsonErrorResponse } from "@/lib/http-errors";

export async function GET() {
  try {
    const child = await getChildSession();
    if (child) {
      const version = await readFamilySyncVersion(child.familyId);
      return NextResponse.json({ version });
    }

    const adult = await getAdultSession();
    if (adult?.familyId && ObjectId.isValid(adult.familyId)) {
      const version = await readFamilySyncVersion(new ObjectId(adult.familyId));
      return NextResponse.json({ version });
    }

    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
