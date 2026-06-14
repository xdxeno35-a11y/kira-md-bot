const axios = require('axios');
const API_BASE = 'https://api-aswin-sparky.koyeb.app/api'; 

async function searchYoutube(query, limit = 1) {
    const res = await axios.get(`${API_BASE}/downloader/ytsearch?query=${encodeURIComponent(query)}`);
    return res.data.result.map(v => ({
        id: v.id,
        title: v.title,
        url: v.url,
        duration: v.duration,
        thumbnail: v.thumbnail
    }));
}

async function downloadAudio(url) {
    const res = await axios.get(`${API_BASE}/downloader/ytmp3?url=${encodeURIComponent(url)}`);
    return { path: res.data.result.download_url, title: res.data.result.title };
}

async function downloadVideo(url) {
    const res = await axios.get(`${API_BASE}/downloader/ytmp4?url=${encodeURIComponent(url)}`);
    return { path: res.data.result.download_url };
}

module.exports = { searchYoutube, downloadAudio, downloadVideo };