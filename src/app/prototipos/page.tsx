import Link from "next/link";

import { ProtoBanner, VARIANTS } from "@/components/prototipos/proto-shell";

export default function PrototiposHubPage() {
  return (
    <div className="min-h-screen bg-[#0f0e14] text-white">
      <ProtoBanner active="hub" />
      <main className="mx-auto max-w-lg px-5 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a78bfa]">FASE 1 · Solo visual</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">MiUcha Quest + Pop</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Tres direcciones con los mismos datos ficticios (Salvador, mouse gamer, 3 Uchas, Tips e intereses).
          Nada toca `/yo`, Mongo ni la lógica financiera. Elige la que más WOW te genere para 10–14 años.
        </p>

        <ul className="mt-8 space-y-4">
          {VARIANTS.map((v) => (
            <li key={v.id}>
              <Link
                href={v.href}
                className="block rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-[#a78bfa]/50 hover:bg-white/10"
              >
                <p className="text-xs font-bold text-[#a78bfa]">Alternativa {v.id}</p>
                <p className="mt-1 text-2xl font-extrabold">{v.name}</p>
                <p className="mt-1 text-sm text-white/60">{v.blurb}</p>
                <p className="mt-3 text-sm font-bold text-[#c4b5fd]">Abrir prototipo →</p>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm leading-relaxed text-amber-50">
          <p className="font-bold text-amber-200">Datos compartidos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-50/80">
            <li>Disponible objetivos = Gasto $12.000 + Inversión $16.000 = $28.000</li>
            <li>Generosidad $4.000 visible, no suma al progreso</li>
            <li>Mouse gamer $35.000 → 80%</li>
            <li>Etiqueta: Generosidad (clave técnica `donaciones`)</li>
          </ul>
        </section>

        <p className="mt-8 text-center text-xs text-white/40">
          Tras elegir una dirección, pasamos a FASE 2 (rediseño de `/yo` productivo).
        </p>
      </main>
    </div>
  );
}
