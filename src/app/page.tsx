import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-20">
      <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">MiHucha</p>
      <h1 className="mt-3 max-w-xl font-serif text-6xl leading-none">Mi dinero. Mis decisiones.</h1>
      <p className="mt-6 max-w-lg text-lg text-muted">Los niños ganan plata haciendo cosas de la casa. Los adultos la guardan de verdad.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/entrar" className="rounded-2xl bg-accent px-6 py-4 font-bold text-white">
          Soy niño
        </Link>
        <Link href="/sign-in" className="rounded-2xl border border-line bg-card px-6 py-4 font-bold">
          Soy adulto
        </Link>
      </div>
    </main>
  );
}
