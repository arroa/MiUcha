/** Datos ficticios compartidos por las 3 alternativas visuales (FASE 1). */

export const MOCK_CHILD = {
  name: "Salvador",
  greeting: "¡Hey, Salvador!",
};

export const MOCK_WALLETS = {
  gasto: { label: "Gasto", amount: 12_000, hint: "Lo que usas hoy" },
  inversion: { label: "Inversión", amount: 16_000, hint: "Lo que hace crecer tu plata" },
  /** En código productivo la clave es `donaciones`. Etiqueta infantil propuesta. */
  generosidad: { label: "Generosidad", amount: 4_000, hint: "Lo que compartes con otros" },
} as const;

/** Disponible para objetivos = Gasto + Inversión (sin Generosidad). */
export const MOCK_AVAILABLE_FOR_GOALS =
  MOCK_WALLETS.gasto.amount + MOCK_WALLETS.inversion.amount;

export const MOCK_FAVORITE_GOAL = {
  name: "Mouse gamer",
  price: 35_000,
  available: MOCK_AVAILABLE_FOR_GOALS,
  missing: Math.max(0, 35_000 - MOCK_AVAILABLE_FOR_GOALS),
  progress: Math.min(100, Math.round((MOCK_AVAILABLE_FOR_GOALS / 35_000) * 100)),
  message: "¡Ya puedes verlo cerca!",
};

export const MOCK_TIPS = [
  { id: "1", title: "Pasear al perro", amount: 1_000, icon: "paw" as const, status: "pending" as const },
  { id: "2", title: "Hacer la cama", amount: 500, icon: "bed" as const, status: "pending" as const },
  { id: "3", title: "Practicar lectura", amount: 800, icon: "book" as const, status: "pending" as const },
];

export const MOCK_NEWS = [
  { id: "n1", kind: "tip" as const, text: "Recibiste un Tip de $1.000." },
  { id: "n2", kind: "interest" as const, text: "Tu Inversión ganó $250." },
];

export const MOCK_OTHER_GOALS = [
  { id: "g2", name: "Audífonos", price: 60_000 },
  { id: "g3", name: "Bicicleta", price: 200_000 },
];

export function pesos(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function goalProgress(price: number) {
  return Math.min(100, Math.round((MOCK_AVAILABLE_FOR_GOALS / price) * 100));
}
