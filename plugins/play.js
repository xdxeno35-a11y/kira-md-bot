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

            const apis = [
                `https://jerrycoder.oggyapi.workers.dev/down/ytmp3-v1?url=${encodeURIComponent(url)}`,
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
                `https://eliteprotech-apis.zone.id/ytdown?format=mp3&url=${encodeURIComponent(url)}`
            ];

            let audioUrl = null;

            for (const api of apis) {

                try {

                    console.log("\nTrying API:", api);

                    const res = await axios.get(api, {
                        timeout: 15000,
                        validateStatus: () => true
                    });

                    console.log("API Status:", res.status);
                    console.log(
                        "RAW RESPONSE:",
                        JSON.stringify(res.data, null, 2)
                    );

                    const data = res.data;

                    audioUrl =
                        data?.data?.dl ||
                        data?.data?.download ||
                        data?.download ||
                        data?.url ||
                        data?.result?.download_url ||
                        data?.result?.audio ||
                        data?.result?.url ||
                        data?.result;

                   if (
    audioUrl &&
    typeof audioUrl === "string" &&
    audioUrl.startsWith("http")
) {
    console.log("Audio URL:", audioUrl);
    console.log("FINAL AUDIO URL:", audioUrl);
    break;
}

                } catch (e) {
                    console.log("API Failed:", e.message);
                }
            }

            if (!audioUrl) {
                throw new Error("No valid audio URL found");
            }

            console.log("Checking audio URL...");
console.log("FINAL AUDIO URL:", audioUrl);

const check = await axios.get(audioUrl, {
    responseType: "stream",
    timeout: 15000,
    maxRedirects: 10,
    validateStatus: () => true,
    headers: {
        "User-Agent": "Mozilla/5.0"
    }
});

console.log("Audio URL Status:", check.status);
console.log(
    "Final Response URL:",
    check.request?.res?.responseUrl || audioUrl
);
            if (check.status !== 200) {
                throw new Error(
                    `Audio link returned ${check.status}`
                );
            }

            console.log("Downloading audio...");

            const audioBuffer = await axios.get(audioUrl, {
                responseType: "arraybuffer",
                timeout: 30000
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

            console.log("Audio sent successfully");

        } catch (err) {

            console.error("\n========== PLAY ERROR ==========");
            console.error("MESSAGE:", err.message);
            console.error("STACK:", err.stack);

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