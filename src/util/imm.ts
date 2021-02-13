/*
  Simple generic messaging bus
  Could I just have use Node.JS emitters? ...Yes probably, but I didn't think of it till I was done
  This has better logging for my sanity anyway
*/

import { Logger } from "./logger";

type EventCallbackFunction = (data: any, topic: String) => void;

class MessengerTopic {
  // Subscribed functions, to be called on event
  subscribers : Map<String, EventCallbackFunction>;
  // Data from last event
  lastData : any;

  constructor() {
    this.subscribers = new Map<String, EventCallbackFunction>();
  }
}

export class InterModuleMessenger {
  // Universal logger instance
  logger: Logger;
  // Store for topics
  topics : Map<String, MessengerTopic>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.topics = new Map();
  }

  // Create a new topic
  // Assumes topic doesn't presently exist
  public newTopic(name: String): void {
    if (this.topics.has(name)) {
      this.logger.error(`Topic ${name} already exists`);
      return;
    }

    this.topics.set(name, new MessengerTopic());
    this.logger.info(`New topic ${name}`, 3);
  }

  // Delete an existing topic
  // Assumes topic does exist
  public deleteTopic(name: String): void {
    if (!this.topics.has(name)) {
      this.logger.error(`Topic ${name} does not exist`);
      return;
    }

    this.topics.delete(name);
    this.logger.info(`Deleted topic ${name}`, 3);
  }

  // Add function as listener to topic
  // Must be defined as a standard function, not an arrow function. Otherwise, func.name is null
  // Assumes topic does exist
  public subscribe(topicName: String, func: EventCallbackFunction): void {
    if (!this.topics.has(topicName)) {
      this.logger.error(`Topic ${topicName} does not exist`);
      return;
    }
    if (func.name == null) {
      this.logger.error(`Attempting to subscribe a nameless callback`);
      return;
    }

    let topic = this.topics.get(topicName);

    if (topic.subscribers.has(func.name)) {
      this.logger.error(`Function ${func.name} is already subscribed to Topic ${topic}`);
      return;
    }

    topic.subscribers.set(func.name, func);
    this.logger.info(`Function ${func.name} subscribed to Topic ${topic}`, 3);
  }

  // Remove function from topic listeners
  // Assumes topic does exist
  public unsubscribe(topicName: String, func: EventCallbackFunction): void {
    if (!this.topics.has(topicName)) {
      this.logger.error(`Topic ${topicName} does not exist`);
      return;
    }
    if (func.name == null) {
      this.logger.error(`Attempting to unsubscribe a nameless callback`);
      return;
    }

    let topic = this.topics.get(topicName);
    if (!topic.subscribers.has(func.name)) {
      this.logger.error(`Function ${func.name} was not subscribed to Topic ${topic}`);
      return;
    }

    topic.subscribers.delete(func.name);
    this.logger.info(`Function ${func.name} unsubscribed from Topic ${topic}`, 3);
  }

  // Call all subscribed functions for a topic with provided data asynchronously
  // Assumes topic does exist
  public notify(topicName, data): void {
    if (!this.topics.has(topicName)) {
      this.logger.error(`Topic ${topicName} does not exist`);
      return;
    }

    let topic = this.topics.get(topicName);

    this.logger.info(`Notifying topic ${topicName}`, 3);
    topic.lastData = data;
    topic.subscribers.forEach( async (f) => {
      f(data, topicName);
    });
  }

  // Get the last data that was added to the topic
  // Assumes topic does exist
  public getLastMessage(topicName): any {
    if (!this.topics.has(topicName)) {
      this.logger.error(`Topic ${topicName} does not exist`);
      return;
    }

    let topic = this.topics.get(topicName);
    return topic.lastData;
  }
}