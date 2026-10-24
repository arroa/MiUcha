import { cookies } from "next/headers";

import { children, wallets, type Child, type Wallet } from "@/lib/collections";
import { CHILD_COOKIE, verifyChildSessionToken } from "@/lib/child-session";

export async function getChildSession(): Promise<Child | null> {
  const store = await cookies();
  const raw = store.get(CHILD_COOKIE)?.value;
  if (!raw) return null;
  const childId = await verifyChildSessionToken(raw);
  if (!childId) return null;
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(childId)) return null;
  const child = await (await children()).findOne({ _id: new ObjectId(childId), active: true });
  return child;
}

export async function walletsForChild(child: Child): Promise<Wallet[]> {
  return (await wallets())
    .find({ childId: child._id })
    .sort({ type: 1 })
    .toArray();
}
