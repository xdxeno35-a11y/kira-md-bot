const axios = require('axios');

module.exports = {
    name: 'threads',
    alias: ['thread'],
    category: 'downloader',
    description: 'Download Threads videos',
    usage: `${process.env.PREFIX || '.'}threads <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('threads.net')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Threads URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading Threads video...*` });

        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/threads?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            const videoUrl = res.data.result.video_url;
            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD THREADS DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Threads video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};