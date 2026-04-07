// =============================================================================
// Logger Utility - JSON format for production
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private formatMessage(level: LogLevel, message: string, meta?: object): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta && { ...meta }),
    };

    if (this.isProduction) {
      // JSON format for production
      console.log(JSON.stringify(entry));
    } else {
      // Pretty format for development
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '🔍';
      console.log(`${prefix} [${level.toUpperCase()}] ${message}${metaStr}`);
    }

    return entry;
  }

  debug(message: string, meta?: object): void {
    this.formatMessage('debug', message, meta);
  }

  info(message: string, meta?: object): void {
    this.formatMessage('info', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.formatMessage('warn', message, meta);
  }

  error(message: string, meta?: object): void {
    this.formatMessage('error', message, meta);
  }
}

export const logger = new Logger();
