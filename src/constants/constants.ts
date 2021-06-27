import * as dotenv from 'dotenv';
import { LogLevels } from "../util/logger.js";

dotenv.config();

// Default logging level
export const DEFAULT_LOG_LEVEL = Number(process.env.LOG_LEVEL) || LogLevels.INFO3;

// Default time for a modal to stay active
export const DEFAULT_MODAL_DURATION = 120000; // 2 minutes