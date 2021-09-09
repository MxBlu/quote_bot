import { CommandProvider, Interactable, Logger, ModernApplicationCommandJSONBody } from "bot-framework";
import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, Message, MessageEmbed, User } from "discord.js";

import { GetQuoteCommand } from "./get_quote_command.js";

class EncoreProps {
  user: User;
  scope: string;
}

export class EncoreQuoteCommand implements CommandProvider<CommandInteraction> {

  getQuoteCommand: GetQuoteCommand;

  logger: Logger;

  constructor() {
    this.getQuoteCommand = new GetQuoteCommand();
    this.logger = new Logger("EncoreQuoteCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('encorequote')
        .setDescription('Generate a message to repeatedly get quotes')
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/encorequote - Generate a message to repeatedly get quotes";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Get arguments from interaction
    const user = interaction.options.getUser('user');

    let scope = "";
    if (user != null) {
      scope += `@${user.username}`;
    } else {
      scope += 'Guild';
    }

    // Re-generate quote from stored data
    const embed = new MessageEmbed()
      .setTitle(`Encore - ${scope}`)
      .setDescription('Press the button below to pull a random quote!');

    // Setup interaction controls
    const interactable = new Interactable<EncoreProps>();
    interactable.registerHandler(this.encoreHandler, { emoji: "👏" });
    interactable.props = new EncoreProps();
    interactable.props.user = user;
    interactable.props.scope = scope;

    // Get generated action row
    const actionRow = interactable.getActionRow();

    this.logger.info(`${interaction.user.username} requested encore for '${scope}'`);
    const message = await interaction.reply({
      embeds: [ embed ], 
      components: [ actionRow ], 
      fetchReply: true 
    });

    // Activate interaction handling
    interactable.activate(message as Message);
  }

  private encoreHandler = async (interactable: Interactable<EncoreProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    // Get user in props
    const user = interactable.props.user;
    const scope = interactable.props.scope;

    this.getQuoteCommand.doGetQuote(interaction, { user: user });
    this.logger.debug(`${interaction.user.username} encored for '${scope}'`);
  };
}