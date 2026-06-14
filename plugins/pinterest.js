const axios = require('axios');

module.exports = {
    name: 'pinterest',
    alias: ['pin', 'pindl'],
    category: 'downloader',
    description: 'Download Pinterest media',
    usage: `${process.env.PREFIX || '.'}pinterest <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return await sock.sendMessage(jid, { text: `📌 *PINTEREST*\n\nMissing URL` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📌", key: msg.key } });

        try {
            // API എൻഡ്‌പോയിന്റ് (Pinterest-ന് API-ൽ 'pin' എന്ന് കൊടുത്താൽ മതിയാകും)
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/pinterest?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            const mediaUrl = res.data.result.url; 
            const isVideo = res.data.result.type === 'video';

            if (isVideo) {
                await sock.sendMessage(jid, { video: { url: mediaUrl }, mimetype: 'video/mp4' });
            } else {
                await sock.sendMessage(jid, { image: { url: mediaUrl } });
            }

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Pinterest error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};