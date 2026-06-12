// plugins/sticker.js - KIRA X MD (Animated stickers for GIF/video with Watermark - Reactions Only)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const webp = require("node-webpmux");

const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
if (fs.existsSync(ffmpegPath)) ffmpeg.setFfmpegPath(ffmpegPath);

// ==========================================
// 💧 HELPER: Inject EXIF Metadata (Watermark)
// ==========================================
async function addMetadata(webpFilePath, packName, authorName) {
    const img = new webp.Image();
    await img.load(webpFilePath);

    const exifJSON = {
        "sticker-pack-id": "kira-x-md-sticker",
        "sticker-pack-name": packName,
        "sticker-author-name": authorName,
        "emojis": ["🔥", "✨"]
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(exifJSON), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    img.exif = exif;
    await img.save(webpFilePath);
}

module.exports = {
    name: "sticker",
    alias: ["s", "stik"],
    category: "sticker",
    desc: "Convert image/video/GIF to sticker using reaction indicators",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;

        if (!quoted || !quotedInfo) {
            return sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }

        let mediaMsg = quoted;
        if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
        else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

        const isImage = !!mediaMsg.imageMessage;
        const isVideo = !!mediaMsg.videoMessage;
        if (!isImage && !isVideo) {
            return sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }

        // 🧠 Smart Watermark Argument Parser
        let packName = "KIRA X MD";
        let authorName = "Kira";
        
        if (args && args.length > 0) {
            const fullText = args.join(" ");
            if (fullText.includes("|")) {
                const textArgs = fullText.split("|");
                packName = textArgs[0].trim();
                authorName = textArgs[1].trim();
            } else {
                packName = fullText.trim();
                authorName = "Kira";
            }
        }

        // ⏳ Start reaction indicator
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        let inputPath, outputPath;
        try {
            const buffer = await downloadMediaMessage(
                { message: mediaMsg },
                "buffer",
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            if (isImage) {
                // Image: static sticker
                inputPath = path.join(tempDir, `in_${Date.now()}.jpg`);
                outputPath = path.join(tempDir, `out_${Date.now()}.webp`);
                fs.writeFileSync(inputPath, buffer);
                await sharp(inputPath)
                    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp({ quality: 90 })
                    .toFile(outputPath);
            } else {
                // Video/GIF: animated sticker
                inputPath = path.join(tempDir, `in_${Date.now()}.mp4`);
                outputPath = path.join(tempDir, `out_${Date.now()}.webp`);
                fs.writeFileSync(inputPath, buffer);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions([
                            "-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:black",
                            "-c:v libwebp",
                            "-quality 90",
                            "-loop 0",
                            "-preset default",
                            "-lossless 0",
                            "-vsync 0",
                            "-an"
                        ])
                        .output(outputPath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });
            }

            // 💧 Inject watermark metadata
            await addMetadata(outputPath, packName, authorName);

            // Read, send, and react success
            const sticker = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, { sticker });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (err) {
            console.error("Sticker error:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};