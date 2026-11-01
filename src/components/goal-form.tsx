"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { GoalIconPicker } from "@/components/goal-icon-picker";
import { DEFAULT_GOAL_ICON_ID, goalIconDef } from "@/lib/goal-icons";
import type { GoalView } from "@/lib/goals";
import { parsePesosInput } from "@/lib/pesos-input";
import { UI_TOAST_DURATION_MS } from "@/lib/ui";

function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function GoalForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: GoalView;
}) {
  const router = useRouter();
  const titleId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.targetAmountMinor) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [productUrl, setProductUrl] = useState(initial?.productUrl ?? "");
  const [iconId, setIconId] = useState(initial?.iconId ?? DEFAULT_GOAL_ICON_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const Icon = goalIconDef(iconId).Icon;
  const parsedPreview = parsePesosInput(price);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = parsePesosInput(price);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (!name.trim()) {
      setError("Escribe qué quieres conseguir.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        targetAmountMinor: parsed.value,
        iconId,
        productUrl: productUrl.trim() || null,
      };
      const res = await fetch(mode === "create" ? "/api/goals" : `/api/goals/${initial!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; goal?: GoalView } | null;
      if (!res.ok || !data?.goal) {
        setError(data?.error ?? "No se pudo guardar el objetivo.");
        return;
      }
      setToast(mode === "create" ? "Objetivo guardado." : "Cambios guardados.");
      window.setTimeout(() => {
        router.push(`/yo/objetivos/${data.goal!.id}`);
        router.refresh();
      }, 400);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="relative space-y-5" aria-labelledby={titleId}>
      {busy ? <div className="absolute inset-0 z-10 rounded-3xl bg-white/50" aria-busy="true" /> : null}
      <h1 id={titleId} className="text-2xl font-extrabold">
        {mode === "create" ? "Nuevo objetivo" : "Editar objetivo"}
      </h1>

      <div className="rounded-3xl bg-card p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Vista previa</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#efe9ff] text-accent">
            <Icon className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{name.trim() || "Tu objetivo"}</p>
            <p className="text-sm text-muted">{parsedPreview.ok ? pesos(parsedPreview.value) : "¿Cuánto cuesta?"}</p>
          </div>
        </div>
      </div>

      <label className="block text-sm font-bold">
        ¿Qué quieres conseguir?
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          disabled={busy}
          className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          placeholder="Ej: Mouse gamer"
        />
      </label>

      <label className="block text-sm font-bold">
        ¿Cuánto cuesta?
        <input
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={busy}
          className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          placeholder="35000"
        />
      </label>

      <label className="block text-sm font-bold">
        Cuéntanos un poquito más <span className="font-normal text-muted">(opcional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
          disabled={busy}
          rows={3}
          className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          placeholder="Color, modelo, por qué lo quieres…"
        />
      </label>

      <label className="block text-sm font-bold">
        ¿Dónde lo viste? <span className="font-normal text-muted">(opcional)</span>
        <input
          type="url"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          disabled={busy}
          className="mt-1.5 w-full rounded-2xl border border-line bg-white px-4 py-3 font-normal"
          placeholder="https://www.tienda.cl/..."
        />
      </label>

      <GoalIconPicker value={iconId} onChange={setIconId} disabled={busy} />

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-accent py-3.5 font-extrabold text-white shadow-[0_8px_24px_rgba(109,76,255,0.28)] disabled:opacity-50"
      >
        {busy ? "Guardando…" : mode === "create" ? "Guardar objetivo" : "Guardar cambios"}
      </button>

      {toast ? (
        <p
          role="status"
          className="miucha-toast fixed top-20 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md"
          style={{ animationDuration: `${UI_TOAST_DURATION_MS}ms` }}
        >
          {toast}
        </p>
      ) : null}
    </form>
  );
}
