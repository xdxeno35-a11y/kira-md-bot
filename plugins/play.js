// play.js - KIRA X MD (Supports both search & direct YouTube link)
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    execute: async (sock, msg, args) => {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, { text: `*KIRA Error* : Missing song name or YouTube link.\nExample: .play Believer or .play https://youtu.be/...` }, { quoted: msg });
            return;
        }

        const statusMsg = await sock.sendMessage(jid, { text: `*KIRA Searching* : ${query}...` });

        try {
            const { title, duration, audioBuffer } = await downloadAndGetAudio(query);
            await sock.sendMessage(jid, { text: `*KIRA downloading* : ${title} (${duration})...`, edit: statusMsg.key });
            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `${title.slice(0, 40)}.mp3`,
                caption: `*KIRA X MD take*`
            });
        } catch (error) {
            console.error('Play error:', error);
            await sock.sendMessage(jid, { text: `*KIRA Error* : ${error.message}`, edit: statusMsg.key });
        }
    }
};

async function downloadAndGetAudio(input) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const outputPath = path.join(tempDir, `${Date.now()}.mp3`);

    const ytDlpPath = path.join(__dirname, '../yt-dlp.exe');
    const cookiePath = path.join(__dirname, '../cookies.txt');
    const cookieFlag = fs.existsSync(cookiePath) ? ` --cookies "${cookiePath}"` : '';

    // Determine if input is a YouTube URL
    const isUrl = input.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/);

    let target;
    if (isUrl) {
        // Direct URL – no search
        target = `"${input}"`;
    } else {
        // Search query
        target = `"ytsearch1:${input}"`;
    }

    // Get metadata (title, duration)
    let title, duration;
    try {
        const infoCommand = `"${ytDlpPath}" ${target} --dump-json --no-playlist --js-runtime node${cookieFlag}`;
        const { stdout } = await execPromise(infoCommand, { timeout: 30000 });
        const info = JSON.parse(stdout);
        title = info.title;
        duration = formatDuration(info.duration);
    } catch (err) {
        throw new Error('Failed to get song info: ' + err.message);
    }

    // Download audio
    const downloadCommand = `"${ytDlpPath}" ${target} -f bestaudio --extract-audio --audio-format mp3 --audio-quality 0 --no-playlist --js-runtime node${cookieFlag} -o "${outputPath}"`;
    await execPromise(downloadCommand, { timeout: 120000 });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
        throw new Error('Download failed');
    }

    const audioBuffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath);

    return { title, duration, audioBuffer };
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}