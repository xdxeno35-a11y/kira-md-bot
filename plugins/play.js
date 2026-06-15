const ytSearch = require('yt-search');
const axios = require('axios');

module.exports = {
    name: 'play',
    alias: ['song', 'music', 'audio'],
    category: 'downloader',
    description: 'Search and play YouTube audio or use direct link',
    usage: '.play <song name or link>',

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(
                jid,
                { text: '❌ *What song do you want to play?*' },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, {
            react: { text: "🔍", key: msg.key }
        });

        try {
            console.log("========== PLAY COMMAND ==========");
            console.log("Query:", query);

            let url = '';

            const ytRegex =
                /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

            const match = query.match(ytRegex);

            if (match) {
                url = `https://youtu.be/${match[1]}`;
                console.log("YouTube URL detected:", url);
            } else {
                console.log("Searching YouTube...");

                const searchResults = await ytSearch(query);

                console.log(
                    "Videos found:",
                    searchResults?.videos?.length || 0
                );

                const video = searchResults?.videos?.find(v => v.url);

                if (!video || !video.url) {
                    throw new Error("No valid video found.");
                }

                url = video.url;

                console.log("Selected video:", video.title);
                console.log("Video URL:", url);
            }

            await sock.sendMessage(jid, {
                react: { text: "📥", key: msg.key }
            });

            let audioUrl = '';

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            const axiosConfig = {
                timeout: 15000,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36'
                }
            };

            for (let i = 0; i < apis.length; i++) {
                try {
                    console.log(`Trying API ${i + 1}:`, apis[i]);

                    const res = await axios.get(apis[i], axiosConfig);

                    console.log(
                        `API ${i + 1} Response:`,
                        JSON.stringify(res.data)
                    );

                    const tempUrl =
                        res.data?.data?.dl ||
                        res.data?.url ||
                        res.data?.result?.download_url ||
                        res.data?.result?.audio ||
                        res.data?.result;

                    console.log("Extracted URL:", tempUrl);

                    if (
                        tempUrl &&
                        typeof tempUrl === "string" &&
                        tempUrl.startsWith("http")
                    ) {
                        audioUrl = tempUrl;
                        console.log("Valid audio URL found.");
                        break;
                    }

                } catch (e) {
                    console.error(`API ${i + 1} FAILED`);
                    console.error("URL:", apis[i]);
                    console.error("MESSAGE:", e.message);
                    console.error("STATUS:", e.response?.status);
                    console.error("DATA:", e.response?.data);
                }
            }

            if (!audioUrl) {
                throw new Error("All servers busy or no valid audio URL returned.");
            }

            console.log("Final Audio URL:", audioUrl);
            console.log("Sending audio...");

            await sock.sendMessage(
                jid,
                {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false
                },
                { quoted: msg }
            );

            console.log("Audio sent successfully.");

            await sock.sendMessage(jid, {
                react: { text: "🎧", key: msg.key }
            });

        } catch (err) {
            console.error("========== PLAY ERROR ==========");
            console.error("MESSAGE:", err.message);
            console.error("STACK:", err.stack);
            console.error("FULL ERROR:", err);

            try {
                await sock.sendMessage(
                    jid,
                    {
                        text: `❌ Error: ${err.message}`
                    },
                    { quoted: msg }
                );
            } catch {}

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });
        }
    }
};