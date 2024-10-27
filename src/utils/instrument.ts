/* eslint-disable unicorn/no-zero-fractions */
// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const environment = process.env.NODE_ENV || "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  integrations: [nodeProfilingIntegration()],
  // Performance monitoring
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,
  // Profiling sample rate
  profilesSampleRate: environment === "production" ? 0.1 : 1.0,
  // Set maxBreadcrumbs to control memory usage
  maxBreadcrumbs: 50,
  // Ignore certain errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
  ],
  // Add debug mode for non-production
  debug: environment !== "production",
  // Add release information
  release: process.env.npm_package_version,
});
