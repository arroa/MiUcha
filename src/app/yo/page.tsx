import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DayCalendar, TaskCart } from "@/components/child-day";
import { ChildMovements } from "@/components/child-movements";
import { ChildWallets } from "@/components/child-wallets";
import { NewsBell } from "@/components/news-bell";
import { ChildSignOut } from "@/components/sign-out";
import { getChildSession } from "@/lib/child-account";
import { listChildMovements, listChildNotices } from "@/lib/child-feed";
import { walletsSnapshot } from "@/lib/money";
import { addDays, santiagoToday } from "@/lib/santiago-date";
import { ensureTasksForDate } from "@/lib/tip-cycle";

export default function YoPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Cargando…</p>}>
      <Yo searchParams={searchParams} />
    </Suspense>
  );
}

function chosenDay(raw: string | undefined, today: string) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  if (raw > today) return today;
  const oldest = addDays(today, -60);
  return raw < oldest ? oldest : raw;
}

async function Yo({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const { dia } = await searchParams;
  const today = santiagoToday().date;
  const oldest = addDays(today, -60);
  const date = chosenDay(dia, today);
  if (dia && dia !== date) redirect(date === today ? "/yo" : `/yo?dia=${date}`);
  const [wallets, tasks, notices, movements] = await Promise.all([
    walletsSnapshot(child.familyId, child._id),
    ensureTasksForDate(child, date),
    listChildNotices(child),
    listChildMovements(child),
  ]);
  const tipApproved = notices.filter((item) => item.kind === "tip" && item.text.includes("recibiste un tip"));
  const interestUnread = notices.some((item) => item.kind === "interest" && !item.read);
  const cheer = tipApproved.length
    ? `Terminaste y recibiste tu tip.`
    : interestUnread
      ? "Te llegaron intereses. Míralos en la campana."
      : notices.some((item) => item.kind === "tip" && item.text.includes("puede mejorar"))
        ? "Hay una tarea que puede mejorar. Mírala en la campana."
        : "Viniste a mirar tus Uchas. Elige el día y marca tus tareas.";

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-serif text-5xl">¡Hola, {child.name}!</h1>
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
      </header>
      <ChildWallets initial={wallets} />
      <DayCalendar today={today} selected={date} oldest={oldest} />
      <TaskCart date={date} today={today} tasks={tasks} />
      <ChildMovements rows={movements} />
    </main>
  );
}
