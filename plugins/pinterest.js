const { commands } = require("../lib/plugins");
const { exec } = require("child_process");

commands.push({
    name: "pinterest",
    alias: ["pin", "pdl"],
    execute: async (sock, msg, args) => {
        const url = args;
        if (!url || !url.includes("pinterest.com")) {
            return await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Please provide a valid Pinterest link!" });
        }

        await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Fetching..." });

        // Debug: Log the command being run to your terminal
        const command = `yt-dlp -g "${url}"`;
        console.log("Executing:", command);

        exec(command, (err, stdout, stderr) => {
            if (err) {
                // This will print the actual error from yt-dlp in your terminal
                console.error("DEBUG ERROR:", stderr);
                return sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: " + stderr.slice(0, 50) });
            }

            const mediaUrl = stdout.trim().split('\n');
            console.log("Media URL found:", mediaUrl);
            
            sock.sendMessage(msg.key.remoteJid, { 
                image: { url: mediaUrl }, 
                caption: "✅ KIRA X MD Pinterest Downloader" 
            });
        });
    }
});