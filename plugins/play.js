const ytSearch = require('yt-search'); 
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio or use direct link',
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        
        if (!query) {
            return await sock.sendMessage(jid, { text: `❌ *What song do you want to play?*\nExample: .play Past Lives or .play <YouTube Link>` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

        try {
            let url = '';
            
            const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = query.match(ytRegex);

            if (match) {
                url = `https://youtu.be/${match[1]}`;
            } else {
                const searchResults = await ytSearch(query);
                const video = searchResults.videos ? searchResults.videos.find(v => v.url) : null;
                
                if (!video || !video.url) {
                    throw new Error('No valid video link found for your search.');
                }
                url = video.url;
            }

            await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

            let audioUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`, 
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(url)}`,    
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,              
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}` 
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

            if (!audioUrl) {
                throw new Error('All audio servers are currently busy. Try again!');
            }

            await sock.sendMessage(jid, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mpeg'
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

        } catch (err) {
            console.error("Play Command Error:", err.message); // എറർ മാത്രം കാണിക്കും
            await sock.sendMessage(jid, { text: `❌ *Failed! (${err.message})*` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};