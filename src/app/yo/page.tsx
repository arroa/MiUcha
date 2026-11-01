import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChildFavoriteGoal } from "@/components/child-favorite-goal";
import { TaskCart } from "@/components/child-day";
import { ChildMovements } from "@/components/child-movements";
import { ChildShell } from "@/components/child-shell";
import { ChildWallets } from "@/components/child-wallets";
import { NewsBell } from "@/components/news-bell";
import { ChildSignOut } from "@/components/sign-out";
import { getChildSession } from "@/lib/child-account";
import { listChildMovements, listChildNotices } from "@/lib/child-feed";
import { listGoalsForChild } from "@/lib/goals";
import { walletsSnapshot } from "@/lib/money";
import { santiagoToday } from "@/lib/santiago-date";
import { ensureTasksForDate, listReviewerNames } from "@/lib/tip-cycle";

export default function YoPage() {
  return (
    <Suspense fallback={<p className="yo-soft p-8 text-muted">Cargando…</p>}>
      <Yo />
    </Suspense>
  );
}

async function Yo() {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const today = santiagoToday().date;
  const [wallets, tasks, notices, movements, goalsData, reviewerNames] = await Promise.all([
    walletsSnapshot(child.familyId, child._id),
    ensureTasksForDate(child, today),
    listChildNotices(child),
    listChildMovements(child),
    listGoalsForChild(child, "active"),
    listReviewerNames(child.familyId),
  ]);
  const favorite = goalsData.goals.find((goal) => goal.isFavorite) ?? null;
  const tipApproved = notices.filter((item) => item.kind === "tip" && item.text.includes("recibiste un tip"));
  const interestUnread = notices.some((item) => item.kind === "interest" && !item.read);
  const cheer = tipApproved.length
    ? `Terminaste y recibiste tu tip.`
    : interestUnread
      ? "Te llegaron intereses. Míralos en la campana."
      : notices.some((item) => item.kind === "tip" && item.text.includes("puede mejorar"))
        ? "Hay una tarea que puede mejorar. Mírala en la campana."
        : "Viniste a mirar tus Huchas. Marca tus Tips cuando los termines.";

  return (
    <ChildShell>
      <header className="yo-rise">
        <p className="text-center text-2xl font-extrabold tracking-tight text-accent lg:text-left">
          MiHucha
          <span className="mx-auto mt-0.5 block h-1 w-10 rounded-full bg-accent/40 lg:mx-0" />
        </p>
        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c4b5fd] to-accent text-lg font-extrabold text-white shadow-md"
              aria-hidden
            >
              {child.name.trim().charAt(0).toLocaleUpperCase("es") || "?"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">¡Hey, {child.name}!</h1>
              <p className="text-xs text-muted sm:text-sm">Tu dinero, tus planes</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NewsBell
              items={notices.map((item) => ({
                id: item.id,
                kind: item.kind,
                when: item.when,
                text: item.text,
                read: item.read,
              }))}
            />
            <ChildSignOut name={child.name} cheer={cheer} />
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-6 xl:space-y-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch xl:gap-8">
          <ChildFavoriteGoal favorite={favorite} hasActiveGoals={goalsData.goals.length > 0} />
          <ChildWallets initial={wallets} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:gap-8">
          <TaskCart tasks={tasks} reviewerNames={reviewerNames} />
          <div className="space-y-6">
            <ChildMovements rows={movements} />
            <Link
              href="/yo/objetivos"
              className="yo-rise-3 flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-4 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(109,76,255,0.35)]"
            >
              Ver mis objetivos →
            </Link>
          </div>
        </div>
      </div>
    </ChildShell>
  );
}
