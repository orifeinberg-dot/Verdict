import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Validated uploads can be up to 10MB (PRODUCT_SPEC.md); as a base64
      // data URL that's ~13.3MB, above the framework's 1MB default.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
