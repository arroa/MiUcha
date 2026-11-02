import type { LucideIcon } from "lucide-react";
import {
  Bike,
  BookOpen,
  Camera,
  Clapperboard,
  Gamepad2,
  Gift,
  Headphones,
  Heart,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Music,
  Palette,
  Plane,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Speaker,
  Star,
  Ticket,
  Watch,
} from "lucide-react";

export type GoalIconCategory =
  | "tecnologia"
  | "videojuegos"
  | "deportes"
  | "ropa"
  | "hobbies"
  | "regalos";

export type GoalIconDef = {
  id: string;
  category: GoalIconCategory;
  label: string;
  Icon: LucideIcon;
};

export const GOAL_ICON_CATEGORIES: { id: GoalIconCategory; label: string }[] = [
  { id: "tecnologia", label: "Tecnología" },
  { id: "videojuegos", label: "Videojuegos" },
  { id: "deportes", label: "Deportes" },
  { id: "ropa", label: "Ropa" },
  { id: "hobbies", label: "Hobbies" },
  { id: "regalos", label: "Regalos" },
];

export const GOAL_ICONS: GoalIconDef[] = [
  { id: "mouse", category: "tecnologia", label: "Mouse", Icon: Mouse },
  { id: "keyboard", category: "tecnologia", label: "Teclado", Icon: Keyboard },
  { id: "laptop", category: "tecnologia", label: "Notebook", Icon: Laptop },
  { id: "phone", category: "tecnologia", label: "Celular", Icon: Smartphone },
  { id: "monitor", category: "tecnologia", label: "Pantalla", Icon: Monitor },
  { id: "camera", category: "tecnologia", label: "Cámara", Icon: Camera },
  { id: "headphones", category: "tecnologia", label: "Audífonos", Icon: Headphones },
  { id: "speakers", category: "tecnologia", label: "Parlantes", Icon: Speaker },
  { id: "music", category: "tecnologia", label: "Música", Icon: Music },
  { id: "gamepad", category: "videojuegos", label: "Consola", Icon: Gamepad2 },
  { id: "clapper", category: "videojuegos", label: "Juego", Icon: Clapperboard },
  { id: "bike", category: "deportes", label: "Bici", Icon: Bike },
  { id: "shirt", category: "ropa", label: "Ropa", Icon: Shirt },
  { id: "watch", category: "ropa", label: "Reloj", Icon: Watch },
  { id: "palette", category: "hobbies", label: "Arte", Icon: Palette },
  { id: "book", category: "hobbies", label: "Libros", Icon: BookOpen },
  { id: "plane", category: "hobbies", label: "Viaje", Icon: Plane },
  { id: "ticket", category: "hobbies", label: "Entrada", Icon: Ticket },
  { id: "gift", category: "regalos", label: "Regalo", Icon: Gift },
  { id: "heart", category: "regalos", label: "Especial", Icon: Heart },
  { id: "bag", category: "regalos", label: "Compra", Icon: ShoppingBag },
  { id: "star", category: "regalos", label: "Meta", Icon: Star },
  { id: "sparkles", category: "regalos", label: "Sueño", Icon: Sparkles },
];

export const DEFAULT_GOAL_ICON_ID = "sparkles";

const BY_ID = new Map(GOAL_ICONS.map((item) => [item.id, item]));

export function goalIconDef(iconId: string | null | undefined): GoalIconDef {
  return BY_ID.get(iconId ?? "") ?? BY_ID.get(DEFAULT_GOAL_ICON_ID)!;
}

export function isGoalIconId(value: string): boolean {
  return BY_ID.has(value);
}
