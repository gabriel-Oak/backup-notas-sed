import winston from 'winston';
import 'winston-daily-rotate-file';

const format = winston.format.printf(({
  level, message
}) => {
  const newMessage = `[${new Date().toLocaleString('pt-BR')}] ${level.toUpperCase()}: ${message}`;
  return newMessage;
});

var transport = new winston.transports.DailyRotateFile({
  filename: 'logs/backup-notas-sed-log-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format,
  auditFile: 'logs/nope.json'
});


export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      colorize: true,
      format: winston.format.combine(
        format,
        winston.format.colorize(),
      )
    }),
    transport
  ]
});

