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
            // നീ തന്ന EliteProTech API ലിങ്ക്
            const apiUrl = `https://eliteprotech-apis.zone.id/tiktok?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            // ലോഗിൽ കണ്ടതനുസരിച്ച് ലിങ്ക് എടുക്കുന്നു (MP4 HD ആണ് ബെസ്റ്റ് ക്വാളിറ്റി)
            const videoUrl = res.data.mp4_hd || res.data.mp4;

            if (!videoUrl) throw new Error("Could not find video URL in response.");
            
            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: `*🎌 KIRA X MD TIKTOK DOWNLOADER 🎌*\n\n*Title:* ${res.data.title || 'N/A'}` 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *TikTok video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("TikTok Error:", err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed!* \nError: ${err.message}`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};