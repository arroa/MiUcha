import Link from "next/link";

const VARIANTS = [
  { href: "/prototipos/soft", id: "A", name: "Soft Quest", blurb: "Cercano al mock" },
  { href: "/prototipos/hud", id: "B", name: "Mission HUD", blurb: "Más videojuego" },
  { href: "/prototipos/pop", id: "C", name: "Clean Pop", blurb: "App teen moderna" },
] as const;

export function ProtoBanner({ active }: { active: "A" | "B" | "C" | "hub" }) {
  return (
    <div className="sticky top-0 z-[60] border-b border-black/10 bg-black/85 px-3 py-2 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-2">
        <Link href="/prototipos" className="text-xs font-bold tracking-wide text-white/80 hover:text-white">
          ← Prototipos · FASE 1
        </Link>
        <p className="text-[10px] uppercase tracking-wider text-amber-300">Solo visual · sin APIs</p>
      </div>
      {active !== "hub" ? (
        <div className="mx-auto mt-2 flex max-w-lg gap-1.5">
          {VARIANTS.map((v) => {
            const on = v.id === active;
            return (
              <Link
                key={v.id}
                href={v.href}
                className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[11px] font-bold transition ${
                  on ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {v.id}. {v.name}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { VARIANTS };
