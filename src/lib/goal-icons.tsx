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
  Star,
  Ticket,
  Watch,
} from "lucide-react";

export type GoalIconCategory =
  | "tecnologia"
  | "videojuegos"
  | "musica"
  | "deportes"
  | "ropa"
  | "hobbies"
  | "regalos"
  | "experiencias"
  | "otros";

export type GoalIconDef = {
  id: string;
  category: GoalIconCategory;
  label: string;
  Icon: LucideIcon;
};

export const GOAL_ICON_CATEGORIES: { id: GoalIconCategory; label: string }[] = [
  { id: "tecnologia", label: "Tecnología" },
  { id: "videojuegos", label: "Videojuegos" },
  { id: "musica", label: "Música" },
  { id: "deportes", label: "Deportes" },
  { id: "ropa", label: "Ropa" },
  { id: "hobbies", label: "Hobbies" },
  { id: "regalos", label: "Regalos" },
  { id: "experiencias", label: "Experiencias" },
  { id: "otros", label: "Otros" },
];

export const GOAL_ICONS: GoalIconDef[] = [
  { id: "mouse", category: "tecnologia", label: "Mouse", Icon: Mouse },
  { id: "keyboard", category: "tecnologia", label: "Teclado", Icon: Keyboard },
  { id: "laptop", category: "tecnologia", label: "Notebook", Icon: Laptop },
  { id: "phone", category: "tecnologia", label: "Celular", Icon: Smartphone },
  { id: "monitor", category: "tecnologia", label: "Pantalla", Icon: Monitor },
  { id: "camera", category: "tecnologia", label: "Cámara", Icon: Camera },
  { id: "gamepad", category: "videojuegos", label: "Consola", Icon: Gamepad2 },
  { id: "clapper", category: "videojuegos", label: "Juego", Icon: Clapperboard },
  { id: "headphones", category: "musica", label: "Audífonos", Icon: Headphones },
  { id: "music", category: "musica", label: "Música", Icon: Music },
  { id: "bike", category: "deportes", label: "Bici", Icon: Bike },
  { id: "shirt", category: "ropa", label: "Ropa", Icon: Shirt },
  { id: "watch", category: "ropa", label: "Reloj", Icon: Watch },
  { id: "palette", category: "hobbies", label: "Arte", Icon: Palette },
  { id: "book", category: "hobbies", label: "Libros", Icon: BookOpen },
  { id: "gift", category: "regalos", label: "Regalo", Icon: Gift },
  { id: "heart", category: "regalos", label: "Especial", Icon: Heart },
  { id: "plane", category: "experiencias", label: "Viaje", Icon: Plane },
  { id: "ticket", category: "experiencias", label: "Entrada", Icon: Ticket },
  { id: "bag", category: "otros", label: "Compra", Icon: ShoppingBag },
  { id: "star", category: "otros", label: "Meta", Icon: Star },
  { id: "sparkles", category: "otros", label: "Sueño", Icon: Sparkles },
];

export const DEFAULT_GOAL_ICON_ID = "sparkles";

const BY_ID = new Map(GOAL_ICONS.map((item) => [item.id, item]));

export function goalIconDef(iconId: string | null | undefined): GoalIconDef {
  return BY_ID.get(iconId ?? "") ?? BY_ID.get(DEFAULT_GOAL_ICON_ID)!;
}

export function isGoalIconId(value: string): boolean {
  return BY_ID.has(value);
}
