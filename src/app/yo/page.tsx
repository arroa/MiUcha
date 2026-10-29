import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DayCalendar, TaskCart } from "@/components/child-day";
import { NewsBell } from "@/components/news-bell";
import { ChildSignOut } from "@/components/sign-out";
import { getChildSession, walletsForChild } from "@/lib/child-account";
import { addDays, dayLabel, santiagoToday } from "@/lib/santiago-date";
import { ensureTasksForDate, listChildNews, type TaskView } from "@/lib/tip-cycle";

const order = ["inversion", "gasto", "donaciones"] as const;

const labels = {
  inversion: "Inversión",
  gasto: "Gasto",
  donaciones: "Donaciones",
} as const;

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

function newsText(task: TaskView) {
  if (task.status === "approved") return `${task.title}: recibiste un tip de $${task.amountMinor.toLocaleString("es-CL")}.`;
  if (task.status === "rejected") return task.reviewNote ? `${task.title} no quedó hecha. ${task.reviewNote}` : `${task.title} no quedó hecha.`;
  return task.reviewNote ? `${task.title} puede mejorar. ${task.reviewNote}` : `${task.title} puede mejorar.`;
}

async function Yo({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const child = await getChildSession();
  if (!child) redirect("/entrar");
  const { dia } = await searchParams;
  const today = santiagoToday().date;
  const oldest = addDays(today, -60);
  const date = chosenDay(dia, today);
  if (dia && dia !== date) redirect(date === today ? "/yo" : `/yo?dia=${date}`);
  const [wallets, tasks, news] = await Promise.all([walletsForChild(child), ensureTasksForDate(child, date), listChildNews(child)]);
  const rows = order.map((type) => wallets.find((wallet) => wallet.type === type)).filter((wallet) => wallet !== undefined);
  const approved = news.filter((task) => task.status === "approved");
  const cheer = approved.length
    ? `Terminaste ${approved.map((task) => task.title).join(" y ")} y recibiste tu tip.`
    : news.some((task) => task.status === "needs_improvement")
      ? "Hay una tarea que puede mejorar. Mírala en novedades."
      : "Viniste a mirar tus Uchas. Elige el día y marca tus tareas.";

  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 font-serif text-5xl">¡Hola, {child.name}!</h1>
        <div className="flex shrink-0 items-center gap-2">
          <NewsBell
            items={news.map((item) => ({
              id: item.id,
              when: dayLabel(item.occurrenceDate, today),
              text: newsText(item),
              read: item.read,
            }))}
          />
          <ChildSignOut name={child.name} cheer={cheer} />
        </div>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {rows.map((wallet) => (
          <article key={wallet.type} className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-muted">{labels[wallet.type]}</p>
            <p className="mt-2 font-serif text-4xl">${wallet.balanceMinor.toLocaleString("es-CL")}</p>
          </article>
        ))}
      </div>
      <DayCalendar today={today} selected={date} oldest={oldest} />
      <TaskCart date={date} today={today} tasks={tasks} />
    </main>
  );
}
