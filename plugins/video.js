const { downloadVideo } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'video',
    alias: ['yt', 'ytvideo'],
    category: 'downloader',
    description: 'Download YouTube video at 720p',
    usage: `${process.env.PREFIX || '.'}video <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        
        if (!url || !url.includes('youtube.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid YouTube URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading video (720p)...*` });

        try {
            // 720p ക്വാളിറ്റിയിൽ ഡൗൺലോഡ് ചെയ്യുന്നു
            const video = await downloadVideo(url, '720p');
            const { data: buffer } = await axios.get(video.path, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD VIDEO DOWNLOADER 🎌*' 
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