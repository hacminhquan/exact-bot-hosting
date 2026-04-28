# 🏛️ EXACT 2026 — Discord Team Management Bot

> **Official bot for EXACT 2026: The 2nd International XAI Challenge for Transparent Educational Question-Answering**
> Part of the IEEE IJCNN 2026 Competition Program

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎉 Auto-Welcome | Sends a formal welcome letter + team table when a new member joins |
| 📋 Live Team Board | Real-time ASCII team registry table, auto-refreshed on every change |
| 🤝 Join Team | Interactive dropdown to join any open team (< 5 members) |
| ✨ Create Team | Modal-based team creation with name validation & duplicate checks |
| 🔒 Membership Guard | Prevents users from joining/creating multiple teams |
| 💾 Persistent Storage | Teams survive bot restarts via `teams.json` |

---

## 🚀 Quick Setup

### 1. Prerequisites

- **Node.js v18+** — [Download](https://nodejs.org/)
- A **Discord Bot Token** from the [Developer Portal](https://discord.com/developers/applications)

### 2. Create Your Bot Application

1. Go to https://discord.com/developers/applications → **New Application** → name it `EXACT 2026 Bot`
2. Navigate to **Bot** → **Add Bot**
3. Under **Privileged Gateway Intents**, enable:
   - ✅ **SERVER MEMBERS INTENT** ← required for `guildMemberAdd`
   - ✅ **MESSAGE CONTENT INTENT**
4. Copy your **Bot Token**

### 3. Invite the Bot to Your Server

Use this URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025770560&scope=bot+applications.commands
```

**Required permissions:** Send Messages, Embed Links, Read Message History, Use External Emojis, Manage Messages

### 4. Configure the Bot

```bash
# Clone / copy the project folder
cd discord-exact-bot

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and paste your DISCORD_TOKEN
```

### 5. Server Setup

In your Discord server named **"EXACT 2026"**, ensure there is a text channel named exactly:
```
welcome
```
The bot will auto-post welcome messages there when members join.

### 6. Run the Bot

```bash
# Production
npm start

# Development (auto-restart on file change)
npm run dev
```

---

## 📁 Project Structure

```
discord-exact-bot/
├── index.js          # Main bot logic (events & interactions)
├── teamManager.js    # Team CRUD with JSON persistence
├── embeds.js         # Embed builders (welcome letter + team table)
├── teams.json        # Auto-generated team database (gitignored)
├── package.json
├── .env.example      # Environment template
├── .gitignore
└── README.md
```

---

## 🔄 Bot Flow Diagram

```
Member joins "EXACT 2026" server
        │
        ▼
#welcome channel receives:
  ┌─────────────────────────────────────────┐
  │  📜 Welcome Embed (formal letter)       │
  │  📋 Team Registry Table                 │
  │  [🤝 Join Team]  [✨ Create New Team]   │
  └─────────────────────────────────────────┘
        │
   ┌────┴────────────────────┐
   ▼                         ▼
[Join Team]            [Create Team]
   │                         │
   ▼                         ▼
Dropdown list          Modal popup:
of open teams    →    "Enter team name"
   │                         │
   ▼                         ▼
Member added          Team created
to selected           Member auto-joined
   team                as Leader
   │                         │
   └──────────┬──────────────┘
              ▼
     Team Registry Table refreshed
     in #welcome channel ✅
```

---

## ⚙️ Configuration Reference

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token from the Developer Portal |

---

## 🛡️ Business Rules

- A user may only belong to **one team**
- Each team may have a maximum of **5 members**
- Team names must be unique (case-insensitive)
- Team names are limited to 2–40 characters with basic printable characters
- Only open-source LLMs ≤ 8B parameters are allowed in the competition
- Closed-source models (GPT, Claude, Gemini, etc.) are prohibited

---

## 📅 Key Dates

| Milestone | Date |
|---|---|
| Team Registration | Apr 10 – May 10, 2026 |
| Kick-off Workshop | May 4, 2026 |
| Main Competition Phase | May 5 – May 30, 2026 |
| Top 10 Announcement | Jun 10, 2026 |
| Public Test Day | Jun 15, 2026 |
| CSoNet 2026 Presentation | Nov 16–18, 2026 |

---

## 🆘 Troubleshooting

| Issue | Solution |
|---|---|
| `guildMemberAdd` not firing | Enable **SERVER MEMBERS INTENT** in the Developer Portal → Bot settings |
| Bot can't find `#welcome` | Ensure the channel is named exactly `welcome` (lowercase, no spaces) |
| Buttons not responding | Ensure the bot has **Use Application Commands** permission |
| Teams lost after restart | `teams.json` is the database — do not delete it |

---

*EXACT 2026 is organised by HCMUT (Vietnam), University of Naples Parthenope (Italy), and is part of IEEE IJCNN 2026.*
