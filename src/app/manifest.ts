import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Web app manifest: logo kit icons (public/brand/) and the site's warm light colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "UNICEF клуб 130",
    lang: "mn",
    start_url: "/",
    display: "browser",
    background_color: "#FFFBF5",
    theme_color: "#FFFBF5",
    icons: [
      { src: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
