const { downloadVideo } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'yt',
    alias: ['youtube', 'ytdl'],
    category: 'downloader',
    description: 'Download YouTube videos',
    usage: `${process.env.PREFIX || '.'}yt <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('youtube.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid YouTube URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading video...*` });

        try {
            // API ഉപയോഗിച്ച് വീഡിയോ ഡൗൺലോഡ് ലിങ്ക് എടുക്കുന്നു
            const video = await downloadVideo(url);
            
            // നേരിട്ട് ബഫർ എടുക്കുന്നു
            const { data: buffer } = await axios.get(video.path, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD YT DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};