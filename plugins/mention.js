module.exports = {
    name: "mention",
    alias: ["tag", "tagall"],
    category: "group",

    async execute(sock, msg, args, isOwner) {

        const jid = msg.key.remoteJid;

        if (!isOwner) {
            return await sock.sendMessage(jid, {
                text: "❌ *Owner only command*"
            }, { quoted: msg });
        }

        if (!jid.endsWith("@g.us")) {
            return await sock.sendMessage(jid, {
                text: "❌ Group only"
            }, { quoted: msg });
        }

        const text =
            args.join(" ") ||
            "📢 Attention Everyone";

        const meta =
            await sock.groupMetadata(jid);

        const members =
            meta.participants.map(x => x.id);

        await sock.sendMessage(jid, {
            text,
            mentions: members
        }, { quoted: msg });
    }
};