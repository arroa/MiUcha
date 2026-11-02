"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-20">
      <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">MiHucha</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">Estamos un momento fuera</h1>
      <p className="mt-4 text-lg text-muted">
        El servicio está temporalmente no disponible. Tus datos están a salvo; inténtalo de nuevo en unos minutos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 w-fit rounded-2xl bg-accent px-6 py-4 font-bold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
