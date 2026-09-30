# 🚀 Quick Start Guide

## Get Started in 3 Steps

### 1️⃣ Install Dependencies (First Time Only)
```bash
npm install
```

### 2️⃣ Build the Game
```bash
npm run build
```

### 3️⃣ Start the Server
```bash
npm run serve
```

### 4️⃣ Open Your Browser
Navigate to: **http://localhost:3000**

---

## 🎮 Alternative Quick Start

Use the automated script:
```bash
node start.js
```

This will automatically:
- Install dependencies (if needed)
- Build the project (if needed)
- Start the server
- Get you playing in seconds!

---

## 🎯 What You Can Do

### Play the Game
- Create your character (race, class, background)
- Explore the world through AI-narrated text
- Make choices or write your own actions (Intent system)
- Track your inventory, quests, and relationships

### Configure AI
- **Local Mode**: Use Ollama or LM Studio (private, free)
- **Cloud Mode**: Use OpenAI GPT-4/GPT-3.5 (requires API key)
- **Demo Mode**: Play without AI (pre-written content)

### Save Your Progress
- Click the 💾 Save button in the game header
- Create multiple save slots
- Load any previous save
- Export your adventure log as a text file

### Track Achievements
- 9 achievements to unlock
- Automatic tracking as you play
- View progress in the character panel

---

## 📖 Documentation

- **README.md** - Complete project documentation
- **HOSTING.md** - Detailed hosting guide (local, cloud, Docker)
- **ENHANCEMENTS.md** - Full list of features and improvements

---

## 🔧 Troubleshooting

### Port 3000 Already in Use
```bash
# Use a different port
PORT=8080 npm run serve
```

### Build Errors
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### AI Not Working
1. Click the gear icon (Settings)
2. Configure your LLM provider
3. Test the connection
4. Start a new game

---

## 🎉 You're Ready!

Open http://localhost:3000 and begin your adventure in the Realm of Echoes!

**Happy gaming!** ⚔️✨
