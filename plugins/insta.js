const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'insta',
    alias: ['ig', 'instagram', 'reel'],
    category: 'downloader',
    description: 'Download Instagram videos/reels',
    usage: `${process.env.PREFIX || '.'}insta <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();
        
        // ലിങ്ക് എടുക്കുന്ന കോഡ് അതേപോലെ നിലനിർത്തുന്നു
        if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const text = quoted.conversation || quoted.extendedTextMessage?.text || "";
            const match = text.match(/https?:\/\/(www\.)?instagram\.com\/\S+/);
            url = match ? match : "";
        }

        if (!url || !url.includes('instagram.com')) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Instagram link!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });

        try {
            // API ഉപയോഗിച്ച് ഡൗൺലോഡ് ചെയ്യുന്നു
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            // API-യിൽ നിന്ന് വീഡിയോ ലിങ്ക് കിട്ടുന്നു (ഇത് API-യുടെ റെസ്പോൺസ് അനുസരിച്ച് മാറ്റാം)
            const videoUrl = res.data.result.download_url || res.data.result;

            await sock.sendMessage(jid, { 
                video: { url: videoUrl }, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA INSTA DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Insta Error:", err);
            await sock.sendMessage(jid, { text: "❌ *Download failed!*" }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};