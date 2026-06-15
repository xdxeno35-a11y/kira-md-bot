const Genius = require('genius-lyrics');
const axios = require('axios'); 

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
            return await sock.sendMessage(jid, { 
                text: `╭──『 🎤 *KIRA LYRICS* 』──⊷\n│ ❌ *Song name missing*\n╰──────────────⊷` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "🎤", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Searching for:* ${query}...` });

        try {
            let songTitle = query;
            let songArtist = "Unknown";
            let songLyrics = "";
            let success = false;

            const restApis = [
                `https://jerrycoder.oggyapi.workers.dev/search/lyrics-v1?q=${encodeURIComponent(query)}`,
                `https://jerrycoder.oggyapi.workers.dev/search/lyrics-v2?q=${encodeURIComponent(query)}`,
                `https://eliteprotech-apis.zone.id/lyrics?query=${encodeURIComponent(query)}`,
                `https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`,
                `https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`
            ];

            for (let i = 0; i < restApis.length; i++) {
                try {
                    const res = await axios.get(restApis[i], { timeout: 6000 });
                    const data = res.data;

                    let extractedLyrics = '';
                    let extractedTitle = '';
                    let extractedArtist = '';

                    if (data.result && data.result.lyrics) {
                        extractedLyrics = data.result.lyrics;
                        extractedTitle = data.result.title;
                        extractedArtist = data.result.artist;
                    } else if (data.lyrics) {
                        extractedLyrics = data.lyrics;
                        extractedTitle = data.title;
                        extractedArtist = data.author || data.artist;
                    } else if (data.data && data.data.lyrics) {
                        extractedLyrics = data.data.lyrics;
                        extractedTitle = data.data.title;
                        extractedArtist = data.data.artist;
                    }

                    if (extractedLyrics && extractedLyrics.trim().length > 10) {
                        songLyrics = extractedLyrics;
                        if (extractedTitle) songTitle = extractedTitle;
                        if (extractedArtist) songArtist = extractedArtist;
                        success = true;
                        break; 
                    }
                } catch (e) {}
            }

            if (!success) {
                const apiKeys = [
                    'hvolhA2B11TmnPaSx83LANzxwgMmfqNbZLm7sQGGOKCcvBEaATJT_GjnWoBfgwr1',
                    'm0QJK3lXTw18WcdQh2J5vESa-hE1oXeMCUSVlIff8XV-bIRldZhZsTMxsHFeKzVM64Mrl63C6snrAOKwrxOkQQ',
                    'KEYLESS_FALLBACK'
                ];

                for (let i = 0; i < apiKeys.length; i++) {
                    try {
                        const Client = apiKeys[i] === 'KEYLESS_FALLBACK' ? new Genius.Client() : new Genius.Client(apiKeys[i]);
                        const searches = await Client.songs.search(query);
                        
                        if (searches && searches.length > 0) {
                            const song = searches[0];
                            const lyrics = await song.lyrics();
                            
                            if (lyrics && lyrics.trim().length > 10) {
                                songTitle = song.title;
                                songArtist = song.artist.name;
                                songLyrics = lyrics;
                                success = true;
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }

            if (!success || !songLyrics) {
                throw new Error('Lyrics not found on any active servers.');
            }

            let cleanLyrics = songLyrics.replace(/.*Contributors.*/g, '')
                                        .replace(/.*Lyrics.*/g, '')
                                        .replace(/.*Embed.*/g, '')
                                        .trim();

            let lyricsText = cleanLyrics.length > 3500 ? cleanLyrics.substring(0, 3500) + '\n\n... (truncated)' : cleanLyrics;

            const responseText = `╭──『 🎶 *KIRA LYRICS* 』──⊷\n` +
                                 `│\n` +
                                 `│ 🎵 *Title :* ${songTitle}\n` +
                                 `│ 👤 *Artist :* ${songArtist}\n` +
                                 `│\n` +
                                 `╰──────────────⊷\n\n` +
                                 `╔══════════════════════╗\n` +
                                 `   ${lyricsText.trim().split('\n').join('\n   ')}\n` +
                                 `╚══════════════════════╝`;

            await sock.sendMessage(jid, { text: responseText, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
            
        } catch (err) {
            console.error("Lyrics Error:", err.message); // എറർ മാത്രം കാണിക്കും
            await sock.sendMessage(jid, { text: `❌ *Lyrics not found for:* "${query}"`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};