/** Etiquetas UI de Huchas. Seguro para client components (sin Mongo/headers). */

export type WalletType = "inversion" | "gasto" | "donaciones";

export const WALLET_TYPES: WalletType[] = ["gasto", "donaciones", "inversion"];

export const WALLET_LABELS: Record<WalletType, string> = {
  gasto: "Gasto",
  /** Clave técnica `donaciones`; etiqueta de producto: Generosidad. */
  donaciones: "Generosidad",
  inversion: "Inversión",
};
