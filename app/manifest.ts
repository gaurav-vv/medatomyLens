import type { MetadataRoute } from "next";
import { withBase } from "@/lib/basePath";

// Required for `output: "export"`: the manifest is generated once at build time.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AnatomyLens",
    short_name: "AnatomyLens",
    description: "Educational 3D anatomy viewer. Not a diagnosis.",
    start_url: withBase("/"),
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    icons: [
      { src: withBase("/icons/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: withBase("/icons/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
