const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const FormData = require("form-data");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    name: "find",
    alias: ["identify", "whatsong"],
    category: "media",
    description: "Identify song from replied audio/video",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
            return await sock.sendMessage(jid, { 
                text: `╭──『 🎵 *FIND SONG* 』──⊷\n│ ❌ *Media missing!*\n│ ➢ Reply to an Audio or Video.\n╰──────────────⊷` 
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: "🎧", key: msg.key } });

            // logger ഒഴിവാക്കി സൈലന്റ് ആയി ഡൗൺലോഡ് ചെയ്യുന്നു
            const mediaBuffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, {});
            if (!mediaBuffer) throw new Error("Failed to download media buffer from WhatsApp.");

            const form = new FormData();
            form.append("reqtype", "fileupload");
            form.append("fileToUpload", mediaBuffer, { filename: "song.mp3" });

            const uploadRes = await fetch("https://catbox.moe/user/api.php", {
                method: 'POST',
                body: form
            });

            const mediaUrl = await uploadRes.text();

            if (!mediaUrl.startsWith("http")) throw new Error(`Audio upload failed. Catbox returned: ${mediaUrl}`);

            const apiUrl = `https://jerrycoder.oggyapi.workers.dev/tool/identify?url=${encodeURIComponent(mediaUrl)}`;
            const identifyRes = await (await fetch(apiUrl)).json();

            if (identifyRes.status !== "success") throw new Error("API could not identify the song.");

            const resData = identifyRes.result;
            const title = resData.title;
            const artist = resData.artist;
            const album = resData.Album; 
            const releaseDate = resData["Released on"]; 
            const genre = resData.Genres; 
            const label = resData.Label; 
            const image = resData.image;
            const shazamUrl = resData.shazam_url;
            
            let caption = `╭──『 🎵 *SONG IDENTIFIED* 』──⊷\n│\n`;
            caption += `│ 📀 *Title :* ${title || "Unknown"}\n`;
            caption += `│ 🎤 *Artist :* ${artist || "Unknown"}\n`;
            
            if (album && album !== "Unknown Album") caption += `│ 💿 *Album :* ${album}\n`;
            if (releaseDate && releaseDate !== "Unknown") caption += `│ 📅 *Released :* ${releaseDate}\n`;
            if (genre && genre !== "NotFound" && genre !== "Unknown") caption += `│ 🎼 *Genre :* ${genre}\n`;
            if (label && label !== "Unknown") caption += `│ 🏢 *Label :* ${label}\n`;
            
            caption += `│\n╰──────────────⊷\n\n`;
            if (shazamUrl) caption += `🔗 *Listen on Shazam:*\n${shazamUrl}`;

            await sock.sendMessage(jid, { 
                image: { url: image || "https://telegra.ph/file/0c32688031d27944062a7.jpg" }, 
                caption 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Find Command Error:", err.message); // എറർ മാത്രം ടെർമിനലിൽ കാണിക്കും
            await sock.sendMessage(jid, { 
                text: `╭──『 ❌ *ERROR* 』──⊷\n│ ${err.message}\n╰──────────────⊷` 
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};