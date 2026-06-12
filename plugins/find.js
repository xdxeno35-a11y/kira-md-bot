const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "find",
    alias: ["identify", "whatsong"],
    category: "media",
    description: "Identify song from replied audio/video",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
            return await sock.sendMessage(
                jid,
                {
                    text: "🎵 *Find Song*\n\nReply to an audio or video message."
                },
                { quoted: msg }
            );
        }

        let tempFile = null;

        try {
            await sock.sendMessage(jid, {
                react: {
                    text: "🎵",
                    key: msg.key
                }
            });

            const status = await sock.sendMessage(jid, {
                text: "🔍 *Identifying song...*"
            });

            const mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                "buffer",
                {},
                { logger: console }
            );

            if (!mediaBuffer) {
                throw new Error("Failed to download media");
            }

            const tempDir = path.join(__dirname, "../temp");

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            tempFile = path.join(
                tempDir,
                `song_${Date.now()}.mp3`
            );

            fs.writeFileSync(tempFile, mediaBuffer);

            const form = new FormData();
            form.append("file", fs.createReadStream(tempFile));

            const uploadRes = await axios.post(
                "https://ar-hosting.pages.dev/upload",
                form,
                {
                    headers: form.getHeaders(),
                    maxBodyLength: Infinity
                }
            );

            const mediaUrl =
                uploadRes.data?.url ||
                uploadRes.data?.data;

            if (!mediaUrl) {
                throw new Error("Upload failed");
            }

            const identifyRes = await axios.get(
                `https://jerrycoder.oggyapi.workers.dev/tool/identify?url=${encodeURIComponent(mediaUrl)}`
            );

            const data = identifyRes.data;

            if (data.status !== "success") {
                throw new Error(data.msg || "No song found");
            }

            const {
                title,
                artist,
                image,
                shazam_url
            } = data.result;

            const caption =
`🎵 *SONG FOUND*

📀 *Title:* ${title}
🎤 *Artist:* ${artist}

🔗 ${shazam_url}

━━━━━━━━━━━━━━━
🔹 KIRA X MD 🔹`;

            await sock.sendMessage(
                jid,
                {
                    image: {
                        url: image ||
                        "https://ar-hosting.pages.dev/1751890521453.jpg"
                    },
                    caption
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

        } catch (err) {
            console.error("Find Error:", err);

            await sock.sendMessage(
                jid,
                {
                    text: `❌ Failed: ${err.message}`
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });
        } finally {
            try {
                if (tempFile && fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch {}
        }
    }
};