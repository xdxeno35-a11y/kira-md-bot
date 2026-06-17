require("dotenv").config();
const fs = require('fs');
const http = require('http');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

// Global settings
global.botMode = 'public'; 
global.ownerNumber = process.env.BOT_NUMBER + "@s.whatsapp.net";
global.autoDlChats = [];
global.autoDlAllGroups = false;
global.autoDlAllDms = false;
global.antiDeleteChats = [];
global.messageStore = {};

// Global API Configuration
global.api = {
    fb: process.env.FB_API,
    shazam: process.env.SHAZAM_API,
    giphy: process.env.GIPHY_API,
    serp: process.env.SERPAPI_KEY,
    insta: process.env.INSTA_API,
    geniusKeys: process.env.GENIUS_KEYS ? process.env.GENIUS_KEYS.split(';') : [],
    pinDl: process.env.PIN_DL_API,
    pinSearch: process.env.PIN_SEARCH_API,
    tenor: process.env.TENOR_API_KEY,
    ytVideo: process.env.YT_VIDEO_API,
    ytVideoList: process.env.YT_VIDEO_APIS ? process.env.YT_VIDEO_APIS.split(';') : [],
    ytmp3List: process.env.YT_MP3_APIS ? process.env.YT_MP3_APIS.split(';') : []
};

let isStarted = false; 

http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 3000);

async function startKira() {
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading session from SESSION_ID...");
        if (!fs.existsSync("./session")) fs.mkdirSync("./session");
        fs.writeFileSync("./session/creds.json", Buffer.from(process.env.SESSION_ID, 'base64').toString());
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: true 
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.BOT_NUMBER;
        if (phoneNumber) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
                console.log("\n🔑 *YOUR PAIRING CODE:* " + code + "\n");
            }, 3000);
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {

    const connectedNumber =
        sock.user.id.split(":")[0];

    if (
        connectedNumber !==
        process.env.BOT_NUMBER
    ) {
        console.log(
            "❌ Unauthorized Session Detected!"
        );
        process.exit(1);
    }

    console.log(
        "✅ KIRA X MD Connected Successfully!"
    );

    try {
        await sock.groupAcceptInvite(
            "C3hbXjblNLiF7CoDYJ8lwY"
        );
    } catch (e) {}

            if (!isStarted) {
                await sock.sendMessage(global.ownerNumber, { text: "🚀 *KIRA X MD STARTED*" });
                isStarted = true;
            }
        }

       if (connection === "close") {

    const statusCode =
        lastDisconnect?.error?.output?.statusCode;

    if (statusCode === DisconnectReason.loggedOut) {

        console.log("❌ Invalid Session! Deleting...");

        if (fs.existsSync("./session")) {
            fs.rmSync("./session", {
                recursive: true,
                force: true
            });
        }

        return startKira();
    }

    startKira();
}
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("messages.update", async (updates) => {
    try {

        for (const update of updates) {

            if (
                update.update?.message === null ||
                update.update?.messageStubType
            ) {

                const key = update.key;
                if (!key) continue;

                const jid = key.remoteJid;

                if (!global.antiDeleteChats.includes(jid))
                    continue;

                const deletedMsg =
                    global.messageStore[key.id];

                if (!deletedMsg)
                    continue;

                const sender =
                    deletedMsg.participant ||
                    deletedMsg.key.participant ||
                    deletedMsg.key.remoteJid;

                await sock.sendMessage(
                    global.ownerNumber,
                    {
                        text:
`🚨 DELETED MESSAGE

👤 USER:
${sender}

💬 CHAT:
${jid}`
                    }
                );

                await sock.sendMessage(
                    global.ownerNumber,
                    {
                        forward: deletedMsg
                    }
                );
            }
        }

    } catch (err) {
        console.log("ANTI DELETE ERROR:", err);
    }
});
// ===== WELCOME & GOODBYE EVENT =====
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const jid = update.id;
            const participants = update.participants;
            const action = update.action;

            global.welcomeChats = global.welcomeChats || [];
            global.goodbyeChats = global.goodbyeChats || [];
            global.welcomeMessages = global.welcomeMessages || {};
            global.goodbyeMessages = global.goodbyeMessages || {};

            for (let participant of participants) {
                // Goodbye
                if ((action === 'remove' || action === 'leave') && global.goodbyeChats.includes(jid)) {
                    let customMsg = global.goodbyeMessages[jid];
                    let textMsg = customMsg ? customMsg.replace(/@user/ig, `@${participant.split('@')}`) : `👋 *@${participant.split('@')} left the group. Bye Bye!* 🏃‍♂️💨`;
                    
                    await sock.sendMessage(jid, { text: textMsg, mentions: [participant] });
                }
                
                // Welcome
                if ((action === 'add' || action === 'join') && global.welcomeChats.includes(jid)) {
                    let customMsg = global.welcomeMessages[jid];
                    let textMsg = customMsg ? customMsg.replace(/@user/ig, `@${participant.split('@')}`) : `🎉 *Welcome to the group, @${participant.split('@')}!* ✨\n\nHope you have a great time here!`;

                    await sock.sendMessage(jid, { text: textMsg, mentions: [participant] });
                }
            }
        } catch (err) {
            console.log("Welcome/Goodbye Error:", err);
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        try {
            if (type !== 'notify') return; // ഡെലിവറി റിപ്പോർട്ടുകൾ ഒഴിവാക്കാൻ

            const msg = messages[0];

            if (msg.key && msg.key.remoteJid === 'status@broadcast') return; // സ്റ്റാറ്റസ് ഒഴിവാക്കാൻ

            if (msg.key?.id) {
                global.messageStore[msg.key.id] = msg;
                if (Object.keys(global.messageStore).length > 5000) {
                    delete global.messageStore[Object.keys(global.messageStore)[0]];
                }
            }

            // Disappearing Messages ഫിക്സ്
            let actualMessage = msg.message?.ephemeralMessage?.message || 
                                 msg.message?.viewOnceMessage?.message || 
                                 msg.message;

            if (!actualMessage) return;

            const text = actualMessage.conversation || 
                         actualMessage.extendedTextMessage?.text || 
                         actualMessage.imageMessage?.caption || 
                         actualMessage.videoMessage?.caption || "";

            if (text) {
                console.log("📩 Message from", msg.key.remoteJid, ":", text);
            }

            const jid = msg.key.remoteJid;
            const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + "@s.whatsapp.net" : (msg.participant || jid);
            const isOwner = sender === global.ownerNumber;
            const prefix = process.env.PREFIX || ".";
            const isGroup = jid.endsWith("@g.us");

            // ===== ANTILINK (WhatsApp Only) =====
            global.antilinkChats = global.antilinkChats || [];
            
            if (isGroup && global.antilinkChats.includes(jid)) {
                // വാട്സാപ്പ് ഗ്രൂപ്പ് ലിങ്ക് ആണോ എന്ന് ചെക്ക് ചെയ്യുന്നു
                const isWaLink = /chat\.whatsapp\.com\/[a-zA-Z0-9]/i.test(text);
                
                if (isWaLink && !isOwner) { // നീ (Owner) അയക്കുന്ന ലിങ്ക് ഡിലീറ്റ് ആവില്ല
                    try {
                        // ലിങ്ക് ഡിലീറ്റ് ചെയ്യുന്നു
                        await sock.sendMessage(jid, { delete: msg.key });
                        // വാണിംഗ് മെസ്സേജ് നൽകുന്നു
                        await sock.sendMessage(jid, { 
                            text: `🚨 *@${sender.split('@')[0]} WhatsApp links are not allowed here!*`, 
                            mentions: [sender] 
                        });
                        return; // ബാക്കി കമാൻഡുകൾ വർക്ക് ആവാതിരിക്കാൻ
                    } catch (e) {
                        console.log("Antilink Error (Bot may not be admin):", e);
                    }
                }
            }
// ===== AUTO DL =====

global.autoDlChats = global.autoDlChats || [];
global.autoDlAllGroups = global.autoDlAllGroups || false;
global.autoDlAllDms = global.autoDlAllDms || false;

const autoDlEnabled =
    global.autoDlChats.includes(jid) ||
    (global.autoDlAllGroups && isGroup) ||
    (global.autoDlAllDms && !isGroup);

if (
    autoDlEnabled &&
    text &&
    !text.startsWith(prefix)
) {
    try {

        if (/instagram\.com/i.test(text)) {
            const insta = commands.find(c => c.name === "insta");
            if (insta) return await insta.execute(sock, msg, [text]);
        }

        if (/facebook\.com|fb\.watch/i.test(text)) {
            const fb = commands.find(c => c.name === "fb");
            if (fb) return await fb.execute(sock, msg, [text]);
        }

        if (/youtube\.com|youtu\.be/i.test(text)) {
            const ytv = commands.find(c => c.name === "ytv");
            if (ytv) return await ytv.execute(sock, msg, [text]);
        }

    } catch (e) {
        console.error("AUTO DL ERROR:", e);
    }
} 
        if (!text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

        if (command) {
            if (global.botMode === 'private' && !isOwner) return;
            if (command.category === 'owner' && !isOwner) {
                return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
            }
            await command.execute(sock, msg, args, isOwner);
        }
     } catch (err) {
            console.error("========== COMMAND ERROR ==========");
            console.error("MESSAGE:", err?.message);
            console.error("STACK:", err?.stack);
            console.error("FULL ERROR:", err);
            console.error("===================================");
        }
    });

}

startKira();