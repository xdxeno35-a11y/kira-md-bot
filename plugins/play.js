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
        const query = (Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(
                jid,
                { text: "❌ *Give a song name or YouTube link*" },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, {
            react: { text: "🔍", key: msg.key }
        });

        try {
            console.log("\n========== PLAY CMD ==========");
            console.log("Query:", query);

            let url;

            // YouTube link detection
            const ytRegex =
                /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/.*(?:v=|\/)([a-zA-Z0-9_-]{11})/;

            const match = query.match(ytRegex);

            if (match) {
                url = `https://youtu.be/${match[1]}`;
                console.log("Direct URL:", url);
            } else {
                console.log("Searching YouTube...");

                const search = await ytSearch(query);

                if (!search?.videos?.length) {
                    throw new Error("No results found");
                }

                const video = search.videos[0];

                url = video.url;

                console.log("Selected:", video.title);
                console.log("URL:", url);
            }

            await sock.sendMessage(jid, {
                react: { text: "📥", key: msg.key }
            });

            console.log("Fetching audio from APIs...");

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            for (let api of apis) {
                try {
                    console.log("Trying:", api);

                    const res = await axios.get(api, {
                        timeout: 15000
                    });

                    const data = res.data;

                    audioUrl =
                        data?.data?.dl ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        data?.result;

                    if (audioUrl && typeof audioUrl === "string") {
                        console.log("Audio URL found:", audioUrl);
                        break;
                    }

                } catch (e) {
                    console.log("API failed:", e.message);
                }
            }

            if (!audioUrl) {
                throw new Error("No audio URL found from APIs");
            }

            console.log("Downloading audio buffer...");

            // ⭐ IMPORTANT FIX: download file first (NO STREAM LINK)
            const audioBuffer = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 20000
            });

            console.log("Sending audio...");

            await sock.sendMessage(
                jid,
                {
                    audio: Buffer.from(audioBuffer.data),
                    mimetype: "audio/mpeg",
                    ptt: false
                },
                { quoted: msg }
            );

            console.log("Audio sent successfully");

            await sock.sendMessage(jid, {
                react: { text: "🎧", key: msg.key }
            });

        } catch (err) {
            console.error("\n========== PLAY ERROR ==========");
            console.error("MESSAGE:", err.message);
            console.error("STACK:", err.stack);

            await sock.sendMessage(
                jid,
                { text: `❌ Error: ${err.message}` },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });
        }
    }
};