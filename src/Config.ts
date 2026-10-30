import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load environment variables from .env file
const envFile = resolve(import.meta.dirname, "../.env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export const APPLICATION_ID = process.env["APPLICATION_ID"] || "";
export const SECRET_TOKEN = process.env["SECRET_TOKEN"] || "";
export const BOT_NAME = process.env["BOT_NAME"] || "NicheBot";
export const LOG_LEVEL = process.env["LOG_LEVEL"] || "info";
export const LOG_FILE = process.env["LOG_FILE"] || "";
export const ENV = process.env["ENV"] || "DEV";
export const VERSION = process.env["VERSION"] || "dev";
