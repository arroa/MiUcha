"use client";

import { useState, type ReactNode } from "react";

import {
  MOCK_CHILD,
  MOCK_FAVORITE_GOAL,
  MOCK_NEWS,
  MOCK_OTHER_GOALS,
  MOCK_TIPS,
  MOCK_WALLETS,
  goalProgress,
  pesos,
} from "@/components/prototipos/mock-data";
import {
  IconBell,
  IconCart,
  IconHeart,
  IconLeaf,
  IconMouse,
  IconTrend,
  tipIconMap,
} from "@/components/prototipos/proto-icons";
import "@/components/prototipos/proto-animations.css";

type Tab = "inicio" | "objetivos" | "celebrar";

/** Alternativa B — Mission HUD: energía de misión, contraste alto, progreso tipo quest. */
export function VariantHud() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [doneTips, setDoneTips] = useState<Record<string, boolean>>({});
  const g = MOCK_FAVORITE_GOAL;
  const doneCount = Object.values(doneTips).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#12101c] text-[#f4f0ff]">
      <div className="mx-auto min-h-screen max-w-md pb-28">
        <header className="relative overflow-hidden px-5 pb-6 pt-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#6d4cff]/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-8 top-20 h-28 w-28 rounded-full bg-[#00d4a0]/20 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9b8fd4]">Misión del día</p>
              <h1 className="mt-1 text-2xl font-black">{MOCK_CHILD.greeting}</h1>
              <p className="mt-1 text-sm text-[#a99fd0]">
                Tips listos {doneCount}/{MOCK_TIPS.length}
              </p>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-white/15 bg-white/5 p-3"
              aria-label="Notificaciones"
              onClick={() => setTab("celebrar")}
            >
              <IconBell className="h-5 w-5 text-[#c4b5fd]" />
            </button>
          </div>
        </header>

        {tab === "inicio" ? (
          <main className="space-y-4 px-4">
            <section className="proto-rise relative overflow-hidden rounded-3xl border border-[#6d4cff]/40 bg-gradient-to-br from-[#2a2150] to-[#1a1430] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#00d4a0]">Objetivo principal</p>
                  <h2 className="mt-1 text-2xl font-black">{g.name}</h2>
                </div>
                <IconMouse className="h-14 w-14" />
              </div>
              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span className="text-[#a99fd0]">Progreso</span>
                  <span className="text-[#00d4a0]">{g.progress}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                  <div
                    className="proto-bar-fill h-full rounded-full bg-gradient-to-r from-[#00d4a0] via-[#6d4cff] to-[#ff5ac8]"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Meta" value={pesos(g.price)} />
                <Stat label="Tienes" value={pesos(g.available)} accent />
                <Stat label="Falta" value={pesos(g.missing)} />
              </div>
              <p className="mt-4 rounded-2xl bg-[#00d4a0]/10 px-3 py-2 text-center text-sm font-bold text-[#00d4a0]">
                {g.message}
              </p>
            </section>

            <section className="proto-rise-delay-1">
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-[#9b8fd4]">Tus Uchas</h3>
              <div className="grid gap-2">
                <UchaHud icon={<IconCart className="h-5 w-5" />} label={MOCK_WALLETS.gasto.label} amount={MOCK_WALLETS.gasto.amount} hint={MOCK_WALLETS.gasto.hint} color="#ff6b8a" />
                <UchaHud icon={<IconTrend className="h-5 w-5" />} label={MOCK_WALLETS.inversion.label} amount={MOCK_WALLETS.inversion.amount} hint={MOCK_WALLETS.inversion.hint} color="#00d4a0" />
                <UchaHud icon={<IconHeart className="h-5 w-5" />} label={MOCK_WALLETS.generosidad.label} amount={MOCK_WALLETS.generosidad.amount} hint={MOCK_WALLETS.generosidad.hint} color="#ffc14d" />
              </div>
            </section>

            <section className="proto-rise-delay-2">
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-[#9b8fd4]">Quests de hoy</h3>
              <ul className="space-y-2">
                {MOCK_TIPS.map((tip, i) => {
                  const Icon = tipIconMap[tip.icon];
                  const done = doneTips[tip.id];
                  return (
                    <li
                      key={tip.id}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                        done ? "border-[#00d4a0]/40 bg-[#00d4a0]/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6d4cff]/30 text-[#c4b5fd]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#9b8fd4]">QUEST 0{i + 1}</p>
                        <p className="truncate font-bold">{tip.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[#00d4a0]">+{pesos(tip.amount)}</p>
                        <button
                          type="button"
                          disabled={done}
                          onClick={() => setDoneTips((s) => ({ ...s, [tip.id]: true }))}
                          className="mt-1 text-[11px] font-bold text-[#c4b5fd] disabled:text-[#00d4a0]"
                        >
                          {done ? "COMPLETA" : "MARCAR"}
                        </button>
                      </div>
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 rounded-2xl border border-[#00d4a0]/30 bg-[#00d4a0]/5 px-3 py-3">
                  <IconLeaf className="h-5 w-5 text-[#00d4a0]" />
                  <p className="text-sm font-bold">Bonus: Inversión +$250</p>
                </li>
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setTab("objetivos")}
              className="proto-rise-delay-3 w-full rounded-2xl bg-[#6d4cff] py-4 text-sm font-black tracking-wide text-white shadow-[0_0_30px_rgba(109,76,255,0.45)]"
            >
              ABRIR MIS OBJETIVOS
            </button>
          </main>
        ) : null}

        {tab === "objetivos" ? (
          <main className="space-y-3 px-4">
            <button type="button" className="text-sm font-bold text-[#c4b5fd]" onClick={() => setTab("inicio")}>
              ← Base
            </button>
            <h2 className="text-2xl font-black">Inventario de metas</h2>
            <article className="rounded-3xl border border-[#00d4a0]/50 bg-[#00d4a0]/10 p-4">
              <p className="text-[10px] font-bold tracking-widest text-[#00d4a0]">EQUIPADO</p>
              <p className="mt-1 text-xl font-black">{g.name}</p>
              <p className="text-sm text-[#a99fd0]">
                {g.progress}% · falta {pesos(g.missing)}
              </p>
            </article>
            {MOCK_OTHER_GOALS.map((goal) => {
              const p = goalProgress(goal.price);
              return (
                <article key={goal.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-lg font-black">{goal.name}</p>
                  <p className="text-sm text-[#a99fd0]">{p}% con tu plata actual</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-[#6d4cff]" style={{ width: `${p}%` }} />
                  </div>
                </article>
              );
            })}
          </main>
        ) : null}

        {tab === "celebrar" ? (
          <main className="space-y-3 px-4">
            <button type="button" className="text-sm font-bold text-[#c4b5fd]" onClick={() => setTab("inicio")}>
              ← Base
            </button>
            <h2 className="text-2xl font-black">Feed de recompensas</h2>
            {MOCK_NEWS.map((n) => (
              <div key={n.id} className="proto-coin-pop rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold">{n.text}</p>
              </div>
            ))}
            <div className="proto-pulse-once rounded-3xl border border-[#ff5ac8]/40 bg-gradient-to-r from-[#6d4cff]/40 to-[#ff5ac8]/30 p-5">
              <p className="text-xs font-bold tracking-widest text-[#ff5ac8]">LOOT UNLOCKED</p>
              <p className="mt-1 text-xl font-black">Tip acreditado · $1.000</p>
              <p className="mt-2 text-sm text-[#d4ccec]">Reparto real entre las 3 Uchas (sin inventar %). Demo visual.</p>
            </div>
          </main>
        ) : null}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#12101c]/95 backdrop-blur">
          <div className="mx-auto flex max-w-md justify-around px-2 py-2">
            {(
              [
                ["inicio", "Base"],
                ["objetivos", "Metas"],
                ["celebrar", "Loot"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-xl px-4 py-2 text-xs font-black tracking-wide ${
                  tab === id ? "bg-[#6d4cff] text-white" : "text-[#9b8fd4]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-black/25 px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-[#9b8fd4]">{label}</p>
      <p className={`mt-0.5 text-sm font-black ${accent ? "text-[#00d4a0]" : ""}`}>{value}</p>
    </div>
  );
}

function UchaHud({
  icon,
  label,
  amount,
  hint,
  color,
}: {
  icon: ReactNode;
  label: string;
  amount: number;
  hint: string;
  color: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}22`, color }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
          {label}
        </p>
        <p className="truncate text-[11px] text-[#a99fd0]">{hint}</p>
      </div>
      <p className="text-lg font-black">{pesos(amount)}</p>
    </article>
  );
}
