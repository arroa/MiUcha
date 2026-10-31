import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getAdultSession } from "@/lib/adult-session";
import { adults } from "@/lib/collections";
import { familyChoiceCookie } from "@/lib/family-choice";

export async function GET(request: Request) {
  const session = await getAdultSession();
  const url = new URL(request.url);
  if (!session?.email) return NextResponse.redirect(new URL("/sign-in", url));

  const id = url.searchParams.get("id") ?? "";
  if (!ObjectId.isValid(id)) return NextResponse.redirect(new URL("/panel", url));

  const adult = await (await adults()).findOne({ email: session.email, familyId: new ObjectId(id), active: true });
  if (!adult || (adult.role !== "banquero" && adult.role !== "auditor")) {
    return NextResponse.redirect(new URL("/panel", url));
  }

  const response = NextResponse.redirect(new URL("/familia", url));
  response.cookies.set(familyChoiceCookie(id));
  return response;
}
