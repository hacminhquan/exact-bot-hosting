require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Colors,
} = require('discord.js');

const TeamManager = require('./teamManager');
const { buildWelcomeEmbed, buildTeamTableEmbed } = require('./embeds');

// ─────────────────────────────────────────────
// Client Setup
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const teamManager = new TeamManager();

// ─────────────────────────────────────────────
// Ready
// ─────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  console.log(`✅  Logged in as ${c.user.tag}`);
  console.log(`📋  Managing ${teamManager.getTeams().length} team(s)`);
  c.user.setPresence({
    activities: [{ name: 'EXACT 2026 — XAI Challenge', type: 3 }],
    status: 'online',
  });
});

// ─────────────────────────────────────────────
// New Member Joins
// ─────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const welcomeChannel = member.guild.channels.cache.find(
      (ch) => ch.name === 'welcome'
    );
    if (!welcomeChannel) {
      console.warn('⚠️  No "welcome" channel found in server.');
      return;
    }

    const teams = teamManager.getTeams();
    const welcomeEmbed = buildWelcomeEmbed(member, teams);
    const tableEmbed   = buildTeamTableEmbed(teams);

    // Action row: Join or Create
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_team:${member.id}`)
        .setLabel('🤝  Join an Existing Team')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(teams.length === 0),
      new ButtonBuilder()
        .setCustomId(`create_team:${member.id}`)
        .setLabel('✨  Create a New Team')
        .setStyle(ButtonStyle.Success)
    );

    await welcomeChannel.send({
      content: `> 👋  Welcome, ${member}! Please read below and select your action.`,
      embeds: [welcomeEmbed, tableEmbed],
      components: [row],
    });
  } catch (err) {
    console.error('Error handling GuildMemberAdd:', err);
  }
});

// ─────────────────────────────────────────────
// Interactions (Buttons / Modals / Selects)
// ─────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  // ── Button: Join Team ──────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('join_team:')) {
    const targetUserId = interaction.customId.split(':')[1];
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '⛔  This button is not for you.',
        ephemeral: true,
      });
    }

    const teams = teamManager.getTeams();
    if (teams.length === 0) {
      return interaction.reply({
        content: '❌  There are no teams yet. Please create one instead!',
        ephemeral: true,
      });
    }

    // Check if user already in a team
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️  You are already a member of **${existing.name}**.`,
        ephemeral: true,
      });
    }

    // Build select menu — filter out full teams
    const availableTeams = teams.filter((t) => t.members.length < 5);
    if (availableTeams.length === 0) {
      return interaction.reply({
        content: '⚠️  All existing teams are full (5/5). Please create a new team.',
        ephemeral: true,
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_team:${interaction.user.id}`)
      .setPlaceholder('Select the team you wish to join…')
      .addOptions(
        availableTeams.map((team) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(team.name)
            .setDescription(
              `${team.members.length}/5 member(s) · Created by ${team.leader}`
            )
            .setValue(team.id)
        )
      );

    const selectRow = new ActionRowBuilder().addComponents(select);
    await interaction.reply({
      content: '📋  Please select the team you wish to join:',
      components: [selectRow],
      ephemeral: true,
    });
  }

  // ── Button: Create Team ────────────────────
  else if (
    interaction.isButton() &&
    interaction.customId.startsWith('create_team:')
  ) {
    const targetUserId = interaction.customId.split(':')[1];
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '⛔  This button is not for you.',
        ephemeral: true,
      });
    }

    // Check if user already in a team
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️  You are already registered under **${existing.name}**.`,
        ephemeral: true,
      });
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`create_team_modal:${interaction.user.id}`)
      .setTitle('🏁  Register a New EXACT 2026 Team');

    const teamNameInput = new TextInputBuilder()
      .setCustomId('team_name')
      .setLabel('Team Name')
      .setPlaceholder('e.g. "Neural Pioneers", "XAI Warriors"…')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(40)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(teamNameInput));
    await interaction.showModal(modal);
  }

  // ── Modal: Create Team Submit ──────────────
  else if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith('create_team_modal:')
  ) {
    const targetUserId = interaction.customId.split(':')[1];
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '⛔  This modal is not yours.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const rawName = interaction.fields.getTextInputValue('team_name').trim();

    // Sanitise
    if (!/^[\w\s\-'".!?()&]+$/u.test(rawName)) {
      return interaction.editReply({
        content:
          '❌  Team name contains invalid characters. Please use only letters, numbers, spaces, and basic punctuation.',
      });
    }

    // Duplicate check
    if (teamManager.teamExists(rawName)) {
      return interaction.editReply({
        content: `❌  A team named **"${rawName}"** already exists. Please choose a different name.`,
      });
    }

    // Check if user already in a team
    const existingTeam = teamManager.findTeamByMember(interaction.user.id);
    if (existingTeam) {
      return interaction.editReply({
        content: `⚠️  You are already a member of **${existingTeam.name}** and cannot create another team.`,
      });
    }

    // Create team
    const team = teamManager.createTeam(
      rawName,
      interaction.user.id,
      interaction.user.tag
    );

    const successEmbed = new EmbedBuilder()
      .setColor('#00C853')
      .setTitle('✅  Team Successfully Registered!')
      .setDescription(
        `Your team **"${team.name}"** has been registered for **EXACT 2026**.\n` +
          `You are the **Team Leader**. Up to **4 more members** may join your team.`
      )
      .addFields(
        { name: '🆔  Team ID', value: `\`${team.id}\``, inline: true },
        { name: '👑  Leader', value: `<@${interaction.user.id}>`, inline: true },
        { name: '👥  Members', value: `1 / 5`, inline: true }
      )
      .setFooter({ text: 'EXACT 2026 — Registration Deadline: May 10, 2026' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

    // Update the welcome channel with refreshed team table
    await refreshTeamBoard(interaction.guild);
  }

  // ── Select Menu: Team Selected ─────────────
  else if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith('select_team:')
  ) {
    const targetUserId = interaction.customId.split(':')[1];
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: '⛔  This menu is not for you.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const teamId   = interaction.values[0];
    const team     = teamManager.getTeamById(teamId);

    if (!team) {
      return interaction.editReply({ content: '❌  Team not found.' });
    }
    if (team.members.length >= 5) {
      return interaction.editReply({
        content: `❌  **${team.name}** is already full (5/5).`,
      });
    }

    // Check again for existing membership
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing) {
      return interaction.editReply({
        content: `⚠️  You are already in **${existing.name}**.`,
      });
    }

    teamManager.addMemberToTeam(teamId, interaction.user.id, interaction.user.tag);
    const updated = teamManager.getTeamById(teamId);

    const successEmbed = new EmbedBuilder()
      .setColor('#0091EA')
      .setTitle('✅  Successfully Joined Team!')
      .setDescription(
        `You have joined **"${updated.name}"** for **EXACT 2026**.\n` +
          `Welcome aboard — the team now has **${updated.members.length}/5** member(s).`
      )
      .addFields(
        {
          name: '👑  Team Leader',
          value: `${updated.leader}`,
          inline: true,
        },
        {
          name: '👥  Current Members',
          value: updated.members.map((m) => `• ${m.tag}`).join('\n') || '—',
          inline: false,
        }
      )
      .setFooter({ text: 'EXACT 2026 — Registration Deadline: May 10, 2026' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

    // Update the welcome channel board
    await refreshTeamBoard(interaction.guild);
  }
});

// ─────────────────────────────────────────────
// Helper: Refresh Team Board in #welcome
// Edits the last bot message that contains the table embed
// ─────────────────────────────────────────────
async function refreshTeamBoard(guild) {
  try {
    const welcomeChannel = guild.channels.cache.find(
      (ch) => ch.name === 'welcome'
    );
    if (!welcomeChannel) return;

    // Fetch last 20 messages from the channel
    const messages = await welcomeChannel.messages.fetch({ limit: 20 });
    // Find the most recent bot message with an embed that has "Team Registry"
    const boardMsg = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.embeds.some((e) => e.title && e.title.includes('Team Registry'))
    );

    if (boardMsg) {
      const teams = teamManager.getTeams();
      const tableEmbed = buildTeamTableEmbed(teams);
      await boardMsg.edit({
        embeds: boardMsg.embeds
          .slice(0, -1)           // keep all existing embeds except the old table
          .concat([tableEmbed]), // replace with fresh table
        components: boardMsg.components,
      });
    }
  } catch (err) {
    console.warn('Could not refresh team board:', err.message);
  }
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
