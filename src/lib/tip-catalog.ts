export const TIP_CATALOG = [
  { key: "hacer-la-cama", title: "Hacer la cama", suggestedMinor: 500 },
  { key: "ordenar-pieza", title: "Ordenar pieza", suggestedMinor: 1000 },
  { key: "juntar-la-ropa", title: "Juntar la ropa sucia", suggestedMinor: 500 },
  { key: "poner-la-mesa", title: "Poner la mesa", suggestedMinor: 500 },
  { key: "lavar-los-platos", title: "Lavar los platos", suggestedMinor: 500 },
  { key: "sacar-la-basura", title: "Sacar la basura", suggestedMinor: 500 },
  { key: "regar-plantas", title: "Regar plantas", suggestedMinor: 500 },
  { key: "alimentar-mascota", title: "Alimentar mascota", suggestedMinor: 500 },
  { key: "limpiar-lo-de-la-mascota", title: "Limpiar lo de la mascota", suggestedMinor: 500 },
  { key: "lavar-el-auto", title: "Lavar el auto", suggestedMinor: 2000 },
] as const;

export type TipCatalogKey = (typeof TIP_CATALOG)[number]["key"];

export function catalogItem(key: string) {
  return TIP_CATALOG.find((item) => item.key === key) ?? null;
}
