import winston from "winston";
const { combine, timestamp, printf, colorize, align, json } = winston.format;

// Pretty format for console
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({
    format: "YYYY-MM-DD hh:mm:ss",
  }),
  align(),
  // deno-lint-ignore no-explicit-any
  printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`),
);

// JSON format for file
const fileFormat = combine(
  timestamp({
    format: "YYYY-MM-DD hh:mm:ss",
  }),
  json(),
);

export const log = winston.createLogger({
  level: Deno.env.get("LOG_LEVEL") || "debug",
  transports: [
    // Console transport with pretty format
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport with JSON format
    new winston.transports.File({
      filename: "logs/nichebot.log",
      format: fileFormat,
    }),
  ],
});
