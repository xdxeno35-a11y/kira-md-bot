const axios = require('axios');

module.exports = {
    name: 'yta',
    alias: ['ytaudio', 'ytmp3'],
    category: 'downloader',
    description: 'Download YouTube audio as document',
    usage: `${process.env.PREFIX || '.'}yta <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!url && quoted) {
            const getRawText = (q) => {
                return q.conversation || 
                       q.extendedTextMessage?.text || 
                       q.imageMessage?.caption || 
                       q.videoMessage?.caption || 
                       q.buttonsMessage?.contentText || 
                       "";
            };
            let rawText = getRawText(quoted);
            if (!rawText && quoted.extendedTextMessage?.contextInfo?.quotedMessage) {
                rawText = getRawText(quoted.extendedTextMessage.contextInfo.quotedMessage);
            }
            const match = rawText.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (match) url = `https://youtu.be/${match[1]}`;
        }

        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return await sock.sendMessage(jid, { text: `❌ *Please provide a valid YouTube URL!*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        let statusMsg;

        try {
            statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading audio as document...*` });
            
            let audioUrl = '';
            let audioTitle = 'KIRA_X_MD_Audio'; 

            const apis = [
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(url)}`
            ];

            for (let i = 0; i < apis.length; i++) {
                try {
                    const res = await axios.get(apis[i], { timeout: 15000 });
                    const data = res.data;
                    
                    if (data.data && data.data.dl) {
                        audioUrl = data.data.dl;
                        audioTitle = data.data.title || audioTitle;
                    } else if (data.url) {
                        audioUrl = data.url;
                        audioTitle = data.title || audioTitle;
                    } else if (data.result && (data.result.download_url || data.result.url || data.result.audio)) {
                        audioUrl = data.result.download_url || data.result.url || data.result.audio;
                        audioTitle = data.result.title || audioTitle;
                    }

                    if (audioUrl && audioUrl.startsWith('http')) {
                        break; 
                    }
                } catch (e) {}
            }

            if (!audioUrl) {
                throw new Error('All audio servers are currently busy.');
            }

            await sock.sendMessage(jid, { 
                document: { url: audioUrl }, 
                mimetype: 'audio/mpeg', 
                fileName: `${audioTitle}.mp3`, 
                caption: '*🎌 KIRA X MD YTA DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Audio sent as document*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("YTA Downloader Error:", err.message); // എറർ മാത്രം ടെർമിനലിൽ കാണിക്കും
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            if (statusMsg && statusMsg.key) {
                await sock.sendMessage(jid, { text: `❌ *Failed! (${err.message})*`, edit: statusMsg.key });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Failed to download!*` }, { quoted: msg });
            }
        }
    }
};