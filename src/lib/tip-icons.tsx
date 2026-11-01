import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Bone,
  BookOpen,
  Car,
  PawPrint,
  Shirt,
  Sparkles,
  Sprout,
  Trash2,
  UtensilsCrossed,
  WashingMachine,
} from "lucide-react";

import { TIP_CATALOG, type TipCatalogKey } from "@/lib/tip-catalog";

const BY_KEY: Record<TipCatalogKey, LucideIcon> = {
  "hacer-la-cama": BedDouble,
  "ordenar-pieza": Sparkles,
  "juntar-la-ropa": Shirt,
  "poner-la-mesa": UtensilsCrossed,
  "lavar-los-platos": WashingMachine,
  "sacar-la-basura": Trash2,
  "regar-plantas": Sprout,
  "alimentar-mascota": PawPrint,
  "limpiar-lo-de-la-mascota": Bone,
  "lavar-el-auto": Car,
};

const DEFAULT_ICON: LucideIcon = Sparkles;

const BY_TITLE = new Map(TIP_CATALOG.map((item) => [normalize(item.title), item.key]));

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

/** Resuelve ícono Lucide por `catalogKey` o, en su defecto, por título de Tip. */
export function tipIconFor(input: { catalogKey?: string | null; title?: string }): LucideIcon {
  if (input.catalogKey && input.catalogKey in BY_KEY) {
    return BY_KEY[input.catalogKey as TipCatalogKey];
  }
  if (input.title) {
    const key = BY_TITLE.get(normalize(input.title));
    if (key) return BY_KEY[key];
  }
  return DEFAULT_ICON;
}
