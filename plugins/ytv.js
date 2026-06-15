const axios = require('axios');

module.exports = {
    name: 'ytv',
    alias: ['ytvideo'],
    category: 'downloader',
    description: 'Download YouTube video (Stable Multi-API)',
    usage: `${process.env.PREFIX || '.'}ytv <URL>`,

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
            statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading video...*` });
            
            let videoUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp4-v1?url=${encodeURIComponent(url)}`,
                `https://api-aswin-sparky.koyeb.app/api/downloader/ytv?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp4?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/youtube?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(url)}` 
            ];

            for (let i = 0; i < apis.length; i++) {
                try {
                    const res = await axios.get(apis[i], { timeout: 8000 });
                    const data = res.data;
                    
                    if (data.data && data.data.dl) {
                        videoUrl = data.data.dl; 
                    } else if (data.data && data.data.url) {
                        videoUrl = data.data.url; 
                    } else if (data.url) {
                        videoUrl = data.url; 
                    } else if (data.result && (data.result.download_url || data.result.url || data.result.video || data.result.hd)) {
                        videoUrl = data.result.download_url || data.result.url || data.result.video || data.result.hd;
                    } else if (data.video) {
                        videoUrl = data.video;
                    } else if (typeof data.result === 'string') {
                        videoUrl = data.result;
                    }

                    if (videoUrl && videoUrl.startsWith('http')) {
                        break; 
                    }
                } catch (e) {}
            }

            if (!videoUrl) {
                throw new Error('All fast servers are currently busy.');
            }

            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: `*🎌 KIRA X MD YTV DOWNLOADER 🎌*` 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("YTV Downloader Error:", err.message); // എറർ മാത്രം ടെർമിനലിൽ കാണിക്കും
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            if (statusMsg && statusMsg.key) {
                await sock.sendMessage(jid, { text: `❌ *Failed! (${err.message})*`, edit: statusMsg.key });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Failed to download!*` }, { quoted: msg });
            }
        }
    }
};