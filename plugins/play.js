const { searchYoutube, downloadAudio } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        if (!query) return;

        let statusMsg = await sock.sendMessage(jid, { text: `🔍 *Searching* : ${query}...` });

        try {
            const results = await searchYoutube(query, 1);
            if (!results.length) throw new Error('No results');
            const video = results[0];

            await sock.sendMessage(jid, { text: `📥 *Downloading* : ${video.title}...`, edit: statusMsg.key });
            
            const audio = await downloadAudio(video.url);
            const { data: buffer } = await axios.get(audio.path, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', caption: 'KIRA X MD' });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ *Failed*`, edit: statusMsg.key });
        }
    }
};