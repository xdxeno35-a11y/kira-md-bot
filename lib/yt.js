const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

const ytDlpPath = 'yt-dlp'; 
// കുക്കീസ് ഭാഗം പൂർണ്ണമായും നീക്കം ചെയ്തു
const commonArgs = `--js-runtime node --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" --referer "https://www.youtube.com/"`;

async function searchYoutube(query, limit = 10) {
    // cookieFlag ഒഴിവാക്കി
    const command = `${ytDlpPath} "ytsearch${limit}:${query}" -J --flat-playlist ${commonArgs}`;
    const { stdout } = await execPromise(command, { timeout: 30000 });
    const data = JSON.parse(stdout);
    const entries = data.entries || [];
    return entries.map(entry => ({
        id: entry.id,
        title: entry.title,
        url: `https://youtube.com/watch?v=${entry.id}`,
        duration: entry.duration ? formatDuration(entry.duration) : 'N/A',
        views: entry.view_count || 0,
        channel: { name: entry.channel || 'Unknown' },
        uploadedAt: entry.upload_date || 'N/A',
        thumbnail: `https://img.youtube.com/vi/${entry.id}/hqdefault.jpg`
    }));
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getVideoInfo(url) {
    const command = `${ytDlpPath} -J "${url}" ${commonArgs}`;
    const { stdout } = await execPromise(command, { timeout: 30000 });
    const info = JSON.parse(stdout);
    const formats = [];
    if (info.formats) {
        for (const f of info.formats) {
            if (f.vcodec !== 'none') {
                formats.push({ type: 'video', quality: f.height ? `${f.height}p` : 'unknown', size: f.filesize ? formatBytes(f.filesize) : null });
            } else if (f.acodec !== 'none') {
                formats.push({ type: 'audio', quality: f.abr ? `${f.abr}kbps` : 'audio', size: f.filesize ? formatBytes(f.filesize) : null });
            }
        }
    }
    return { title: info.title, videoId: info.id, formats: formats };
}

async function downloadAudio(url, customTitle = null) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const outputPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
    // cookieFlag പൂർണ്ണമായും നീക്കം ചെയ്തു
    const command = `${ytDlpPath} -f bestaudio --extract-audio --audio-format mp3 -o "${outputPath}" "${url}" ${commonArgs}`;
    await execPromise(command, { timeout: 120000 });
    return { path: outputPath, title: customTitle || 'audio' };
}

async function downloadVideo(url, quality = 'best') {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const outputPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    let format = 'bestvideo+bestaudio/best';
    if (quality === '360p') format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
    else if (quality === '720p') format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
    // cookieFlag പൂർണ്ണമായും നീക്കം ചെയ്തു
    const command = `${ytDlpPath} -f "${format}" --merge-output-format mp4 -o "${outputPath}" "${url}" ${commonArgs}`;
    await execPromise(command, { timeout: 180000 });
    if (!fs.existsSync(outputPath)) throw new Error('No video file');
    return { path: outputPath };
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { searchYoutube, getVideoInfo, downloadAudio, downloadVideo, formatBytes };