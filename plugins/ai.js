const axios = require("axios");

module.exports = {
    name: "ai",
    alias: ["gemini"],
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

            const API_KEY = process.env.GEMINI_API_KEY;

            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
                {
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                }
            );

            const reply =
                res.data.candidates?.[0]?.content?.parts?.[0]?.text;

            await sock.sendMessage(
                jid,
                {
                    text: reply || "No response"
                },
                { quoted: msg }
            );

        } catch (err) {

            console.log(err.response?.data || err.message);

            await sock.sendMessage(jid, {
                text: "❌ Gemini Error"
            });
        }
    }
};