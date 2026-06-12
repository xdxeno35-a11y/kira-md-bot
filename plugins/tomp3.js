// plugins/tomp3.js - KIRA X MD (Video to MP3 – uses working sticker.js download)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// Ensure ffmpeg path is set (if ffmpeg.exe is in root)
const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

module.exports = {
    name: "tomp3",
    alias: ["mp3", "video2mp3"],
    category: "media",
    description: "Convert replied video to MP3 audio",
    usage: `${process.env.PREFIX || '.'}tomp3 (reply to a video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || !quoted.videoMessage) {
            await sock.sendMessage(jid, { text: `🎵 *VIDEO TO MP3*\n\n❌ *Reply to a video*` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "📥 *Downloading video...*" });

        let inputPath, outputPath;
        try {
            // 🔥 EXACT same download method as your working sticker.js
            const videoBuffer = await downloadMediaMessage(
                { message: quoted },
                "buffer",
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            if (!videoBuffer || videoBuffer.length < 1000) throw new Error("Download failed – buffer too small");

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            inputPath = path.join(tempDir, `video_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
            fs.writeFileSync(inputPath, videoBuffer);

            await sock.sendMessage(jid, { text: "🎧 *Converting to MP3...*", edit: statusMsg.key });

            // Convert using ffmpeg
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat("mp3")
                    .audioBitrate(128)
                    .on("end", resolve)
                    .on("error", reject)
                    .save(outputPath);
            });

            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
                throw new Error("Conversion failed – output too small");
            }

            const audioBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                ptt: false,
                fileName: `audio_${Date.now()}.mp3`,
                caption: `🎵 *Converted MP3*\n━━━━━━━━━━━━━━━━━━━\n🔹 *KIRA X MD* 🔹`
            });

            await sock.sendMessage(jid, { text: "✅ *MP3 sent!*", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("MP3 conversion error:", err);
            await sock.sendMessage(jid, { text: `❌ *Failed*: ${err.message}`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        } finally {
            try {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (e) {}
        }
    }
};