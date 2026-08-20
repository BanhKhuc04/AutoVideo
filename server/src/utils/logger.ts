import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { ensureDirSync } from './cleanup';

let logFilePath = '';

function getLogFilePath(): string {
  if (logFilePath) return logFilePath;
  try {
    const logsDir = config.logsDir;
    ensureDirSync(logsDir);
    logFilePath = path.join(logsDir, 'app.log');
    return logFilePath;
  } catch {
    return '';
  }
}

function writeToFile(level: string, message: string, ...args: any[]): void {
  try {
    const filePath = getLogFilePath();
    if (!filePath) return;
    const extra =
      args.length > 0
        ? ' ' +
          args
            .map((a) => {
              if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
              if (typeof a === 'object') {
                try {
                  return JSON.stringify(a);
                } catch {
                  return String(a);
                }
              }
              return String(a);
            })
            .join(' ')
        : '';
    const line = `[${new Date().toISOString()}] [${level}] ${message}${extra}\n`;
    fs.appendFileSync(filePath, line, 'utf8');
  } catch {}
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
    writeToFile('INFO', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args);
    writeToFile('WARN', message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...args);
    writeToFile('ERROR', message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
    }
  },
};
