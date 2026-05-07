const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'teams.json');

class TeamManager {
  constructor() {
    this._load();
  }

  // ── Private ────────────────────────────────
  _load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this._db = JSON.parse(raw);
      } else {
        this._db = { teams: [] };
        this._save();
      }
    } catch {
      this._db = { teams: [] };
    }
  }

  _save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this._db, null, 2), 'utf-8');
  }

  // ── Public API ─────────────────────────────

  /** @returns {Team[]} */
  getTeams() {
    return this._db.teams;
  }

  /** @param {string} id @returns {Team|undefined} */
  getTeamById(id) {
    return this._db.teams.find((t) => t.id === id);
  }

  /**
   * @param {string} name
   * @param {string} leaderId
   * @param {string} leaderTag
   * @returns {Team}
   */
  createTeam(name, leaderId, leaderTag) {
    const team = {
      id: uuidv4().slice(0, 8).toUpperCase(),
      name,
      leader: leaderTag,
      leaderId,
      roleId: null,
      voiceChannelId: null,
      textChannelId: null,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: leaderId,
          tag: leaderTag,
          joinedAt: new Date().toISOString(),
        },
      ],
    };
    this._db.teams.push(team);
    this._save();
    return team;
  }

updateTeam(teamId, data) {
  const team = this.getTeamById(teamId);

  if (!team) {
    throw new Error('Team not found');
  }

  Object.assign(team, data);

  this._save();

  return team;
}

  /**
   * @param {string} teamId
   * @param {string} userId
   * @param {string} userTag
   */
  addMemberToTeam(teamId, userId, userTag) {
    const team = this.getTeamById(teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);
    if (team.members.length >= 5) throw new Error('Team is full');
    team.members.push({ id: userId, tag: userTag, joinedAt: new Date().toISOString() });
    this._save();
  }

  /** @param {string} name @returns {boolean} */
  normalizeTeamName(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  teamExists(name) {
    const normalized = this.normalizeTeamName(name);

    return this._db.teams.some(
      (t) =>
        this.normalizeTeamName(t.name) === normalized
    );
  }

  /** @param {string} userId @returns {Team|undefined} */
  findTeamByMember(userId) {
    return this._db.teams.find((t) =>
      t.members.some((m) => m.id === userId)
    );
  }

    /**
   * Remove member from a team
   * @param {string} teamId
   * @param {string} userId
   */
  removeMemberFromTeam(teamId, userId) {
    const team = this.getTeamById(teamId);

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    team.members = team.members.filter((m) => m.id !== userId);

    // Auto delete team if empty
    if (team.members.length === 0) {
      this._db.teams = this._db.teams.filter((t) => t.id !== teamId);
    }

    // If leader leaves → assign new leader
    else if (team.leaderId === userId) {
      const newLeader = team.members[0];

      team.leaderId = newLeader.id;
      team.leader = newLeader.tag;
    }

    this._save();
  }

  /**
   * Delete a team completely
   * @param {string} teamId
   */
  deleteTeam(teamId) {
    this._db.teams = this._db.teams.filter((t) => t.id !== teamId);
    this._save();
  }
}

module.exports = TeamManager;
