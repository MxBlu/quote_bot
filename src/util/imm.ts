/*
  Simple generic messaging bus
  Could I just have use Node.JS emitters? ...Yes probably, but I didn't think of it till I was done
  This has better logging for my sanity anyway
*/

import { DEFAULT_LOG_LEVEL } from "../constants/constants.js";
import { Logger, LogLevels } from "./logger.js";

type EventCallbackFunction = (data: any, topic: MessengerTopic) => void;

export class MessengerTopic {
  // Topic name
  name: string
  // Universal logger instance
  logger: Logger;
  // Subscribed functions, to be called on event
  subscribers : Map<string, EventCallbackFunction>;
  // Data from last event
  lastData : any;

  constructor(name: string) {
    this.logger = new Logger(`MessengerTopic.${name}`, DEFAULT_LOG_LEVEL);
    this.subscribers = new Map<string, EventCallbackFunction>();
    this.logger.info(`Topic generated`, LogLevels.INFO3);
  }

  // Add function as listener to this topic
  // Must be defined as a standard function, not an arrow function. Otherwise, func.name is null
  // Assumes topic does exist
  public subscribe(func: EventCallbackFunction): void {
    if (func.name == null) {
      this.logger.error(`Attempting to subscribe a nameless callback`);
      return;
    }
    if (this.subscribers.has(func.name)) {
      this.logger.error(`Function ${func.name} is already subscribed to Topic ${this.name}`);
      return;
    }

    this.subscribers.set(func.name, func);
    this.logger.info(`Function ${func.name} subscribed to Topic ${this.name}`, 3);
  }

  // Remove function from listeners
  // Assumes topic does exist
  public unsubscribe(func: EventCallbackFunction): void {
    if (func.name == null) {
      this.logger.error(`Attempting to unsubscribe a nameless callback`);
      return;
    }

    if (!this.subscribers.has(func.name)) {
      this.logger.error(`Function ${func.name} was not subscribed to Topic ${this.name}`);
      return;
    }

    this.subscribers.delete(func.name);
    this.logger.info(`Function ${func.name} unsubscribed from Topic ${this.name}`, 3);
  }

  // Call all subscribed functions for a topic with provided data asynchronously
  // Assumes topic does exist
  public notify(data: any): void {
    this.logger.info(`Notifying topic ${this.name}`, 3);
    this.lastData = data;
    this.subscribers.forEach( async (f) => {
      f(data, this);
    });
  }

  // Get the last data that was added to the topic
  // Assumes topic does exist
  public getLastData(): any {
    return this.lastData;
  }
}