const { EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────────────────────────────────────
const BRAND_BLUE  = 0x1565C0;   // deep IEEE blue
const BRAND_GOLD  = 0xF9A825;   // academic gold accent
const DARK_BG     = 0x0D1B2A;   // near-black navy

// ─────────────────────────────────────────────────────────────────────────────
// buildWelcomeEmbed
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {GuildMember} member
 * @param {Team[]} teams
 * @returns {EmbedBuilder}
 */
function buildWelcomeEmbed(member, teams) {
  return new EmbedBuilder()
    .setColor(BRAND_BLUE)
    .setAuthor({
      name: 'EXACT 2026 - Official Competition Server',
    })
    .setTitle(
      'Welcome to EXACT 2026\n' +
      'The 2nd International XAI Challenge for Transparent Educational Question-Answering'
    )
    .setDescription(
      [
        `Dear **${member.displayName}**,`,
        '',
        'It is our honour to welcome you to the official **EXACT 2026** competition server.',
        'This international event challenges teams worldwide to build AI systems that answer educational questions **accurately and transparently**.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '**Competition Overview**',
        'EXACT 2026 tasks span **logic-based reasoning** over academic regulations and **STEM problem-solving** in physics and electric circuits. Your system must not only answer correctly — it must *explain* every response clearly and verifiably.',
        '',
        '**Organised By**',
        '▸ Ho Chi Minh City University of Technology (HCMUT), Vietnam',
        '▸ University of Naples Parthenope, Italy',
        '▸ Part of the **IEEE IJCNN 2026** Competition Program',
        '',
        '**Challenge Chairs**',
        '▸ Assoc. Prof. Quan Thanh Tho — HCMUT, Vietnam',
        '▸ Dr. Emanuel Di Nardo — Univ. of Naples Parthenope, Italy',
        '▸ Prof. Nguyen Duc Anh — Univ. of South-Eastern Norway',
        '▸ Assoc. Prof. Fabien Baldacci — Université de Bordeaux, France',
        '▸ Prof. Nguyen Le Minh — JAIST, Japan',
        '',
        '**Technical Requirements**',
        '▸ Only open-source LLMs with **≤ 8B parameters** are allowed',
        '▸ Closed-source models (GPT, Claude, Gemini, …) are **strictly prohibited**',
        '▸ Symbolic reasoning tools (Z3, custom solvers, …) are encouraged',
        '',
        '**Prizes & Recognition**',
        '▸ **Top 5** — Cash prizes + invited presentation at CSoNet 2026 (Springer LNCS/LNAI)',
        '▸ **Top 10** — Invited paper to the "Explainable AI for Educational QA" special session',
        '▸ **All finishers** — Official certificate from the Challenge Chairs',
        '▸ **HCMUT-VNU students** — Training points awarded',
        '',
        '**Key Dates**',
        '▸ Team Registration — Apr 10 – **May 10, 2026**',
        '▸ Kick-off Workshop & Dataset Release — May 4, 2026',
        '▸ Main Competition Phase — May 5 – May 30, 2026',
        '▸ Top 10 Announcement — Jun 10, 2026',
        '▸ Public Test Day (live evaluation) — Jun 15, 2026',
        '▸ Presentation at CSoNet 2026 — Nov 16–18, 2026',
      ].join('\n')
    )
    .setFooter({
      text: 'EXACT 2026 | IEEE IJCNN 2026 Competition Program',
    })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────────────────────────────
// buildTeamTableEmbed
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {Team[]} teams
 * @returns {EmbedBuilder}
 */
function buildTeamTableEmbed(teams) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_GOLD)
    .setTitle('EXACT 2026 — Team Registry')
    .setFooter({ text: `Last updated` })
    .setTimestamp();

  if (teams.length === 0) {
    embed.setDescription(
      [
        '```',
        'No teams have been registered yet.',
        'Be the first — create your team now!',
        '```',
        '*A team table will appear here once the first team is registered.*',
      ].join('\n')
    );
    return embed;
  }

  // Build ASCII table
  // Columns: #  | Team Name  | Leader  | Members
  const rows = teams.map((t, i) => ({
    num: String(i + 1).padStart(2),
    id: t.id,
    name: truncate(t.name, 16),
    leader: truncate(t.leader, 14),
    members: `${t.members.length}/5`,
    status: t.members.length >= 5 ? '🔒 Full' : '🟢 Open',
  }));

  const colWidths = {
    num:    2,
    id:     8,
    name:   16,
    leader: 14,
    members: 3,
    status: 2,
  };

  const header =
    pad('#',   colWidths.num)    + '  ' +
    pad('ID',  colWidths.id)     + '  ' +
    pad('Team Name',   colWidths.name)   + '  ' +
    pad('Leader',      colWidths.leader) + '  ' +
    pad('Size', colWidths.members) + '  ' +
    'Status';

  const divider = '─'.repeat(header.length);

  const tableLines = [
    '```',
    header,
    divider,
    ...rows.map(
      (r) =>
        pad(r.num,    colWidths.num)    + '  ' +
        pad(r.id,     colWidths.id)     + '  ' +
        pad(r.name,   colWidths.name)   + '  ' +
        pad(r.leader, colWidths.leader) + '  ' +
        pad(r.members,colWidths.members)+ '  ' +
        r.status
    ),
    '```',
  ];

  embed.setDescription(tableLines.join('\n'));
  embed.addFields({
    name: 'Summary',
    value:
      `**${teams.length}** team(s) registered · ` +
      `**${teams.reduce((s, t) => s + t.members.length, 0)}** participant(s) total`,
    inline: false,
  });

  return embed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function pad(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

module.exports = { buildWelcomeEmbed, buildTeamTableEmbed };
