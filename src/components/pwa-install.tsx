"use client";

import { useEffect, useState } from "react";

import { UI_TOAST_DURATION_MS } from "@/lib/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeOrCriOS = /CriOS|Chrome|EdgiOS|FxiOS/.test(ua);
  return iOS && webkit && !chromeOrCriOS;
}

function InstallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Registra el SW mínimo (sin caché) para que el navegador permita instalar. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* silencioso: sin SW no hay prompt nativo, el botón igual orienta */
    });
  }, []);
  return null;
}

export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setHidden(true);
      return;
    }
    setHidden(false);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
      setToast("MiHucha quedó instalada.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), UI_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (hidden) return null;

  async function onInstall() {
    if (busy) return;
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        setDeferred(null);
        if (choice.outcome === "accepted") {
          setHidden(true);
          setToast("MiHucha quedó instalada.");
        }
      } catch {
        setToast("No se pudo abrir el instalador. Prueba el menú del navegador.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isIosSafari()) {
      setToast("En Safari: Compartir → Añadir a pantalla de inicio.");
      return;
    }
    setToast("Menú del navegador → Instalar aplicación (o Añadir a la pantalla de inicio).");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onInstall()}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-card px-6 py-4 font-bold disabled:opacity-50"
        aria-label="Instalar MiHucha en este dispositivo"
      >
        <InstallIcon className="h-5 w-5 shrink-0" />
        {busy ? "Instalando…" : "Instalar app"}
      </button>
      {toast ? (
        <p
          role="status"
          className="mihucha-toast fixed top-6 right-6 z-50 max-w-xs rounded-2xl border border-white/15 bg-foreground/60 px-4 py-3 text-sm font-bold text-background shadow-lg backdrop-blur-md"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}
