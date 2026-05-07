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
const ADMIN_ROLE_NAME = 'ADMIN';

// ─────────────────────────────────────────────
// Ready
// ─────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  console.log(`Managing ${teamManager.getTeams().length} team(s)`);
  c.user.setPresence({
    activities: [{ name: 'XAI Challenge', type: 3 }],
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
      console.warn('No "welcome" channel found in server.');
      return;
    }

    const teams = teamManager.getTeams();
    const welcomeEmbed = buildWelcomeEmbed(member, teams);
    const tableEmbed   = buildTeamTableEmbed(teams);

    // Action row: Join or Create
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_team:${member.id}`)
        .setLabel('Join an Existing Team')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(teams.length === 0),

      new ButtonBuilder()
        .setCustomId(`create_team:${member.id}`)
        .setLabel('Create a New Team')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`leave_team:${member.id}`)
        .setLabel('Leave My Team')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`admin_delete_team:${member.id}`)
        .setLabel('Delete Team')
        .setStyle(ButtonStyle.Secondary)
    );

    await welcomeChannel.send({
      content: `> Welcome, ${member}! Please read below and select your action.`,
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
function isExactAdmin(member) {
  return member.roles.cache.some(
    (role) =>
      role.name === ADMIN_ROLE_NAME
  );
}
client.on(Events.InteractionCreate, async (interaction) => {
  // ── Button: Join Team ──────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('join_team:')) {
    const targetUserId = interaction.customId.split(':')[1];
    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: 'This button is not for you.',
        ephemeral: true,
      });
    }

    const teams = teamManager.getTeams();
    if (teams.length === 0) {
      return interaction.reply({
        content: 'There are no teams yet. Please create one instead!',
        ephemeral: true,
      });
    }

    // Check if user already in a team
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing && !isExactAdmin(interaction.member)) {
      return interaction.reply({
        content: `You are already a member of **${existing.name}**.`,
        ephemeral: true,
      });
    }

    // Build select menu — filter out full teams
    const availableTeams = teams.filter((t) => t.members.length < 5);
    if (availableTeams.length === 0) {
      return interaction.reply({
        content: 'All existing teams are full (5/5). Please create a new team.',
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
      content: 'Please select the team you wish to join:',
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
        content: 'This button is not for you.',
        ephemeral: true,
      });
    }

    // Check if user already in a team
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing && !isExactAdmin(interaction.member)) {
      return interaction.reply({
        content: `You are already registered under **${existing.name}**.`,
        ephemeral: true,
      });
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`create_team_modal:${interaction.user.id}`)
      .setTitle('Register a New EXACT 2026 Team');

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
        content: 'This modal is not yours.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const rawName = interaction.fields.getTextInputValue('team_name').trim();

    const cleanedName = rawName
      .replace(/\s+/g, ' ')
      .trim();

    // Sanitise
    if (!/^[\w\s\-'".!?()&]+$/u.test(cleanedName)) {
      return interaction.editReply({
        content:
          'Team name contains invalid characters. Please use only letters, numbers, spaces, and basic punctuation.',
      });
    }

    // Duplicate check
    if (teamManager.teamExists(cleanedName)) {
      return interaction.editReply({
        content: `A team named **"${cleanedName}"** already exists. Please choose a different name.`,
      });
    }

    // Check if user already in a team
    const existingTeam = teamManager.findTeamByMember(interaction.user.id);
    if (existingTeam) {
      return interaction.editReply({
        content: `You are already a member of **${existingTeam.name}** and cannot create another team.`,
      });
    }

    // Create team
    const team = teamManager.createTeam(
      cleanedName,
      interaction.user.id,
      interaction.user.tag
    );
    // Create role
    const role = await interaction.guild.roles.create({
      name: team.name,
      mentionable: true,
      reason: `EXACT 2026 Team Role for ${team.name}`,
    });

    // Create private voice channel
    const voiceChannel = await interaction.guild.channels.create({
      name: `${team.name}`,
      type: ChannelType.GuildVoice,

      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
      ],
    });

    // Create private text channel
    const textChannel = await interaction.guild.channels.create({
      name: team.name.toLowerCase().replace(/\s+/g, '-'),

      type: ChannelType.GuildText,

      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel,
          ],
        },
        {
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ],
    });

    // Save IDs
    teamManager.updateTeam(team.id, {
      roleId: role.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
    });

    // Give creator role
    await interaction.member.roles.add(role);

    const successEmbed = new EmbedBuilder()
      .setColor('#00C853')
      .setTitle('Team Successfully Registered!')
      .setDescription(
        `Your team **"${team.name}"** has been registered for **EXACT 2026**.\n` +
          `You are the **Team Leader**. Up to **4 more members** may join your team.`
      )
      .addFields(
        { name: 'Team ID', value: `\`${team.id}\``, inline: true },
        { name: 'Leader', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Members', value: `1 / 5`, inline: true }
      )
      .setFooter({ text: 'EXACT 2026 - Registration Deadline: May 10, 2026' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
    });

    await interaction.followUp({
      content:
        'Please set your display name for EXACT 2026.',
      ephemeral: true,
    });

    const modal = buildNicknameModal(
      interaction.user.id,
      team.id
    );

    await interaction.showModal(modal);

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
        content: 'This menu is not for you.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const teamId   = interaction.values[0];
    const team     = teamManager.getTeamById(teamId);

    if (!team) {
      return interaction.editReply({ content: 'Team not found.' });
    }
    if (team.members.length >= 5) {
      return interaction.editReply({
        content: `**${team.name}** is already full (5/5).`,
      });
    }

    // Check again for existing membership
    const existing = teamManager.findTeamByMember(interaction.user.id);
    if (existing) {
      return interaction.editReply({
        content: `You are already in **${existing.name}**.`,
      });
    }

    teamManager.addMemberToTeam(teamId, interaction.user.id, interaction.user.tag);
    const updated = teamManager.getTeamById(teamId);
    // Give role
    if (updated.roleId) {
      const role = interaction.guild.roles.cache.get(updated.roleId);

      if (role) {
        await interaction.member.roles.add(role);
      }
    }

    const successEmbed = new EmbedBuilder()
      .setColor('#0091EA')
      .setTitle('Successfully Joined Team!')
      .setDescription(
        `You have joined **"${updated.name}"** for **EXACT 2026**.\n` +
          `Welcome aboard — the team now has **${updated.members.length}/5** member(s).`
      )
      .addFields(
        {
          name: 'Team Leader',
          value: `${updated.leader}`,
          inline: true,
        },
        {
          name: 'Current Members',
          value: updated.members.map((m) => `• ${m.tag}`).join('\n') || '—',
          inline: false,
        }
      )
      .setFooter({ text: 'EXACT 2026 — Registration Deadline: May 10, 2026' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
    const modal = buildNicknameModal(
      interaction.user.id,
      updated.id
    );

    await interaction.showModal(modal);

    // Update the welcome channel board
    await refreshTeamBoard(interaction.guild);
  }

    // ── Button: Leave Team ────────────────────
  else if (
    interaction.isButton() &&
    interaction.customId.startsWith('leave_team:')
  ) {
    const targetUserId = interaction.customId.split(':')[1];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: 'This button is not for you.',
        ephemeral: true,
      });
    }

    const existingTeam = teamManager.findTeamByMember(interaction.user.id);

    if (!existingTeam) {
      return interaction.reply({
        content: 'You are not currently in any team.',
        ephemeral: true,
      });
    }

    const oldTeamName = existingTeam.name;

    // Remove role
    if (existingTeam.roleId) {
      const role = await interaction.guild.roles.fetch(
        existingTeam.roleId
      ).catch(() => null);

      if (role) {
        await interaction.member.roles.remove(role);
      }
    }

    // Check if user is last member
    const isLastMember =
      existingTeam.members.length === 1;

    // Remove member
    teamManager.removeMemberFromTeam(
      existingTeam.id,
      interaction.user.id
    );

    const deleted = isLastMember;

    if (deleted) {
      // Delete role
      if (existingTeam.roleId) {
        const role =
          interaction.guild.roles.cache.get(
            existingTeam.roleId
          );

        if (role) {
          await role.delete();
        }
      }

      // Delete VC
      if (existingTeam.voiceChannelId) {
        const vc = await interaction.guild.channels.fetch(
          existingTeam.voiceChannelId
        ).catch(() => null);

        if (vc) {
          await vc.delete();
        }
      }
      // Delete text channel
      if (existingTeam.textChannelId) {
        const textChannel =
          await interaction.guild.channels.fetch(
            existingTeam.textChannelId
          ).catch(() => null);

        if (textChannel) {
          await textChannel.delete();
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(deleted ? '#D50000' : '#FF6D00')
      .setTitle(
        deleted
          ? 'Team Deleted'
          : 'Left Team Successfully'
      )
      .setDescription(
        deleted
          ? `You left **${oldTeamName}**.\nSince no members remained, the team was automatically deleted.`
          : `You successfully left **${oldTeamName}**.`
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    await refreshTeamBoard(interaction.guild);
  }

  else if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith('nickname_modal:')
) {
  const [, userId, teamId] =
    interaction.customId.split(':');

  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: 'Not your modal.',
      ephemeral: true,
    });
  }

  const team = teamManager.getTeamById(teamId);

  if (!team) {
    return interaction.reply({
      content: 'Team not found.',
      ephemeral: true,
    });
  }

  const realName = interaction.fields
    .getTextInputValue('real_name')
    .trim();

  const nickname =
    `[${team.name}] - ${realName}`;

  try {
    await interaction.member.setNickname(nickname);

    await interaction.reply({
      content:
        `Your nickname has been set to:\n` +
        `\`${nickname}\``,
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);

    await interaction.reply({
      content:
        'Could not change nickname. Check bot permissions.',
      ephemeral: true,
    });
  }
}

else if (
  interaction.isButton() &&
  interaction.customId.startsWith('admin_delete_team:')
) {
  if (!isExactAdmin(interaction.member)) {
    return interaction.reply({
      content: 'Access denied.',
      ephemeral: true,
    });
  }

  const teams = teamManager.getTeams();

  if (teams.length === 0) {
    return interaction.reply({
      content: 'No teams found.',
      ephemeral: true,
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('admin_delete_team_select')
    .setPlaceholder('Select a team to delete')
    .addOptions(
      teams.map((team) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(team.name)
          .setValue(team.id)
      )
    );

  await interaction.reply({
    content: 'Select a team to delete:',
    components: [
      new ActionRowBuilder().addComponents(select),
    ],
    ephemeral: true,
  });
}

else if (
  interaction.isStringSelectMenu() &&
  interaction.customId ===
    'admin_delete_team_select'
) {
  if (!isExactAdmin(interaction.member)) {
    return interaction.reply({
      content: 'Access denied.',
      ephemeral: true,
    });
  }

  const teamId = interaction.values[0];

  const team = teamManager.getTeamById(teamId);

  if (!team) {
    return interaction.reply({
      content: 'Team not found.',
      ephemeral: true,
    });
  }

  // Delete role
  if (team.roleId) {
    const role = await interaction.guild.roles
      .fetch(team.roleId)
      .catch(() => null);

    if (role) {
      await role.delete();
    }
  }

  // Delete VC
  if (team.voiceChannelId) {
    const vc = await interaction.guild.channels
      .fetch(team.voiceChannelId)
      .catch(() => null);

    if (vc) {
      await vc.delete();
    }
  }

  // Delete text channel
  if (team.textChannelId) {
    const tc = await interaction.guild.channels
      .fetch(team.textChannelId)
      .catch(() => null);

    if (tc) {
      await tc.delete();
    }
  }

  teamManager.deleteTeam(teamId);

  await interaction.reply({
    content: `Team "${team.name}" deleted.`,
    ephemeral: true,
  });

  await refreshTeamBoard(interaction.guild);
}
});

// ─────────────────────────────────────────────
// Helper: Refresh Team Board in #welcome
// Edits the last bot message that contains the table embed
// ─────────────────────────────────────────────

function buildNicknameModal(userId, teamId) {
  const modal = new ModalBuilder()
    .setCustomId(`nickname_modal:${userId}:${teamId}`)
    .setTitle('Set Your EXACT 2026 Name');

  const input = new TextInputBuilder()
    .setCustomId('real_name')
    .setLabel('Your real/display name')
    .setPlaceholder('e.g. Nguyen Van A')
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(30)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return modal;
}

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
