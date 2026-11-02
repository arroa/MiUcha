"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 6000;

/** Disparado cuando cambia la versión de sync de la familia (otro rol mutó datos). */
export const FAMILY_SYNC_EVENT = "mihucha:family-sync";

/** Si otro adulto/niño cambió la familia, refresca esta pestaña y avisa a los clientes. */
export function LiveSync() {
  const router = useRouter();
  const versionRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (busyRef.current || cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      busyRef.current = true;
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const json = (await response.json()) as { version?: unknown };
        const version = typeof json.version === "number" ? json.version : null;
        if (version === null) return;
        if (versionRef.current === null) {
          versionRef.current = version;
          return;
        }
        if (version !== versionRef.current) {
          versionRef.current = version;
          window.dispatchEvent(new CustomEvent(FAMILY_SYNC_EVENT, { detail: { version } }));
          router.refresh();
        }
      } catch {
        /* red flaky: el próximo poll reintenta */
      } finally {
        busyRef.current = false;
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
