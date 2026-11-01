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

/** Alternativa A — Soft Quest: lavanda suave, cards amigables, cercano al mock ChatGPT. */
export function VariantSoft() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [doneTips, setDoneTips] = useState<Record<string, boolean>>({});
  const g = MOCK_FAVORITE_GOAL;

  return (
    <div className="min-h-screen bg-[#f4f0ff] text-[#1a1528]">
      <div className="mx-auto min-h-screen max-w-md pb-28">
        <header className="px-5 pb-2 pt-5">
          <p className="text-center text-2xl font-extrabold tracking-tight text-[#6d4cff]">
            MiUcha
            <span className="mx-auto mt-0.5 block h-1 w-10 rounded-full bg-[#6d4cff]/40" />
          </p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#7c5cff] text-lg font-bold text-white shadow-md">
                S
              </div>
              <div>
                <p className="text-lg font-extrabold">{MOCK_CHILD.greeting}</p>
                <p className="text-xs text-[#6b6280]">Tu dinero, tus planes</p>
              </div>
            </div>
            <button
              type="button"
              className="relative rounded-full bg-white p-2.5 shadow-sm"
              aria-label="Notificaciones"
              onClick={() => setTab("celebrar")}
            >
              <IconBell className="h-5 w-5 text-[#6d4cff]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff5a7a]" />
            </button>
          </div>
        </header>

        {tab === "inicio" ? (
          <main className="space-y-5 px-5 pt-3">
            <section className="proto-rise rounded-[1.75rem] bg-white p-5 shadow-[0_12px_40px_rgba(109,76,255,0.12)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8b83a5]">Mi objetivo favorito</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h2 className="text-2xl font-extrabold leading-tight">{g.name}</h2>
                <IconMouse className="h-16 w-16 shrink-0 drop-shadow-md" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8b83a5]">Precio</p>
                  <p className="mt-0.5 text-sm font-extrabold">{pesos(g.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8b83a5]">Disponible</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#12a35a]">{pesos(g.available)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8b83a5]">Falta</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#6d4cff]">{pesos(g.missing)}</p>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ebe4ff]">
                <div className="proto-bar-fill h-full rounded-full bg-gradient-to-r from-[#8b6cff] to-[#6d4cff]" style={{ width: `${g.progress}%` }} />
              </div>
              <p className="mt-2 text-right text-xs font-bold text-[#6d4cff]">{g.progress}%</p>
              <p className="mt-3 inline-flex rounded-full bg-[#efe9ff] px-3 py-1 text-xs font-bold text-[#5b45c4]">
                ✨ {g.message}
              </p>
            </section>

            <section className="proto-rise-delay-1">
              <h3 className="mb-3 text-sm font-extrabold text-[#3d3558]">Mis Uchas</h3>
              <div className="grid grid-cols-3 gap-2.5">
                <UchaSoft tone="rosa" icon={<IconCart className="h-5 w-5" />} label={MOCK_WALLETS.gasto.label} amount={MOCK_WALLETS.gasto.amount} hint={MOCK_WALLETS.gasto.hint} />
                <UchaSoft tone="verde" icon={<IconTrend className="h-5 w-5" />} label={MOCK_WALLETS.inversion.label} amount={MOCK_WALLETS.inversion.amount} hint={MOCK_WALLETS.inversion.hint} />
                <UchaSoft tone="amarillo" icon={<IconHeart className="h-5 w-5" />} label={MOCK_WALLETS.generosidad.label} amount={MOCK_WALLETS.generosidad.amount} hint={MOCK_WALLETS.generosidad.hint} />
              </div>
            </section>

            <section className="proto-rise-delay-2">
              <div className="mb-3 flex items-end justify-between">
                <h3 className="text-sm font-extrabold text-[#3d3558]">Mis Tips de hoy</h3>
                <button type="button" className="text-xs font-bold text-[#6d4cff]" onClick={() => setTab("celebrar")}>
                  Ver novedades
                </button>
              </div>
              <ul className="space-y-2.5">
                {MOCK_TIPS.map((tip) => {
                  const Icon = tipIconMap[tip.icon];
                  const done = doneTips[tip.id];
                  return (
                    <li key={tip.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#efe9ff] text-[#6d4cff]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{tip.title}</p>
                        <p className="text-sm font-extrabold text-[#12a35a]">+{pesos(tip.amount)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => setDoneTips((s) => ({ ...s, [tip.id]: true }))}
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${done ? "bg-[#d8f5e5] text-[#0d7a45]" : "bg-[#6d4cff] text-white"}`}
                      >
                        {done ? "Listo" : "Hecho"}
                      </button>
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 rounded-2xl border-2 border-[#9fe0b8] bg-[#f0fbf4] px-3 py-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#d8f5e5] text-[#0d7a45]">
                    <IconLeaf className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-bold">
                    Tu inversión ganó <span className="text-[#0d7a45]">$250</span>
                  </p>
                </li>
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setTab("objetivos")}
              className="proto-rise-delay-3 w-full rounded-2xl bg-[#6d4cff] py-4 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(109,76,255,0.35)]"
            >
              Ver mis objetivos →
            </button>
          </main>
        ) : null}

        {tab === "objetivos" ? (
          <main className="space-y-4 px-5 pt-3">
            <button type="button" className="text-sm font-bold text-[#6d4cff]" onClick={() => setTab("inicio")}>
              ← Volver
            </button>
            <h2 className="text-2xl font-extrabold">Mis objetivos</h2>
            <article className="rounded-3xl border-2 border-[#6d4cff] bg-white p-4">
              <p className="text-xs font-bold text-[#6d4cff]">★ Favorito</p>
              <p className="mt-1 text-xl font-extrabold">{g.name}</p>
              <p className="text-sm text-[#6b6280]">
                {pesos(g.available)} de {pesos(g.price)} · {g.progress}%
              </p>
            </article>
            {MOCK_OTHER_GOALS.map((goal) => {
              const p = goalProgress(goal.price);
              return (
                <article key={goal.id} className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-lg font-extrabold">{goal.name}</p>
                  <p className="text-sm text-[#6b6280]">
                    {pesos(MOCK_FAVORITE_GOAL.available)} de {pesos(goal.price)} · {p}%
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ebe4ff]">
                    <div className="h-full rounded-full bg-[#6d4cff]" style={{ width: `${p}%` }} />
                  </div>
                </article>
              );
            })}
            <button type="button" className="w-full rounded-2xl border-2 border-dashed border-[#6d4cff]/40 py-4 font-bold text-[#6d4cff]">
              + Nuevo objetivo
            </button>
          </main>
        ) : null}

        {tab === "celebrar" ? (
          <main className="space-y-4 px-5 pt-3">
            <button type="button" className="text-sm font-bold text-[#6d4cff]" onClick={() => setTab("inicio")}>
              ← Volver
            </button>
            <h2 className="text-2xl font-extrabold">Novedades</h2>
            {MOCK_NEWS.map((n) => (
              <div key={n.id} className="proto-coin-pop rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-[#8b83a5]">{n.kind === "tip" ? "Tip" : "Inversión"}</p>
                <p className="mt-1 font-bold">{n.text}</p>
              </div>
            ))}
            <div className="proto-pulse-once rounded-3xl bg-gradient-to-br from-[#8b6cff] to-[#5b45c4] p-5 text-white">
              <p className="text-sm font-bold opacity-80">Demo de celebración</p>
              <p className="mt-1 text-xl font-extrabold">¡Tip acreditado!</p>
              <p className="mt-3 text-sm">Se reparte entre Gasto, Inversión y Generosidad (según % reales de la familia).</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <span className="rounded-xl bg-white/15 py-2">Gasto</span>
                <span className="rounded-xl bg-white/15 py-2">Inversión</span>
                <span className="rounded-xl bg-white/15 py-2">Generosidad</span>
              </div>
            </div>
          </main>
        ) : null}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-[#ddd6f3] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-md justify-around px-2 py-2">
            {(
              [
                ["inicio", "Inicio"],
                ["objetivos", "Objetivos"],
                ["celebrar", "Novedades"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === id ? "bg-[#efe9ff] text-[#6d4cff]" : "text-[#8b83a5]"}`}
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

function UchaSoft({
  tone,
  icon,
  label,
  amount,
  hint,
}: {
  tone: "rosa" | "verde" | "amarillo";
  icon: ReactNode;
  label: string;
  amount: number;
  hint: string;
}) {
  const tones = {
    rosa: "bg-[#ffe8ee] text-[#c2345a]",
    verde: "bg-[#e5f8ec] text-[#0d7a45]",
    amarillo: "bg-[#fff4d6] text-[#a66b00]",
  };
  return (
    <article className={`rounded-2xl p-3 ${tones[tone]}`}>
      <div className="mb-2 opacity-80">{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-base font-extrabold leading-none text-[#1a1528]">{pesos(amount)}</p>
      <p className="mt-2 text-[10px] leading-snug opacity-70">{hint}</p>
    </article>
  );
}
