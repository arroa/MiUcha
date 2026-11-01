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

/**
 * Alternativa C — Clean Pop: tipografía expresiva, coral + teal,
 * menos “juego”, más app teen contemporánea. Evita el look banca adulta actual.
 */
export function VariantPop() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [doneTips, setDoneTips] = useState<Record<string, boolean>>({});
  const g = MOCK_FAVORITE_GOAL;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1c1916]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, #ffd8c8 0%, transparent 42%), radial-gradient(circle at 88% 8%, #c8f0e8 0%, transparent 38%)",
        }}
      />
      <div className="relative mx-auto min-h-screen max-w-md pb-28">
        <header className="px-5 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <p className="font-serif text-3xl tracking-tight text-[#e85d4c]">
              MiUcha
            </p>
            <button
              type="button"
              className="rounded-full border border-[#1c1916]/10 bg-white/70 p-2.5"
              aria-label="Notificaciones"
              onClick={() => setTab("celebrar")}
            >
              <IconBell className="h-5 w-5" />
            </button>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-none tracking-tight">{MOCK_CHILD.greeting}</h1>
          <p className="mt-2 max-w-[16rem] text-sm text-[#6a635c]">Hoy puedes acercarte a tu mouse gamer.</p>
        </header>

        {tab === "inicio" ? (
          <main className="mt-6 space-y-6 px-5">
            <section className="proto-rise overflow-hidden rounded-[2rem] bg-[#1c1916] text-[#faf7f2]">
              <div className="flex items-end justify-between gap-3 px-5 pt-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e85d4c]">Favorito</p>
                  <h2 className="mt-1 font-serif text-3xl leading-none">{g.name}</h2>
                </div>
                <IconMouse className="mb-1 h-16 w-16 opacity-90" />
              </div>
              <div className="mt-6 px-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-serif text-5xl leading-none">{g.progress}%</p>
                  <p className="text-right text-sm text-[#b8b0a6]">
                    Faltan
                    <br />
                    <span className="font-bold text-white">{pesos(g.missing)}</span>
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="proto-bar-fill h-full rounded-full bg-[#e85d4c]" style={{ width: `${g.progress}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 py-4 text-sm">
                  <div>
                    <p className="text-[#b8b0a6]">Precio</p>
                    <p className="font-bold">{pesos(g.price)}</p>
                  </div>
                  <div>
                    <p className="text-[#b8b0a6]">Disponible*</p>
                    <p className="font-bold text-[#5ecf9a]">{pesos(g.available)}</p>
                  </div>
                </div>
                <p className="pb-4 text-[11px] text-[#8a8278]">* Gasto + Inversión. Generosidad no cuenta para comprar.</p>
              </div>
            </section>

            <section className="proto-rise-delay-1">
              <h3 className="mb-3 font-serif text-2xl">Mis Uchas</h3>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <UchaPop accent="#ffd0c4" icon={<IconCart className="h-5 w-5" />} label={MOCK_WALLETS.gasto.label} amount={MOCK_WALLETS.gasto.amount} hint={MOCK_WALLETS.gasto.hint} />
                <UchaPop accent="#c8f0e8" icon={<IconTrend className="h-5 w-5" />} label={MOCK_WALLETS.inversion.label} amount={MOCK_WALLETS.inversion.amount} hint={MOCK_WALLETS.inversion.hint} />
                <UchaPop accent="#ffe6a8" icon={<IconHeart className="h-5 w-5" />} label={MOCK_WALLETS.generosidad.label} amount={MOCK_WALLETS.generosidad.amount} hint={MOCK_WALLETS.generosidad.hint} />
              </div>
            </section>

            <section className="proto-rise-delay-2">
              <div className="mb-3 flex items-end justify-between">
                <h3 className="font-serif text-2xl">Tips de hoy</h3>
                <span className="text-xs font-bold text-[#6a635c]">{MOCK_TIPS.length} pendientes</span>
              </div>
              <ul className="space-y-3">
                {MOCK_TIPS.map((tip) => {
                  const Icon = tipIconMap[tip.icon];
                  const done = doneTips[tip.id];
                  return (
                    <li key={tip.id} className="flex items-center gap-3 border-b border-[#1c1916]/10 pb-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#e85d4c] shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{tip.title}</p>
                        <p className="text-sm font-bold text-[#2f9e6a]">+{pesos(tip.amount)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => setDoneTips((s) => ({ ...s, [tip.id]: true }))}
                        className={`h-10 w-10 rounded-full border-2 text-sm font-black ${
                          done ? "border-[#2f9e6a] bg-[#2f9e6a] text-white" : "border-[#1c1916]/25"
                        }`}
                        aria-label={done ? "Completado" : "Marcar hecho"}
                      >
                        {done ? "✓" : ""}
                      </button>
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 rounded-2xl bg-[#e8faf2] px-3 py-3">
                  <IconLeaf className="h-5 w-5 text-[#2f9e6a]" />
                  <p className="text-sm font-bold">
                    Tu inversión ganó <span className="text-[#2f9e6a]">$250</span>
                  </p>
                </li>
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setTab("objetivos")}
              className="proto-rise-delay-3 w-full rounded-full bg-[#e85d4c] py-4 text-base font-extrabold text-white"
            >
              Ver mis objetivos →
            </button>
          </main>
        ) : null}

        {tab === "objetivos" ? (
          <main className="mt-4 space-y-4 px-5">
            <button type="button" className="text-sm font-bold text-[#e85d4c]" onClick={() => setTab("inicio")}>
              ← Inicio
            </button>
            <h2 className="font-serif text-4xl leading-none">Lo que quiero</h2>
            <article className="rounded-[1.5rem] bg-[#1c1916] p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#e85d4c]">Favorito</p>
              <p className="mt-1 font-serif text-3xl">{g.name}</p>
              <p className="mt-2 text-sm text-[#b8b0a6]">
                {g.progress}% · {pesos(g.available)} disponibles
              </p>
            </article>
            {MOCK_OTHER_GOALS.map((goal) => {
              const p = goalProgress(goal.price);
              return (
                <article key={goal.id} className="rounded-[1.5rem] bg-white/80 p-5 shadow-sm">
                  <p className="font-serif text-2xl">{goal.name}</p>
                  <p className="mt-1 text-sm text-[#6a635c]">
                    {p}% con lo que tienes hoy · {pesos(goal.price)}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1c1916]/10">
                    <div className="h-full rounded-full bg-[#e85d4c]" style={{ width: `${p}%` }} />
                  </div>
                </article>
              );
            })}
            <button type="button" className="w-full rounded-full border-2 border-dashed border-[#1c1916]/25 py-4 font-bold">
              Quiero algo nuevo
            </button>
          </main>
        ) : null}

        {tab === "celebrar" ? (
          <main className="mt-4 space-y-4 px-5">
            <button type="button" className="text-sm font-bold text-[#e85d4c]" onClick={() => setTab("inicio")}>
              ← Inicio
            </button>
            <h2 className="font-serif text-4xl leading-none">Qué pasó</h2>
            {MOCK_NEWS.map((n) => (
              <div key={n.id} className="proto-coin-pop rounded-2xl bg-white/90 p-4 shadow-sm">
                <p className="font-bold">{n.text}</p>
              </div>
            ))}
            <div className="proto-pulse-once rounded-[1.75rem] bg-[#e85d4c] p-5 text-white">
              <p className="text-sm font-bold opacity-80">Momento wow</p>
              <p className="mt-1 font-serif text-3xl leading-none">Tip acreditado</p>
              <p className="mt-3 text-sm">La plata se reparte en tus 3 Uchas. Sin números inventados.</p>
            </div>
          </main>
        ) : null}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-[#1c1916]/8 bg-[#faf7f2]/90 backdrop-blur">
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
                className={`rounded-full px-4 py-2 text-xs font-extrabold ${
                  tab === id ? "bg-[#1c1916] text-white" : "text-[#6a635c]"
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

function UchaPop({
  accent,
  icon,
  label,
  amount,
  hint,
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  amount: number;
  hint: string;
}) {
  return (
    <article className="min-w-[9.5rem] flex-1 rounded-[1.35rem] p-4" style={{ background: accent }}>
      <div className="mb-3 opacity-70">{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-serif text-2xl leading-none">{pesos(amount)}</p>
      <p className="mt-2 text-[11px] leading-snug opacity-70">{hint}</p>
    </article>
  );
}
