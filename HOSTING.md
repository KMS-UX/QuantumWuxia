# 🏠 Local Hosting Guide

This guide explains how to host Realm of Echoes on your local machine or network.

## 🚀 Quick Start (Easiest Method)

### Windows
```bash
# Double-click start.js or run in terminal:
node start.js
```

### macOS/Linux
```bash
chmod +x start.js
./start.js
```

This will:
1. Install dependencies (if needed)
2. Build the project (if needed)
3. Start the local server
4. Open the game at http://localhost:3000

## 📋 Manual Setup

### Step 1: Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/)
- Recommended version: 18.x or higher
- Verify installation: `node --version`

### Step 2: Clone/Download the Project

```bash
# If using git:
git clone <repository-url>
cd realm-of-echoes

# Or download and extract the ZIP file
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build the Project

```bash
npm run build
```

This creates a `dist/` folder with the production build.

### Step 5: Start the Server

```bash
npm run serve
```

The game will be available at http://localhost:3000

## 🔧 Server Configuration

### Change Port

```bash
# Linux/macOS
PORT=8080 npm run serve

# Windows (PowerShell)
$env:PORT=8080; npm run serve

# Windows (Command Prompt)
set PORT=8080 && npm run serve
```

### Run in Background

```bash
# Linux/macOS
nohup npm run serve &

# Or use pm2
npm install -g pm2
pm2 start server.js --name realm-of-echoes
```

### Auto-start on Boot

#### Linux (systemd)

Create `/etc/systemd/system/realm-of-echoes.service`:

```ini
[Unit]
Description=Realm of Echoes RPG Server
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/realm-of-echoes
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable realm-of-echoes
sudo systemctl start realm-of-echoes
```

#### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When the computer starts"
4. Action: "Start a program"
5. Program: `node`
6. Arguments: `server.js`
7. Start in: `C:\path\to\realm-of-echoes`

## 🌐 Network Access

### Access from Other Devices on Same Network

1. Find your computer's local IP address:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **macOS/Linux**: `ifconfig` or `ip addr`

2. Access the game from other devices:
   ```
   http://192.168.1.X:3000
   ```
   (Replace 192.168.1.X with your actual IP)

### Firewall Configuration

If other devices can't connect, you may need to allow the port:

#### Windows Firewall
```powershell
netsh advfirewall firewall add rule name="Realm of Echoes" dir=in action=allow protocol=TCP localport=3000
```

#### Linux (ufw)
```bash
sudo ufw allow 3000/tcp
```

#### macOS
System Preferences → Security & Privacy → Firewall → Allow incoming connections

## 🐳 Docker Deployment

### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build the image
docker build -t realm-of-echoes .

# Run the container
docker run -d -p 3000:3000 --name realm-of-echoes realm-of-echoes

# View logs
docker logs realm-of-echoes

# Stop the container
docker stop realm-of-echoes

# Remove the container
docker rm realm-of-echoes
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  realm-of-echoes:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - PORT=3000
```

Run:
```bash
docker-compose up -d
```

## ☁️ Cloud Hosting

### Vercel (Recommended for Free Hosting)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Railway

1. Push code to GitHub
2. Connect repository to Railway
3. Set build command: `npm run build`
4. Set start command: `npm run serve`

### Heroku

Create `Procfile`:
```
web: node server.js
```

Deploy:
```bash
heroku create realm-of-echoes
git push heroku main
```

## 🔒 Security Considerations

### For Public Hosting

1. **Enable HTTPS**: Use a reverse proxy (nginx) with Let's Encrypt
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **CORS**: Configure CORS if needed
4. **API Keys**: Never commit API keys to version control
5. **Environment Variables**: Use `.env` files for configuration

### Nginx Reverse Proxy Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring

### View Server Logs

```bash
# Direct output
npm run serve

# With pm2
pm2 logs realm-of-echoes

# Docker
docker logs -f realm-of-echoes
```

### Health Check

Add a health endpoint to `server.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
# Linux/macOS
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# Kill the process
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

### Server Won't Start

1. Check Node.js version: `node --version` (should be 18+)
2. Check if dist/ folder exists
3. Check server.js for errors
4. Try running in development mode: `npm run dev`

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🆘 Support

If you encounter issues:
1. Check the main README.md
2. Review this hosting guide
3. Check server logs for error messages
4. Open an issue on GitHub

---

**Happy hosting!** 🎮✨
