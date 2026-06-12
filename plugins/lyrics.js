// plugins/lyrics.js - KIRA X MD
const Genius = require('genius-lyrics');
const Client = new Genius.Client(process.env.GENIUS_API_KEY); 

module.exports = {
    name: 'lyrics',
    alias: ['lyric', 'songlyrics'],
    category: 'search',
    description: 'Get lyrics for a song',
    usage: `${process.env.PREFIX || '.'}lyrics <song name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, { text: `🎤 *LYRICS*\n\n❌ *Missing song name*\n➤ Example: ${process.env.PREFIX || '.'}lyrics Shape of You` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🎤", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Searching* : ${query}...` });

        try {
            const searches = await Client.songs.search(query);
            if (!searches || searches.length === 0) throw new Error('No results found');

            const firstSong = searches[0];
            const title = firstSong.title;
            const artist = firstSong.artist.name;
            const lyrics = await firstSong.lyrics();

            if (!lyrics || lyrics.length < 50) throw new Error('Lyrics too short');

            let lyricsText = lyrics;
            if (lyricsText.length > 3900) {
                lyricsText = lyricsText.substring(0, 3900) + '\n\n... (truncated)';
            }

            const responseText = `🎤 *LYRICS* 🎤\n\n📖 *Title* : ${title}\n🎤 *Artist* : ${artist}\n\n${lyricsText}\n\n━━━━━━━━━━━━━━━━━━━\n🔹 *KIRA X MD* 🔹`;

            await sock.sendMessage(jid, { text: responseText, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Lyrics error:", err);
            await sock.sendMessage(jid, { text: `❌ *Not found* : "${query}"`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};