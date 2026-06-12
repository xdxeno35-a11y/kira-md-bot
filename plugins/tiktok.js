const { commands } = require("../lib/plugins");
const { exec } = require("child_process");

commands.push({
    name: "tiktok",
    alias: ["tt"],
    execute: async (sock, msg, args) => {
        if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a TikTok link!" });
        
        await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Fetching TikTok video..." });

        exec(`yt-dlp -g "${args[0]}"`, async (err, stdout) => {
            if (err) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to fetch TikTok video." });
            await sock.sendMessage(msg.key.remoteJid, { video: { url: stdout.trim().split('\n')[0] }, caption: "✅ KIRA TikTok Downloader" });
        });
    }
});