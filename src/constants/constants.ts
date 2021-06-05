import { LogLevels } from "../util/logger.js";

// Default logging level
export const DEFAULT_LOG_LEVEL = Number(process.env.LOG_LEVEL) || LogLevels.INFO3;