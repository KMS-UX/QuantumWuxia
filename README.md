# ⚔️ Realm of Echoes - AI Text RPG

A browser-based text RPG with AI-powered narrative and hybrid LLM support (cloud + local).

![Realm of Echoes](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🎮 Features

- **AI-Powered Narrative**: Every turn is narrated by AI, creating unique stories
- **Hybrid LLM Support**: Connect to cloud (OpenAI) or local (Ollama, LM Studio) models
- **Free Intent System**: Type what you want to do in your own words
- **Persistent World**: Items, relationships, and events are tracked
- **Save/Load System**: Multiple save slots to preserve your adventures
- **Character Creation**: Choose race, class, and background
- **Demo Mode**: Play without configuring an LLM
- **Local Hosting**: Run the game on your own machine

## 🚀 Quick Start

### Option 1: Development Mode

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Option 2: Production Build + Local Server

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start local server
npm run serve
```

Open http://localhost:3000 in your browser.

### Option 3: Preview Build

```bash
# Install dependencies
npm install

# Build and preview
npm run build
npm run preview
```

## 🤖 AI Configuration

The game supports multiple LLM backends:

### Local Models (Recommended for Privacy)

#### Ollama
1. Download from [ollama.ai](https://ollama.ai)
2. Install and start Ollama
3. Pull a model: `ollama pull llama3`
4. In game settings, select "Ollama (Local)"
5. Default URL: `http://localhost:11434`

#### LM Studio
1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Download a model within LM Studio
3. Start the local server
4. In game settings, select "LM Studio (Local)"
5. Default URL: `http://localhost:1234`

### Cloud Models

#### OpenAI
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. In game settings, select "OpenAI (Cloud)"
3. Enter your API key
4. Choose a model (GPT-4o, GPT-3.5, etc.)

### Custom Endpoint
Any OpenAI-compatible API endpoint can be used.

## 🎯 How to Play

1. **Create Your Character**: Choose name, race, class, and background
2. **Read the Narrative**: The AI describes what's happening
3. **Make Choices**: Select from 5 options or write your own action
4. **Explore**: Your decisions shape the story
5. **Save Progress**: Use the Save button to preserve your adventure

### Game Mechanics

- **Choices**: Each option has a risk level (🟢 Safe, 🟡 Risky, 🔴 Dangerous)
- **Intent**: Write what you want to do in your own words (up to 200 characters)
- **Stats**: STR, AGI, INT, CHA, LCK affect outcomes
- **Inventory**: Collect items, weapons, and potions
- **Quests**: Track your objectives and progress
- **Relationships**: NPCs remember how you treat them

## 🏗️ Project Structure

```
├── src/
│   ├── components/       # React components
│   │   ├── CharacterCreation.tsx
│   │   ├── GameScreen.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── WelcomeScreen.tsx
│   │   └── SaveLoadModal.tsx
│   ├── services/         # API services
│   │   └── llmService.ts
│   ├── store/            # State management
│   │   └── gameStore.ts
│   ├── types/            # TypeScript types
│   │   └── game.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── server.js             # Local production server
├── package.json
└── README.md
```

## 🔧 Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **date-fns** - Date formatting

## 🌐 Local Hosting

### Using the Built-in Server

```bash
npm run build
npm run serve
```

The server runs on port 3000 by default. Change it with:
```bash
PORT=8080 npm run serve
```

### Using Other Servers

The built `dist/` folder can be served by any static file server:

```bash
# Python
cd dist && python -m http.server 3000

# Node.js (http-server)
npx http-server dist -p 3000

# Nginx/Apache
# Point to the dist/ directory
```

### Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "serve"]
```

Build and run:
```bash
docker build -t realm-of-echoes .
docker run -p 3000:3000 realm-of-echoes
```

## 🎨 Customization

### World Themes
- 🏰 High Fantasy
- 🚀 Science Fiction
- 👻 Horror
- ⚔️ Wuxia (Martial Arts)
- 🎨 Custom

### Narrative Styles
- **Detailed**: Rich descriptions and atmosphere
- **Concise**: Quick and to the point
- **Dramatic**: Theatrical and intense

## 📝 Game Log Export

Export your adventure as a text file:

1. Open the game
2. Click the "Save" button
3. Select "Export Log"
4. Choose a location to save

## 🔒 Privacy

- **Local Mode**: All data stays on your device
- **No Tracking**: No analytics or telemetry
- **API Keys**: Stored locally in browser storage
- **Open Source**: Inspect the code yourself

## 🐛 Troubleshooting

### LLM Connection Issues

**Ollama not connecting:**
- Ensure Ollama is running: `ollama serve`
- Check CORS settings if needed
- Verify model is pulled: `ollama list`

**OpenAI API errors:**
- Verify API key is correct
- Check account has credits
- Ensure model name is valid

**Game stuck in demo mode:**
- Configure an LLM in Settings
- Test connection before starting game
- Check browser console for errors

### Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🙏 Acknowledgments

Inspired by [Blade RPG](https://www.bladerpg.com) and other text-based RPGs.

## 📮 Contact

For issues, feature requests, or questions, please open an issue on GitHub.

---

**Enjoy your adventure in the Realm of Echoes!** ⚔️✨
