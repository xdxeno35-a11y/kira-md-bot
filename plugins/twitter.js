const axios = require('axios');

module.exports = {
    name: 'twitter',
    alias: ['tw', 'twitterdl'],
    category: 'downloader',
    description: 'Download X/Twitter videos',
    usage: `${process.env.PREFIX || '.'}twitter <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('twitter.com') && !url.includes('x.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Twitter/X URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading X video...*` });

        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/twitter?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            // API-യിൽ നിന്ന് വീഡിയോ ലിങ്ക് എടുക്കുന്നു
            const videoUrl = res.data.result.hd || res.data.result.sd;
            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD TWITTER DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *X video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};