// plugins/take.js - KIRA X MD (Change watermark/Take sticker)
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const webp = require("node-webpmux");

// ==========================================
// 💧 HELPER: Inject EXIF Metadata (Watermark)
// ==========================================
async function addMetadata(webpFilePath, packName, authorName) {
    const img = new webp.Image();
    await img.load(webpFilePath);

    const exifJSON = {
        "sticker-pack-id": "kira-x-md-take",
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
    name: "take",
    alias: ["wm", "steal"],
    category: "sticker",
    desc: "Change the watermark of a quoted sticker to your typed name",

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;

        // Verify they are replying to something
        if (!quoted || !quotedInfo) {
            return sock.sendMessage(jid, { text: "❌ Reply to the sticker you want to take!" }, { quoted: msg });
        }

        let mediaMsg = quoted;
        if (quoted.viewOnceMessageV2) mediaMsg = quoted.viewOnceMessageV2.message;
        else if (quoted.viewOnceMessage) mediaMsg = quoted.viewOnceMessage.message;

        // Verify it is actually a sticker
        if (!mediaMsg.stickerMessage) {
            return sock.sendMessage(jid, { text: "❌ That's not a sticker. Reply to a sticker only." }, { quoted: msg });
        }

        // Default fallbacks
        let packName = "KIRA X MD";
        let authorName = "Kira";
        
        // 🧠 Smart Argument Parser
        if (args && args.length > 0) {
            const fullText = args.join(" ");
            
            if (fullText.includes("|")) {
                // If they use the separator: .take My Pack | My Author
                const textArgs = fullText.split("|");
                packName = textArgs[0].trim();
                authorName = textArgs[1].trim();
            } else {
                // If they just type a name: .take John Doe
                // It will make the pack name whatever they typed!
                packName = fullText.trim();
                authorName = "Kira"; 
            }
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `⚡ Stealing sticker as "${packName}"...` });

        let inputPath;
        try {
            // Download the existing sticker
            const buffer = await downloadMediaMessage(
                { message: mediaMsg },
                "buffer",
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            const tempDir = path.join(__dirname, "../temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            inputPath = path.join(tempDir, `take_${Date.now()}.webp`);
            fs.writeFileSync(inputPath, buffer);

            // Overwrite metadata with the typed watermark
            await addMetadata(inputPath, packName, authorName);

            // Read and send it back
            const sticker = fs.readFileSync(inputPath);
            await sock.sendMessage(jid, { sticker });
            await sock.sendMessage(jid, { text: "✅ Sticker updated!", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            // Cleanup temp file
            fs.unlinkSync(inputPath);
        } catch (err) {
            console.error("Take command error:", err);
            await sock.sendMessage(jid, { text: "❌ Failed to change sticker metadata", edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        }
    }
};