const axios = require("axios");

module.exports = {
    name: "gifsearch",
    alias: ["searchgif", "giphy"],
    category: "search",
    description: "Search for GIFs using Giphy API",
    usage: `${process.env.PREFIX || '.'}gifsearch <query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What GIF do you want to search?*\nExample: .gifsearch iron man` 
            }, { quoted: msg });
        }

        try {
            // സെർച്ച് തുടങ്ങുന്നു എന്ന് കാണിക്കാൻ
            await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });

            const apiKey = process.env.GIPHY_API_KEY || "myagxm9fUMzQKZYIyjX3qu48X3Abrxqc";
            
            // Giphy API ലേക്ക് റിക്വസ്റ്റ് അയക്കുന്നു
            const res = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1`);

            // റിസൾട്ട് ഉണ്ടോ എന്ന് ചെക്ക് ചെയ്യുന്നു
            if (!res.data || !res.data.data || res.data.data.length === 0) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return await sock.sendMessage(jid, { 
                    text: `❌ *No GIFs found for "${query}"*` 
                }, { quoted: msg });
            }

            // 🚨 THE FIX: Array യിൽ നിന്ന് ഒന്നാമത്തെ [0] ഡാറ്റ എടുക്കുന്നു 🚨
            const gifData = res.data.data[0];
            let gifUrl = '';

            // ഒന്നാമത്തെ ഒബ്ജക്റ്റിൽ ഒറിജിനൽ എംപി4 ഉണ്ടോ എന്ന് നോക്കുന്നു
            if (gifData && gifData.images) {
                if (gifData.images.original && gifData.images.original.mp4) {
                    gifUrl = gifData.images.original.mp4;
                } else if (gifData.images.downsized_small && gifData.images.downsized_small.mp4) {
                    gifUrl = gifData.images.downsized_small.mp4;
                }
            }

            if (!gifUrl) throw new Error("Playable video format not found for this GIF.");

            // വാട്സാപ്പിലേക്ക് അയക്കുന്നു
            await sock.sendMessage(jid, {
                video: { url: gifUrl },
                gifPlayback: true, // ഇത് കൊടുത്താലേ വാട്സാപ്പിൽ അത് GIF ആയി പ്ലേ ആകൂ
                caption: `*GIPHY:* ${query}`
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Giphy Search Error:", err.message);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(jid, { 
                text: `╭──『 ❌ *ERROR* 』──⊷\n│ Failed to fetch GIF.\n│ ${err.message}\n╰──────────────⊷` 
            }, { quoted: msg });
        }
    }
};