const { spawn } = require('child_process');
const { FFMPEG_PATH } = require('./ffmpeg');

const BOUNDARY = 'speedystopia_frame';
const SOI = Buffer.from([0xFF, 0xD8]);
const EOI = Buffer.from([0xFF, 0xD9]);

let process = null;
let frameCount = 0;
const clients = new Set();

function createJpegParser(onFrame) {
    let buffer = Buffer.alloc(0);
    return function feed(chunk) {
        buffer = Buffer.concat([buffer, chunk]);
        while (true) {
            const startIdx = buffer.indexOf(SOI);
            if (startIdx === -1) { buffer = Buffer.alloc(0); return; }
            if (startIdx > 0) buffer = buffer.subarray(startIdx);

            const endIdx = buffer.indexOf(EOI, 2);
            if (endIdx === -1) return;

            const frame = buffer.subarray(0, endIdx + 2);
            buffer = buffer.subarray(endIdx + 2);
            onFrame(frame);
        }
    };
}

function broadcastFrame(frame) {
    const header = `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`;
    for (const res of clients) {
        try {
            res.write(header);
            res.write(frame);
            res.write('\r\n');
        } catch {
            clients.delete(res);
        }
    }
}

function start() {
    stop();
    frameCount = 0;

    const args = [
        '-y',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-f', 'gdigrab',
        '-framerate', '20',
        '-i', 'desktop',
        '-vf', 'scale=1920:1080',
        '-c:v', 'mjpeg',
        '-q:v', '3',
        '-f', 'mjpeg',
        '-flush_packets', '1',
        'pipe:1',
    ];

    console.log('[video] Starting FFmpeg...');
    process = spawn(FFMPEG_PATH, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const parseJpeg = createJpegParser((frame) => {
        frameCount++;
        if (frameCount <= 3 || frameCount % 200 === 0) {
            console.log(`[video] Frame #${frameCount} (${frame.length} bytes, ${clients.size} clients)`);
        }
        broadcastFrame(frame);
    });

    process.stdout.on('data', parseJpeg);

    process.stderr.on('data', (data) => {
        for (const line of data.toString().split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('frame=')) {
                console.log('[ffmpeg:video]', trimmed);
            }
        }
    });

    process.on('close', (code) => {
        console.log(`[video] FFmpeg exited (code ${code}), ${frameCount} frames sent`);
        process = null;
    });

    process.on('error', (err) => {
        console.error('[video] FFmpeg error:', err.message);
        process = null;
    });
}

function stop() {
    if (!process) return;
    console.log('[video] Stopping...');
    process.kill('SIGTERM');
    process = null;
}

function addClient(req, res) {
    res.writeHead(200, {
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
        'Cache-Control': 'no-store',
        'Connection': 'close',
    });
    clients.add(res);
    console.log(`[video] Client connected (${clients.size} total)`);
    req.on('close', () => {
        clients.delete(res);
        console.log(`[video] Client disconnected (${clients.size} remaining)`);
    });
}

function isRunning() { return process !== null; }

module.exports = { start, stop, addClient, isRunning };
