const axios = require('axios');

module.exports = {
    name: 'tiktok',
    alias: ['tt', 'ttdl'],
    category: 'downloader',
    description: 'Download TikTok videos',
    usage: `${process.env.PREFIX || '.'}tiktok <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('tiktok.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid TikTok URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading TikTok video...*` });

        try {
            // API എൻഡ്‌പോയിന്റ് (TikTok-ന് സാധാരണയായി 'tiktok' എന്ന് തന്നെയാണ് ഉപയോഗിക്കാറുള്ളത്)
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            // API-യിൽ നിന്ന് വീഡിയോ ലിങ്ക് എടുക്കുന്നു
            const videoUrl = res.data.result.noWatermark || res.data.result.video;
            
            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD TIKTOK DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *TikTok video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};