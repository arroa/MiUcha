import { ObjectId } from "mongodb";

import { getAdultSession } from "@/lib/adult-session";
import { adults } from "@/lib/collections";
import { familyChoiceCookie } from "@/lib/family-choice";
import { redirectTo } from "@/lib/request-url";

export async function GET(request: Request) {
  const session = await getAdultSession();
  if (!session?.email) return redirectTo(request, "/sign-in");

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!ObjectId.isValid(id)) return redirectTo(request, "/panel");

  const adult = await (await adults()).findOne({ email: session.email, familyId: new ObjectId(id), active: true });
  if (!adult || (adult.role !== "banquero" && adult.role !== "auditor")) {
    return redirectTo(request, "/panel");
  }

  const response = redirectTo(request, "/familia");
  response.cookies.set(familyChoiceCookie(id));
  return response;
}
