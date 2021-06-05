import { InterModuleMessenger } from "./imm";

// Get a time string of the current time
function getTimeString() {
  const now = new Date();

  const hrs = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const sec = now.getSeconds().toString().padStart(2, '0');

  return `${hrs}:${min}:${sec}`;
}

/*
  Simple logging assistant
  Mostly for the job of appending timestamps
  Also logs errors to Discord if available
*/
export class Logger {
  // Min verbosity for a log message to be processed
  loggerVebosity: number;
  // Messenger for Discord error logging
  imm: InterModuleMessenger;

  constructor(loggerVebosity: number) {
    this.loggerVebosity = loggerVebosity;
  }

  // Generic log event, lower verbosity is higher priority
    // Default to verbosity = 1
  public info(message: string, verbosity = 1): void {
    if (this.loggerVebosity >= verbosity) {
      console.log(`[INFO${verbosity}] ${getTimeString()} ${message}`);
    }
  }

  // Log event as error, where verbosity = 0
    // Logs to Discord if available
  public error (message: string): void {
    if (this.loggerVebosity >= 0) {
      const logStr = `[ERROR] ${getTimeString()} ${message}`;
      console.error(logStr);
      if (this.imm != null) {
        this.imm.notify('newErrorLog', logStr);
      }
    }
  }

  // Register messenger for Discord logging
  public registerMessenger (messenger: InterModuleMessenger): void {
    this.imm = messenger;
  }
}