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

        try {

            await sock.sendMessage(jid, {
                react: { text: "🔍", key: msg.key }
            });

            console.log("\n========== PLAY CMD ==========");
            console.log("Query:", query);

            let url;

            const ytRegex =
                /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/.*(?:v=|\/)([a-zA-Z0-9_-]{11})/;

            const match = query.match(ytRegex);

            if (match) {
                url = `https://youtu.be/${match[1]}`;
            } else {

                const search = await ytSearch(query);

                if (!search?.videos?.length) {
                    throw new Error("No results found");
                }

                url = search.videos[0].url;

                console.log("Selected:", search.videos[0].title);
            }

            console.log("YouTube URL:", url);

            await sock.sendMessage(jid, {
                react: { text: "📥", key: msg.key }
            });

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            for (const api of apis) {

                try {

                    console.log("Trying API:", api);

                    const res = await axios.get(api, {
                        timeout: 15000,
                        validateStatus: () => true
                    });

                    const data = res.data;

                    let candidate =
                        data?.data?.dl ||
                        data?.data?.download ||
                        data?.download ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        data?.result?.url ||
                        (typeof data?.result === "string" ? data.result : null);

                    console.log("Candidate URL:", candidate);

                    if (
                        !candidate ||
                        typeof candidate !== "string" ||
                        !candidate.startsWith("http")
                    ) {
                        continue;
                    }

                    try {

                        const test = await axios.get(candidate, {
                            responseType: "stream",
                            timeout: 10000,
                            maxRedirects: 10,
                            validateStatus: () => true,
                            headers: {
                                "User-Agent": "Mozilla/5.0"
                            }
                        });

                        console.log("URL Status:", test.status);

                        if (test.status === 200) {
                            audioUrl = candidate;
                            console.log("Working URL Found:", audioUrl);
                            break;
                        }

                    } catch (err) {
                        console.log("URL Test Failed:", err.message);
                    }

                } catch (err) {
                    console.log("API Failed:", err.message);
                }
            }

            if (!audioUrl) {
                throw new Error("No valid audio URL found from any API");
            }

            console.log("Downloading audio...");

            const audioBuffer = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
                maxRedirects: 10,
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
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

            await sock.sendMessage(jid, {
                react: { text: "🎧", key: msg.key }
            });

        } catch (err) {

            console.error("\n========== PLAY ERROR ==========");
            console.error(err);

            await sock.sendMessage(
                jid,
                {
                    text: `❌ Play failed\n\n${err.message}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });
        }
    }
};