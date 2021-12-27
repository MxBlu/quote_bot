import { Dependency, Logger } from 'bot-framework';
import { Search as SearchChannel, Ingest as IngestChannel } from 'sonic-channel';
import { IQuote } from '../models/Quote';

// Collection for Quotes index
const QUOTES_COLLECTION = "quotes";

class SearchImpl {
  // Sonic search channel
  searchChannel: SearchChannel
  // Sonic ingest channel
  ingestChannel: IngestChannel;
  // Dependencies for initialising
  initDependencies: Map<string, Dependency>;

  logger: Logger;

  constructor () {
    this.logger = new Logger("Search");
    // Create dependencies for initialising
    this.initDependencies = new Map();
    this.initDependencies.set("search", new Dependency("Search_SearchChannel"));
    this.initDependencies.set("ingest", new Dependency("Search_IngestChannel"));
  }

  public async init(host: string, port: number, auth: string): Promise<void> {
    // Connect to search channel
    this.searchChannel = new SearchChannel({ host, port, auth }).connect({
      connected: () => this.onConnected("search"),
      disconnected: () => this.onChannelStateChange("search", "disconnected"),
      error: (error) => this.onError(error, "search"),
      retrying: () => this.onChannelStateChange("search", "retrying"),
      timeout: () => this.onChannelStateChange("search", "timed-out")
    });
    // Connect to ingest channel
    this.ingestChannel = new IngestChannel({ host, port, auth }).connect({
      connected: () => this.onConnected("ingest"),
      disconnected: () => this.onChannelStateChange("ingest", "disconnected"),
      error: (error) => this.onError(error, "ingest"),
      retrying: () => this.onChannelStateChange("ingest", "retrying"),
      timeout: () => this.onChannelStateChange("ingest", "timed-out")
    });
    // Wait for channels to connect
    await Dependency.awaitMultiple(
      this.initDependencies.get("search"),
      this.initDependencies.get("ingest")
    );
    this.logger.info('All channels connected');
    SearchDependency.ready();
  }

  public async search(guildId: string, text: string): Promise<number[]> {
    // Bucket to search
    const bucket = guildId;
    // Query the index for search results
    const results = await this.searchChannel.query(QUOTES_COLLECTION, bucket, text);
    this.logger.trace(`Query for ${text} in ${guildId} returned ${results.length} results`);
    // Convert result strings to numbers
    return results.map(r => parseInt(r));
  }

  public async ingest(quote: IQuote): Promise<void> {
    // Bucket for indexing
    const bucket = quote.guild;
    // ID to Index
    const objectId = String(quote.seq);
    // Text to index
    const text = this.normaliseMessageText(quote.message);
    // If there's no text to index, don't index the quote
    if (text == "") {
      return;
    }
    // Index the quote
    await this.ingestChannel.push(QUOTES_COLLECTION, bucket, objectId, text);
    this.logger.debug(`Ingested Quote ${quote.guild} - ${quote.seq}`);
  }

  public async remove(guildId: string, seq: number): Promise<boolean> {
    // Bucket for indexing
    const bucket = guildId;
    // ID to Index
    const objectId = String(seq);
    // Flush the object out of index and return success
    const success = await this.ingestChannel.flusho(QUOTES_COLLECTION, bucket, objectId) > 0;
    if (success) {
      this.logger.debug(`Removed Quote ${guildId} - ${seq}`);
    }
    return success;
  }

  private normaliseMessageText(text: string): string {
    return text
      .substr(0, text.lastIndexOf('\n')) // Remove "Link" line (last line)
      .replace('\n', ' ') // replace new-lines to spaces
      .trim(); // Remove excess spaces
  }

  // Connection state handlers

  private onConnected = (channelType: string): void => {
    this.logger.info(`Sonic Channel '${channelType}' connected`);
    // Notify init dependency that channel is ready
    this.initDependencies.get(channelType).ready();
  }

  private onChannelStateChange = (channelType: string, newState: string): void => {
    this.logger.error(`Sonic Channel '${channelType} changed to state '${newState}'`);
  }

  private onError = (error: Error, channelType: string): void => {
    this.logger.error(`Sonic Channel '${channelType}' error: ${error}`);
  }
}

export const Search = new SearchImpl();

export const SearchDependency = new Dependency("Search");