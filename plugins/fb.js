const axios = require('axios');

module.exports = {
    name: 'fb',
    alias: ['facebook'],
    category: 'downloader',
    description: 'Download Facebook videos',
    usage: `${process.env.PREFIX || '.'}fb <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a Facebook video link!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

        try {
            // Facebook Downloader API എൻഡ്‌പോയിന്റ്
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            // API-ൽ നിന്ന് ലഭിക്കുന്ന വീഡിയോ ലിങ്ക്
            const videoUrl = res.data.result.video_hd || res.data.result.video_sd;

            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD FB DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("FB Error:", err);
            await sock.sendMessage(jid, { text: "❌ *Download failed!*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};