const { searchYoutube, downloadAudio } = require('../lib/yt');
const axios = require('axios');

module.exports = {
    name: 'spotify',
    alias: ['sp'],
    category: 'downloader',
    description: 'Download audio from Spotify link',
    usage: `${process.env.PREFIX || '.'}spotify <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        
        if (!url || !url.includes('spotify.com')) {
            return await sock.sendMessage(jid, { text: `❌ *Invalid or missing Spotify URL*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🎵", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Fetching Spotify info...*` });

        try {
            // 1. Spotify-യിൽ നിന്ന് ട്രാക്ക് ടൈറ്റിൽ എടുക്കുന്നു
            const oembedRes = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
            const fullTitle = oembedRes.data.title; 
            
            await sock.sendMessage(jid, { text: `🔍 *Searching YouTube for: ${fullTitle}*`, edit: statusMsg.key });

            // 2. YouTube-ൽ സെർച്ച് ചെയ്യുന്നു
            const results = await searchYoutube(fullTitle, 1);
            if (!results.length) throw new Error('No match on YouTube');
            
            // 3. API ഉപയോഗിച്ച് ഓഡിയോ ഡൗൺലോഡ് ചെയ്യുന്നു
            const audio = await downloadAudio(results[0].url);
            
            // 4. നേരിട്ട് ബഫർ എടുക്കുന്നു (fs.readFileSync ഒഴിവാക്കി)
            const { data: buffer } = await axios.get(audio.path, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { text: `✅ *Sending audio...*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, caption: 'KIRA X MD' });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};