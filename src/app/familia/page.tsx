import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FamiliaFrame } from "@/components/familia-frame";
import { getAdultSession, mongoIsConfigured } from "@/lib/adult-session";
import { adults, children, families } from "@/lib/collections";
import { listFamilyTips } from "@/lib/tips";

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
  if (adult.role !== "banquero" || !adult.familyId) redirect("/novedades");

  const databaseReady = mongoIsConfigured();
  const familyId = new ObjectId(adult.familyId);
  const [adultsCol, childrenCol, familiesCol] = await Promise.all([adults(), children(), families()]);
  const [me, doc, childDocs, auditorDocs, tipRows] = await Promise.all([
    adult.adultId ? adultsCol.findOne({ _id: new ObjectId(adult.adultId) }) : null,
    familiesCol.findOne({ _id: familyId }),
    childrenCol.find({ familyId, active: true }).sort({ name: 1 }).toArray(),
    adultsCol.find({ familyId, role: "auditor" }).sort({ name: 1 }).toArray(),
    listFamilyTips(adult.familyId),
  ]);
  const personName = me?.name?.trim() || adult.name;
  const family = doc
    ? {
        id: doc._id.toHexString(),
        name: doc.name,
        pctInversion: doc.pctInversion,
        pctGasto: doc.pctGasto,
        pctDonaciones: doc.pctDonaciones,
        interestPercent: doc.interestPercent,
      }
    : null;
  const childRows = childDocs.map((child) => ({
    id: child._id.toHexString(),
    name: child.name,
    gender: child.gender,
    birthDate: child.birthDate,
    loginId: child.loginId,
  }));
  const auditorRows = auditorDocs.map((auditor) => ({
    id: auditor._id.toHexString(),
    name: auditor.name,
    email: auditor.email,
  }));

  return (
    <FamiliaFrame
      personName={personName}
      familyName={family?.name || "Tu familia"}
      isSuperAdmin={adult.isSuperAdmin}
      via={adult.via}
      databaseReady={databaseReady}
      selfEmail={adult.email}
      family={family}
      children={childRows}
      auditors={auditorRows}
      tips={tipRows}
    />
  );
}
