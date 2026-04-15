const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const { PYTHON_CMD } = require('./ffmpeg');

let loopbackProcess = null;
let wss = null;

function start() {
    stop();

    const loopbackScript = path.join(__dirname, '..', 'loopback.py');
    console.log('[audio] Starting WASAPI loopback (raw PCM via WebSocket)...');

    loopbackProcess = spawn(PYTHON_CMD, [loopbackScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    loopbackProcess.stdout.on('data', (chunk) => {
        if (!wss) return;
        for (const ws of wss.clients) {
            if (ws.readyState === WebSocket.OPEN) {
                if (ws.bufferedAmount > 64 * 1024) continue; // backpressure
                try { ws.send(chunk); } catch {}
            }
        }
    });

    loopbackProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log('[audio:loopback]', msg);
    });

    loopbackProcess.on('error', (err) => {
        console.error('[audio] Loopback error:', err.message);
    });

    loopbackProcess.on('close', (code) => {
        console.log(`[audio] Loopback exited (code ${code})`);
        loopbackProcess = null;
    });
}

function stop() {
    if (!loopbackProcess) return;
    console.log('[audio] Stopping loopback...');
    try { loopbackProcess.kill(); } catch {}
    loopbackProcess = null;
}

function attach() {
    wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', (ws) => {
        console.log(`[audio] WS client connected (${wss.clients.size} total)`);
        ws.on('close', () => {
            console.log(`[audio] WS client disconnected (${wss.clients.size} remaining)`);
        });
    });
}

function handleUpgrade(req, socket, head) {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
}

function isRunning() { return loopbackProcess !== null; }

module.exports = { start, stop, attach, handleUpgrade, isRunning };
