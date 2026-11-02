/** El niño toca “Lo arreglé” en la campana; Mis Tips abre el reenvío. */
export const MIHUCHA_ARREGLAR_TIP = "mihucha-arreglar-tip";

export type ArreglarTipDetail = { id: string };

export function dispatchArreglarTip(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MIHUCHA_ARREGLAR_TIP, { detail: { id } satisfies ArreglarTipDetail }));
}
