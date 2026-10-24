import Link from "next/link";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FamilyAdmin } from "@/components/family-admin";
import { getAdultSession, mongoIsConfigured } from "@/lib/adult-session";
import { adults, children, families } from "@/lib/collections";
import { listFamilies } from "@/lib/family-admin";

export default function FamiliaPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Cargando…</p>}>
      <Familia />
    </Suspense>
  );
}

async function Familia() {
  const adult = await getAdultSession();
  if (!adult) redirect("/sign-in");
  if (!adult.isSuperAdmin && adult.role !== "banquero") redirect("/novedades");

  const databaseReady = mongoIsConfigured();
  const familyRows = adult.isSuperAdmin && databaseReady ? await listFamilies() : [];
  let family = null;
  let childRows: { id: string; name: string; gender: "nino" | "nina"; birthDate: string; loginId: string }[] = [];
  let auditorRows: { id: string; name: string; email: string }[] = [];

  if (adult.familyId) {
    const familyId = new ObjectId(adult.familyId);
    const doc = await (await families()).findOne({ _id: familyId });
    if (doc) {
      family = {
        id: doc._id.toHexString(),
        name: doc.name,
        pctInversion: doc.pctInversion,
        pctGasto: doc.pctGasto,
        pctDonaciones: doc.pctDonaciones,
        interestPercent: doc.interestPercent,
      };
      childRows = (await (await children()).find({ familyId, active: true }).sort({ name: 1 }).toArray()).map((child) => ({
        id: child._id.toHexString(),
        name: child.name,
        gender: child.gender,
        birthDate: child.birthDate,
        loginId: child.loginId,
      }));
      auditorRows = (await (await adults()).find({ familyId, role: "auditor" }).sort({ name: 1 }).toArray()).map((auditor) => ({
        id: auditor._id.toHexString(),
        name: auditor.name,
        email: auditor.email,
      }));
    }
  }

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <Link href="/novedades" className="text-sm text-muted underline">
        Novedades
      </Link>
      <h1 className="mt-3 font-serif text-4xl">Familia</h1>
      {databaseReady ? null : (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Para guardar familias escribe <code>MONGODB_URI</code> en <code>.env.local</code>.
        </p>
      )}
      <div className="mt-8">
        <FamilyAdmin isSuperAdmin={adult.isSuperAdmin} families={familyRows} family={family} children={childRows} auditors={auditorRows} />
      </div>
    </main>
  );
}
