const axios = require("axios");

module.exports = {
    name: "ai",
    alias: ["gemini", "gpt"],
    category: "ai",

    async execute(sock, msg, args) {

        const jid = msg.key.remoteJid;
        const prompt = args.join(" ");

        if (!prompt) {
            return await sock.sendMessage(jid, {
                text: "❌ Give a prompt"
            });
        }

        try {

            const API_KEY = "PUT_YOUR_NEW_GEMINI_KEY_HERE";

            const { data } = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                }
            );

            const reply =
                data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No response";

            await sock.sendMessage(
                jid,
                { text: reply },
                { quoted: msg }
            );

        } catch (err) {

            console.log(
                "AI ERROR:",
                err.response?.data || err.message
            );

            await sock.sendMessage(
                jid,
                { text: "❌ AI Error" },
                { quoted: msg }
            );
        }
    }
};