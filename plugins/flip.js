const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const ffmpegPath = path.join(__dirname, '../../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

module.exports = {
    name: "flip",
    category: "media",
    description: "Flip video horizontally",
    usage: `${process.env.PREFIX || '.'}flip (reply to video)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.videoMessage) return sock.sendMessage(jid, { text: "❌ Reply to video" }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "🪞 Flipping..." });
        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            inputPath = path.join(tempDir, `flip_in_${Date.now()}.mp4`);
            outputPath = path.join(tempDir, `flip_out_${Date.now()}.mp4`);
            fs.writeFileSync(inputPath, buffer);
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath).videoFilter("hflip").output(outputPath).on("end", resolve).on("error", reject).run();
            });
            const videoBuffer = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { video: videoBuffer, mimetype: "video/mp4", caption: "🪞 Flipped video" });
            await sock.sendMessage(jid, { text: "✅ Done", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: "❌ Failed", edit: statusMsg.key });
        } finally { try { if (inputPath) fs.unlinkSync(inputPath); if (outputPath) fs.unlinkSync(outputPath); } catch (e) {} }
    }
};