const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findRecursive(dir, filename) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) return fullPath;
            if (entry.isDirectory()) {
                const found = findRecursive(fullPath, filename);
                if (found) return found;
            }
        }
    } catch {}
    return null;
}

function findFFmpeg() {
    // Try PATH first
    try {
        const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
        const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim().split('\n')[0].trim();
        if (result && fs.existsSync(result)) return result;
    } catch {}

    // Search common install locations
    const localAppData = process.env.LOCALAPPDATA || '';
    const searchDirs = [
        path.join(localAppData, 'Microsoft', 'WinGet', 'Packages'),
        'C:\\ffmpeg\\bin',
        'C:\\Program Files\\ffmpeg\\bin',
    ];
    for (const dir of searchDirs) {
        const found = findRecursive(dir, 'ffmpeg.exe');
        if (found) return found;
    }

    return 'ffmpeg';
}

const FFMPEG_PATH = findFFmpeg();
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

module.exports = { FFMPEG_PATH, PYTHON_CMD };
