const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { FFMPEG_PATH } = require('./src/ffmpeg');
const video = require('./src/video');
const audio = require('./src/audio');
const input = require('./src/input');

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// --- Static files (no cache) ---
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => res.set('Cache-Control', 'no-store'),
}));

// --- Stream endpoints ---
app.get('/stream', (req, res) => video.addClient(req, res));

// --- WebSocket servers (noServer mode to avoid upgrade conflicts) ---
audio.attach();
input.attach();

server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname === '/audio-ws') {
        audio.handleUpgrade(req, socket, head);
    } else if (pathname === '/input-ws') {
        input.handleUpgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});

// --- API ---
app.post('/api/start', express.json(), (req, res) => {
    video.start();
    audio.start();
    input.start();
    res.json({ status: 'started' });
});

app.post('/api/stop', express.json(), (req, res) => {
    video.stop();
    audio.stop();
    input.stop();
    res.json({ status: 'stopped' });
});

app.get('/api/status', (req, res) => {
    res.json({ video: video.isRunning(), audio: audio.isRunning() });
});

// --- Cleanup ---
function cleanup() {
    video.stop();
    audio.stop();
    input.stop();
    server.close();
    process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// --- Start ---
function getLocalIP() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of ifaces) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`[server] FFmpeg: ${FFMPEG_PATH}`);
    console.log('='.repeat(50));
    console.log('  Speedystopia - Screen Capture Streaming');
    console.log('='.repeat(50));
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Reseau:  http://${ip}:${PORT}`);
    console.log('  Ctrl+C pour arreter');
    console.log('='.repeat(50));
    console.log('');
    video.start();
    audio.start();
    input.start();
});
