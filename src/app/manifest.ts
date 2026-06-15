import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

/**
 * Web app manifest — makes MakeIt installable (PWA) and is the
 * foundation for the native shells (docs/APP_STORE_PLAN.md Fase 1).
 *
 * start_url is /dashboard: an installed app belongs to a signed-in
 * member; the auth redirect handles the signed-out edge.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: COMPANY.product,
    short_name: COMPANY.name,
    description: COMPANY.taglineShort,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A0A0B",
    theme_color: "#0A0A0B",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
