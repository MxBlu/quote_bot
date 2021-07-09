import { MessengerTopic } from "../imm.js";

// Message topic for Discord error logging
export const NewErrorLogTopic = new MessengerTopic<string>("newErrorLog");