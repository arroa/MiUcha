import {
  BedDouble,
  Bell,
  BookOpen,
  Heart,
  Leaf,
  MousePointer2,
  PawPrint,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type IconProps = { className?: string };

export function IconPaw({ className }: IconProps) {
  return <PawPrint className={className} aria-hidden />;
}

export function IconBed({ className }: IconProps) {
  return <BedDouble className={className} aria-hidden />;
}

export function IconBook({ className }: IconProps) {
  return <BookOpen className={className} aria-hidden />;
}

export function IconCart({ className }: IconProps) {
  return <ShoppingCart className={className} aria-hidden />;
}

export function IconTrend({ className }: IconProps) {
  return <TrendingUp className={className} aria-hidden />;
}

export function IconHeart({ className }: IconProps) {
  return <Heart className={className} aria-hidden fill="currentColor" />;
}

export function IconMouse({ className }: IconProps) {
  return <MousePointer2 className={className} aria-hidden />;
}

export function IconBell({ className }: IconProps) {
  return <Bell className={className} aria-hidden />;
}

export function IconLeaf({ className }: IconProps) {
  return <Leaf className={className} aria-hidden />;
}

export const tipIconMap: Record<"paw" | "bed" | "book", LucideIcon> = {
  paw: PawPrint,
  bed: BedDouble,
  book: BookOpen,
};
