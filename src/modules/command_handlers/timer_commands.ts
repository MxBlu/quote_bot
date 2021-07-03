import { Client as DiscordClient, TextChannel } from "discord.js";
import { sendCmdMessage, sendMessage } from "../../util/bot_utils.js";
import { Logger } from "../../util/logger.js";
import { HighResolutionTimer, TimerTask } from "../../util/timer.js";
import { BotCommand } from "../bot.js";

class TimerAlertSpec {
  guildId: string;
  channelId: string;
  memberId: string;
}

export class TimerCommandsHandler {
  discord: DiscordClient;

  timerManager: HighResolutionTimer;

  alertSpecs: Map<string, TimerAlertSpec>;

  logger: Logger;
  
  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.timerManager = new HighResolutionTimer();
    this.alertSpecs = new Map();
    this.logger = new Logger("TimerCommandsHandler");
  }

  public getTimersHandler = async (command: BotCommand): Promise<void> => {
    const timers = this.timerManager.getTimers();

    if (timers.size > 0) {
      const msg = Array.from(timers.values()).map(t => `${t.id}:\t\t${t.targetTime.toISOString()}`).join("\n");
      sendCmdMessage(command.message, msg, 2, this.logger);
    } else {
      sendCmdMessage(command.message, "No timers live", 2, this.logger);
    }
  }

  public addTimerHandler = async (command: BotCommand): Promise<void> => {
    let targetDate: Date = null;
    let id: string = null;
    switch (command.arguments.length) {
    case 0:
    case 1:
      sendCmdMessage(command.message, 'Error: Not enough arguments', 3, this.logger);
      return;
    default:
      // We need at least 2 arguments
      const dateString = command.arguments[0];
      targetDate = this.dateStringToTriggerDate(dateString);

      if (targetDate == null) {
        sendCmdMessage(command.message, 'Error: Invalid date', 3, this.logger);
        return;
      }

      // Recombine remaining args into 1 string
      id = command.arguments.slice(1).join(' ');
    }

    if (this.timerManager.hasTimer(id)) {
      sendCmdMessage(command.message, 'Error: Timer with ID already present', 3, this.logger);
      return;
    }

    const task = new TimerTask();
    task.id = id;
    task.targetTime = targetDate;
    task.triggerFunction = this.timerAlertHandler;
    this.timerManager.addTimer(task);

    const alertSpec = new TimerAlertSpec();
    alertSpec.guildId = command.message.guild.id;
    alertSpec.channelId = command.message.channel.id;
    alertSpec.memberId = command.message.member.id;
    alertSpec.start = new Date();
    this.alertSpecs.set(id, alertSpec);

    sendCmdMessage(command.message, `Timer '${id}' added for date ${targetDate.toISOString()}`, 2, this.logger);
  }

  public delTimerHandler = async (command: BotCommand): Promise<void> => {
    let id: string = null;
    switch (command.arguments.length) {
    case 0:
      sendCmdMessage(command.message, 'Error: Not enough arguments', 3, this.logger);
      return;
    default:
      // Recombine args into 1 string
      id = command.arguments.slice(1).join(' ');
    }

    if (!this.timerManager.hasTimer(id)) {
      sendCmdMessage(command.message, 'Error: No timer with ID present', 3, this.logger);
      return;
    }

    this.timerManager.removeTimer(id);
    this.alertSpecs.delete(id);

    sendCmdMessage(command.message, `Timer '${id}' removed`, 2, this.logger);
  }

  public timerAlertHandler = async (task: TimerTask): Promise<void> => {
    const alertSpec = this.alertSpecs.get(task.id);
    
    const msg = `<@${alertSpec.memberId}> ${task.id}`;
    const channel = this.discord.guilds.cache.get(alertSpec.guildId).channels.cache.get(alertSpec.channelId);

    sendMessage(channel as TextChannel, msg);

    this.alertSpecs.delete(task.id);
  }

  private dateStringToTriggerDate(dateString: string): Date {
    const dateMatcher = dateString.match(/(?:(\d+)M)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    // Empty string match means nothing was matched
    if (dateMatcher[0] == '') {
      return null;
    }

    // ms delta
    let delta = 0;
    if (dateMatcher[1] != null) {
      // months
      delta += Number(dateMatcher[1]) * 30 * 24 * 60 * 60 * 1000;
    }
    if (dateMatcher[2] != null) {
      // day
      delta += Number(dateMatcher[2]) * 24 * 60 * 60 * 1000;
    }
    if (dateMatcher[3] != null) {
      // hour
      delta += Number(dateMatcher[3]) * 60 * 60 * 1000;
    }
    if (dateMatcher[4] != null) {
      // minute
      delta += Number(dateMatcher[4]) * 60 * 1000;
    }
    if (dateMatcher[5] != null) {
      // months
      delta += Number(dateMatcher[5]) * 1000;
    }

    // Return date after interval
    return new Date(Date.now() + delta);
  }
}