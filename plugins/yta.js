const { downloadAudio } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'yta',
    alias: ['ytaudio'],
    category: 'downloader',
    description: 'Download YouTube audio as document',
    usage: `${process.env.PREFIX || '.'}yta <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || !url.includes('youtube.com')) {
            return await sock.sendMessage(jid, { text: `❌ *Please provide a valid YouTube URL!*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading audio as document...*` });

        try {
            // 1. API ഉപയോഗിച്ച് ഓഡിയോ ഡൗൺലോഡ് ലിങ്ക് എടുക്കുന്നു
            const audio = await downloadAudio(url);
            
            // 2. നേരിട്ട് ബഫർ എടുക്കുന്നു
            const { data: buffer } = await axios.get(audio.path, { responseType: 'arraybuffer' });

            // 3. Document ആയി അയക്കുന്നു
            await sock.sendMessage(jid, { 
                document: buffer, 
                mimetype: 'audio/mpeg', 
                fileName: `${audio.title || 'audio'}.mp3`, 
                caption: '*🎌 KIRA X MD YTA DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Audio sent as document*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};