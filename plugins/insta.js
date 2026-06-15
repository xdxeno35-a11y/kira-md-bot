const axios = require('axios');

module.exports = {
    name: 'insta',
    alias: ['ig', 'igdl', 'instagram', 'reel'],
    category: 'downloader',
    description: 'Download Instagram reels/videos',
    usage: `${process.env.PREFIX || '.'}insta <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // റിപ്ലൈ മെസ്സേജിൽ നിന്നും ലിങ്ക് എടുക്കാനുള്ള ലോജിക്
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

            const match = rawText.match(/https?:\/\/(www\.)?instagram\.com\/\S+/);
            url = match ? match[0] : "";
        }

        if (!url || !url.includes('instagram.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Instagram URL or reply to a valid link!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        let statusMsg; 

        try {
            statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading Instagram media...*` });

            // നീ തന്ന പുതിയ Jerrycoder API ഇവിടെ ആഡ് ചെയ്തു
            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/down/insta?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            const apiData = res.data;
            let videoUrl = '';

            // Jerrycoder API-യുടെ പലതരം റെസ്പോൺസ് ഫോർമാറ്റുകൾ സപ്പോർട്ട് ചെയ്യാൻ
            if (apiData.result) {
                if (Array.isArray(apiData.result) && apiData.result.length > 0) {
                    videoUrl = apiData.result[0].url || apiData.result[0].download_url || apiData.result[0];
                } else if (typeof apiData.result === 'object') {
                    videoUrl = apiData.result.url || apiData.result.download_url || apiData.result.video;
                }
            } else if (apiData.data) {
                if (Array.isArray(apiData.data) && apiData.data.length > 0) {
                    videoUrl = apiData.data[0].url || apiData.data[0].download_url;
                } else if (typeof apiData.data === 'object') {
                    videoUrl = apiData.data.url || apiData.data.download_url;
                }
            } else if (apiData.url || apiData.download_url) {
                videoUrl = apiData.url || apiData.download_url;
            }

            if (!videoUrl) {
                console.log("Insta API Response Error:", JSON.stringify(apiData, null, 2));
                throw new Error('Media link not found in API response');
            }

            // ഡൗൺലോഡ് ചെയ്ത് ബഫർ എടുക്കുന്നു
            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD INSTAGRAM DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Instagram media sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error('Insta Error:', err.message || err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            
            if (statusMsg && statusMsg.key) {
                await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Failed to download!*` }, { quoted: msg });
            }
        }
    }
};