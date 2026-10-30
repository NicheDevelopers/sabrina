import { inspect } from "node:util";
import winston from "winston";
import { ENV, LOG_FILE, LOG_LEVEL } from "./Config";

const TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const MAX_LOG_FILES = 5;

const SPLAT = Symbol.for("splat");

// Winston keeps at most the message of extra arguments, the printed output needs the rest
const appendDetails = winston.format((info) => {
  const details = (info[SPLAT] ?? []) as unknown[];

  for (const detail of details) {
    if (detail instanceof Error) {
      info.message = `${info.message}\n${detail.stack}`;
    } else {
      const text = typeof detail === "string" ? detail : inspect(detail);
      info.message = `${info.message} ${text}`;
    }
  }

  return info;
});

// Pretty format for console
export const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: TIMESTAMP_FORMAT,
  }),
  winston.format.align(),
  // deno-lint-ignore no-explicit-any
  winston.format.printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`),
);

// JSON format for file
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: TIMESTAMP_FORMAT,
  }),
  winston.format.json(),
);

// Create transports array with proper typing
const transports: winston.transport[] = [
  // Console transport with pretty format
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transport only if LOG_FILE environment variable is set
if (LOG_FILE && ENV === "PROD") {
  transports.push(
    // File transport with JSON format
    new winston.transports.File({
      filename: LOG_FILE,
      format: fileFormat,
      maxsize: MAX_LOG_FILE_SIZE,
      maxFiles: MAX_LOG_FILES,
      // Keeps the newest logs in LOG_FILE, which /dumplogs reads
      tailable: true,
    }),
  );
}

export const log = winston.createLogger({
  level: LOG_LEVEL,
  format: appendDetails(),
  transports: transports,
});
