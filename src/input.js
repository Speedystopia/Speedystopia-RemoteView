const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const { PYTHON_CMD } = require('./ffmpeg');

let pyProcess = null;
let wss = null;

function start() {
    stop();

    const script = path.join(__dirname, '..', 'input.py');
    console.log('[input] Starting mouse controller...');

    pyProcess = spawn(PYTHON_CMD, ['-u', script], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    pyProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log('[input]', msg);
    });

    pyProcess.on('error', (err) => {
        console.error('[input] Python error:', err.message);
    });

    pyProcess.on('close', (code) => {
        console.log(`[input] Python exited (code ${code})`);
        pyProcess = null;
    });
}

function stop() {
    if (!pyProcess) return;
    console.log('[input] Stopping...');
    try { pyProcess.kill(); } catch {}
    pyProcess = null;
}

function send(cmd) {
    if (!pyProcess || !pyProcess.stdin.writable) return;
    try {
        pyProcess.stdin.write(JSON.stringify(cmd) + '\n');
    } catch {}
}

function attach() {
    wss = new WebSocket.Server({ noServer: true });
    wss.on('connection', (ws) => {
        console.log(`[input] Client connected`);
        ws.on('message', (data) => {
            try {
                const cmd = JSON.parse(data);
                send(cmd);
            } catch {}
        });
        ws.on('close', () => console.log('[input] Client disconnected'));
    });
}

function handleUpgrade(req, socket, head) {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
}

function isRunning() { return pyProcess !== null; }

module.exports = { start, stop, attach, handleUpgrade, isRunning };
