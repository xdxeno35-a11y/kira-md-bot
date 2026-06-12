const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const ffmpegPath = path.join(__dirname, '../../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

module.exports = {
    name: "trim",
    alias: ["cut"],
    category: "media",
    description: "Trim video/audio (start,end in seconds)",
    usage: `${process.env.PREFIX || '.'}trim <start>,<end> (reply to media)`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.videoMessage && !quoted.audioMessage))
            return sock.sendMessage(jid, { text: "❌ Reply to video/audio" }, { quoted: msg });
        const input = args.join('');
        if (!input || !input.includes(','))
            return sock.sendMessage(jid, { text: "❌ Usage: .trim start,end\nExample: .trim 10,30" });
        const [start, end] = input.split(',').map(Number);
        if (isNaN(start) || isNaN(end) || start >= end)
            return sock.sendMessage(jid, { text: "❌ Invalid numbers" });

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: "✂️ Trimming..." });
        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { logger: console });
            const isVideo = !!quoted.videoMessage;
            const ext = isVideo ? "mp4" : "mp3";
            inputPath = path.join(tempDir, `trim_in_${Date.now()}.${ext}`);
            outputPath = path.join(tempDir, `trim_out_${Date.now()}.${ext}`);
            fs.writeFileSync(inputPath, buffer);
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath).setStartTime(start).setDuration(end - start).output(outputPath).on("end", resolve).on("error", reject).run();
            });
            const resultBuffer = fs.readFileSync(outputPath);
            if (isVideo) await sock.sendMessage(jid, { video: resultBuffer, mimetype: "video/mp4", caption: `✂️ Trimmed ${start}s-${end}s` });
            else await sock.sendMessage(jid, { audio: resultBuffer, mimetype: "audio/mpeg", ptt: false });
            await sock.sendMessage(jid, { text: "✅ Trim complete", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: "❌ Failed", edit: statusMsg.key });
        } finally {
            try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        }
    }
};