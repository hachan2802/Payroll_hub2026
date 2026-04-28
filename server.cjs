const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const PORT = 3000;
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(process.cwd(), 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
};

// Create server
const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Remove leading slash
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Get file path
  let filePath = path.join(DIST_DIR, pathname);
  
  // HOTFIX: Redirect requests for /src/index.css to bundled css
  if (pathname === '/src/index.css') {
    pathname = '/assets/index-9LcwglCV.css';
    filePath = path.join(DIST_DIR, pathname);
  }

  // Security: prevent directory traversal
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // File not found - try to serve index.html (for SPA routing)
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, 'utf-8', (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
        res.end(data);
      });
      return;
    }

    // If directory, redirect to index.html
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (err) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        fs.readFile(indexPath, 'utf-8', (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
          res.end(data);
        });
      });
      return;
    }

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      // Get MIME type
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      // Set cache headers for assets
      let cacheControl = 'no-cache';
      if (ext === '.html') {
        cacheControl = 'public, max-age=3600'; // 1 hour for HTML
      } else if (['.js', '.css', '.png', '.jpg', '.gif', '.svg', '.woff', '.woff2'].includes(ext)) {
        cacheControl = 'public, max-age=31536000'; // 1 year for assets (with hash in filename)
      }

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    });
  });
});

// Start server
server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log('');
  console.log('╔═════════════════════════════════════════╗');
  console.log('║   TA Intern Dashboard - Server Started  ║');
  console.log('╠═════════════════════════════════════════╣');
  console.log(`║  URL: ${url.padEnd(40)}║`);
  console.log(`║  PORT: ${PORT}                                 ║`);
  console.log('║                                         ║');
  console.log('║  Press CTRL+C to stop server            ║');
  console.log('╚═════════════════════════════════════════╝');
  console.log('');

  // Auto-open browser (Windows only)
  if (process.platform === 'win32') {
    const start = require('child_process').exec;
    start(`start ${url}`);
  } else if (process.platform === 'darwin') {
    const start = require('child_process').exec;
    start(`open ${url}`);
  } else if (process.platform === 'linux') {
    const start = require('child_process').exec;
    start(`xdg-open ${url}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nServer shutting down...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nServer shutting down...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
