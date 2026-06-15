const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'spotify',
    alias: ['sp', 'spotifydl'],
    category: 'downloader',
    description: 'Download audio from Spotify link or song name (Play Style)',
    usage: `${process.env.PREFIX || '.'}spotify <Spotify URL or Song Name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What Spotify song do you want?*\n\nExample: .spotify <Spotify Link>\nOR: .spotify Past Lives` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        
        let statusMsg;
        try {
            statusMsg = await sock.sendMessage(jid, { text: `🎵 *Processing your request...*` }, { quoted: msg });
        } catch (e) {}

        try {
            let searchTarget = query;
            const isSpotifyUrl = query.match(/(https?:\/\/open\.spotify\.com\/(track|playlist|album)\/[a-zA-Z0-9]+)/gi);

            if (isSpotifyUrl) {
                const url = isSpotifyUrl[0];
                if (statusMsg) await sock.sendMessage(jid, { text: `🔍 *Fetching metadata from Spotify...*`, edit: statusMsg.key }).catch(()=>{});

                const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
                const oembedRes = await axios.get(oembedUrl, { timeout: 5000 });
                
                if (oembedRes.data && oembedRes.data.title) {
                    searchTarget = `${oembedRes.data.title} ${oembedRes.data.author_name || ''}`.trim();
                } else {
                    throw new Error("Failed to extract track info from Spotify.");
                }
            }

            if (statusMsg) await sock.sendMessage(jid, { text: `🔍 *Searching audio for: ${searchTarget}*`, edit: statusMsg.key }).catch(()=>{});
            
            const searchResults = await ytSearch(searchTarget);
            const video = searchResults.videos ? searchResults.videos.find(v => v.url) : null;

            if (!video || !video.url) {
                throw new Error('No matching audio stream found.');
            }
            const ytUrl = video.url;

            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
            if (statusMsg) await sock.sendMessage(jid, { text: `📥 *Downloading from high-speed servers...*`, edit: statusMsg.key }).catch(()=>{});

            let audioUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(ytUrl)}`, 
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(ytUrl)}`,    
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(ytUrl)}`,              
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(ytUrl)}` 
            ];

            for (let i = 0; i < apis.length; i++) {
                try {
                    const res = await axios.get(apis[i], { timeout: 5000 });
                    const data = res.data;
                    
                    if (data.data && data.data.dl) audioUrl = data.data.dl;
                    else if (data.url) audioUrl = data.url;
                    else if (data.result && (data.result.download_url || data.result.url || data.result.audio)) audioUrl = data.result.download_url || data.result.url || data.result.audio;
                    else if (data.audio) audioUrl = data.audio;
                    else if (typeof data.result === 'string') audioUrl = data.result;

                    if (audioUrl && audioUrl.startsWith('http')) {
                        break; 
                    }
                } catch (e) {}
            }

            if (!audioUrl) throw new Error('All audio servers are currently busy.');

            if (statusMsg) await sock.sendMessage(jid, { text: `✨ *Sending audio stream to WhatsApp...*`, edit: statusMsg.key }).catch(()=>{});

            await sock.sendMessage(jid, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${searchTarget}.mp3`
            }, { quoted: msg });

            if (statusMsg) await sock.sendMessage(jid, { text: `✅ *Track downloaded successfully!*`, edit: statusMsg.key }).catch(()=>{});
            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        } catch (err) {
            console.error("Spotify Error:", err.message); // എറർ മാത്രം കാണിക്കും
            if (statusMsg) {
                await sock.sendMessage(jid, { text: `❌ *Failed! (${err.message})*`, edit: statusMsg.key }).catch(()=>{});
            } else {
                await sock.sendMessage(jid, { text: `❌ *Failed! (${err.message})*` }, { quoted: msg });
            }
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};