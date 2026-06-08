/**
 * Application configuration centralized from environment variables.
 * This ensures we have a single place to manage defaults and validation.
 */

export const config = {
  database: {
    url: process.env.DATABASE_URL || "",
  },
  auth: {
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "",
    url:
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  googleMaps: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
  app: {
    url:
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000",
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
  },
};

// Validation check for critical variables in production
if (config.app.isProd) {
  const missing = [];
  if (!config.database.url) missing.push("DATABASE_URL");
  if (!config.auth.secret) missing.push("AUTH_SECRET");
  if (!config.googleMaps.apiKey)
    missing.push("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

  if (missing.length > 0) {
    console.warn(
      `⚠️ Warning: Missing production environment variables: ${missing.join(", ")}`,
    );
  }
}

export default config;
