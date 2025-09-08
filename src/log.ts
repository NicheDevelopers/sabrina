import winston from "winston";
const { combine, timestamp, printf, colorize, align } = winston.format;

export const log = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss",
    }),
    align(),
    printf((info: any) => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "nichebot.log", colorize: false } as any),
  ],
});
