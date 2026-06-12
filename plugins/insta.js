const { commands } = require("../lib/plugins");
const { exec } = require("child_process");

commands.push({
    name: "insta",
    alias: ["ig", "instagram"],
    execute: async (sock, msg, args) => {
        // Fix: Check if args[0] exists and is a valid URL
        if (!args || args.length === 0) {
            return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a valid Instagram link!" });
        }
        
        const url = args[0];
        await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Processing your request..." });

        // Wrapping the URL in quotes to handle special characters
        exec(`yt-dlp -g "${url}"`, async (err, stdout) => {
            if (err) {
                console.error("Download Error:", err);
                return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to fetch video. Please ensure the link is a valid Instagram URL." });
            }

            const videoUrl = stdout.trim().split('\n')[0];
            await sock.sendMessage(msg.key.remoteJid, { 
                video: { url: videoUrl }, 
                caption: "✅ KIRA X MD Instagram Downloader" 
            });
        });
    }
});