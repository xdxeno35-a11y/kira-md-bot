const { commands } = require("../lib/plugins");
const { exec } = require("child_process");

commands.push({
    name: "fb",
    alias: ["facebook"],
    execute: async (sock, msg, args) => {
        if (!args[0]) return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a Facebook link!" });
        
        await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Fetching Facebook video..." });

        exec(`yt-dlp -g "${args[0]}"`, async (err, stdout) => {
            if (err) return await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to fetch FB video." });
            await sock.sendMessage(msg.key.remoteJid, { video: { url: stdout.trim().split('\n')[0] }, caption: "✅ KIRA FB Downloader" });
        });
    }
});