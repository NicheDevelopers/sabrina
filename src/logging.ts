import winston from "winston";
import {ENV, LOG_FILE, LOG_LEVEL} from "./Config";

// Pretty format for console
const consoleFormat = winston.format.combine(
    winston.format.colorize({all: true}),
    winston.format.timestamp({
        format: "YYYY-MM-DD hh:mm:ss",
    }),
    winston.format.align(),
    // deno-lint-ignore no-explicit-any
    winston.format.printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`),
);

// JSON format for file
const fileFormat = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY-MM-DD hh:mm:ss",
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
        }),
    );
}

export const log = winston.createLogger({
    level: LOG_LEVEL,
    transports: transports,
});
