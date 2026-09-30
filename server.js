import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, 'dist');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parse URL
  let filePath = req.url.split('?')[0];
  
  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  const fullPath = path.join(DIST_PATH, filePath);
  
  // Security: prevent directory traversal
  if (!fullPath.startsWith(DIST_PATH)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }
  
  // Check if file exists
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback - serve index.html for all routes
      serveStaticFile(res, path.join(DIST_PATH, 'index.html'));
      return;
    }
    
    serveStaticFile(res, fullPath);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ⚔️  Realm of Echoes - AI Text RPG Server                ║
║                                                            ║
║   🌐 Server running at: http://localhost:${PORT}            ║
║                                                            ║
║   📖 Open the URL above in your browser to play           ║
║                                                            ║
║   ⚙️  To configure AI: Click "Configure AI" in the game    ║
║                                                            ║
║   🛑  Press Ctrl+C to stop the server                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use. Try a different port with PORT=3001 node server.js`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
