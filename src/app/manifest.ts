import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiUcha",
    short_name: "MiUcha",
    description: "Mi dinero. Mis decisiones.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#1f6b4a",
    lang: "es",
  };
}
