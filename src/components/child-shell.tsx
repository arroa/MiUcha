import type { ReactNode } from "react";

/** Contenedor compartido de la experiencia infantil. Más ancho en PC. */
export function ChildShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="yo-soft">
      <main className={`mx-auto min-h-full w-full max-w-5xl px-5 pb-12 pt-6 sm:px-8 lg:px-10 ${className}`.trim()}>
        {children}
      </main>
    </div>
  );
}
