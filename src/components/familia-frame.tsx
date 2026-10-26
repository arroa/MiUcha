"use client";

import Link from "next/link";
import { useState } from "react";

import { FamilyAdmin } from "@/components/family-admin";
import { AdultSignOut } from "@/components/sign-out";
import type { TipView } from "@/lib/tips";

type FamilyDetail = {
  id: string;
  name: string;
  pctInversion: number;
  pctGasto: number;
  pctDonaciones: number;
  interestPercent: number;
};

type ChildItem = { id: string; name: string; gender: "nino" | "nina"; birthDate: string; loginId: string };
type AuditorItem = { id: string; name: string; email: string };

export function FamiliaFrame({
  personName,
  familyName,
  isSuperAdmin,
  via,
  databaseReady,
  selfEmail,
  family,
  children,
  auditors,
  tips,
}: {
  personName: string;
  familyName: string;
  isSuperAdmin: boolean;
  via: "dev" | "clerk";
  databaseReady: boolean;
  selfEmail: string;
  family: FamilyDetail | null;
  children: ChildItem[];
  auditors: AuditorItem[];
  tips: TipView[];
}) {
  const [title, setTitle] = useState(familyName);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            {isSuperAdmin ? (
              <Link href="/novedades" className="text-sm text-muted underline">
                Superusuario
              </Link>
            ) : null}
            <h1 className="truncate font-serif text-4xl">{title}</h1>
            <p className="mt-1 truncate text-sm">
              <span className="font-bold">{personName}</span>
              <span className="text-muted"> · </span>
              <span className="font-bold text-accent">Banquero</span>
            </p>
          </div>
          <AdultSignOut via={via} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {databaseReady ? null : (
          <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Para guardar la familia escribe <code>MONGODB_URI</code> en <code>.env.local</code>.
          </p>
        )}
        <FamilyAdmin
          isSuperAdmin={false}
          selfEmail={selfEmail}
          selfName={personName}
          families={[]}
          family={family}
          children={children}
          auditors={auditors}
          tips={tips}
          onFamilyRenamed={setTitle}
        />
      </main>
    </div>
  );
}
