import { redirect } from "next/navigation";

import { getAdultSession, homeForAdult } from "@/lib/adult-session";

export default async function DespuesPage() {
  const adult = await getAdultSession();
  if (!adult) redirect("/sign-in");
  redirect(homeForAdult(adult));
}
