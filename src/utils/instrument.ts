/* eslint-disable unicorn/no-zero-fractions */
// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const environment = process.env.NODE_ENV || "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  integrations: [
    nodeProfilingIntegration(),
    // Enable automatic instrumentation and tracing
    Sentry.httpIntegration(),
  ],
  // Enable tracing for all transactions with sampling
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,
  profilesSampleRate: environment === "production" ? 0.1 : 1.0,
  maxBreadcrumbs: 50,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Network request failed",
  ],
  debug: environment !== "production",
  release: process.env.npm_package_version,
  // Add transaction name configuration
  autoSessionTracking: true,
  enableTracing: true,
});
