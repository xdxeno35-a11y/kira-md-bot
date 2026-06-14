const { downloadVideo } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'ytv',
    alias: ['ytvideo'],
    category: 'downloader',
    description: 'Download YouTube video (best quality)',
    usage: `${process.env.PREFIX || '.'}ytv <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('youtube.com')) {
            return await sock.sendMessage(jid, { text: `❌ *Please provide a valid YouTube URL!*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading video...*` });

        try {
            // 1. API വഴി വീഡിയോ ലിങ്ക് എടുക്കുന്നു
            const video = await downloadVideo(url);
            
            // 2. നേരിട്ട് ബഫർ എടുക്കുന്നു
            const { data: buffer } = await axios.get(video.path, { responseType: 'arraybuffer' });

            // 3. വീഡിയോ ആയി തന്നെ അയക്കുന്നു (Document വേണ്ട)
            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD YTV DOWNLOADER 🎌*' 
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