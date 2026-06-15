// നിന്റെ index.js-ൽ global.botMode എന്ന് ഡിക്ലയർ ചെയ്തിട്ടുണ്ടെന്ന് ഉറപ്പുവരുത്തുക
// ഉദാഹരണത്തിന്: global.botMode = 'public';

module.exports = {
    name: 'mode',
    category: 'owner',
    description: 'Change bot mode (public/private)',
    async execute(sock, msg, args) {
        const mode = args[0]?.toLowerCase();
        
        if (mode === 'public') {
            global.botMode = 'public';
            await sock.sendMessage(msg.key.remoteJid, { text: "🌐 *Bot is now in Public mode!*" }, { quoted: msg });
        } else if (mode === 'private') {
            global.botMode = 'private';
            await sock.sendMessage(msg.key.remoteJid, { text: "🔒 *Bot is now in Private mode!*" }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ *Usage: .mode public or .mode private*" }, { quoted: msg });
        }
    }
};