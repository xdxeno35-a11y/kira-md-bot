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
        logger: P({ level: "debug" }),
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
            console.log("✅ KIRA X MD Connected Successfully!");
            try {
                await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
            } catch (e) { }

            if (!isStarted) {
                await sock.sendMessage(global.ownerNumber, { text: "🚀 *KIRA X MD STARTED*" });
                isStarted = true;
            }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startKira();
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
        // ✅ FIX: take the first message from the array
        const msg = messages[0];
        if (!msg.message) return;

        // Log for debugging
        console.log("📩 Message from", msg.key.remoteJid, ":", msg.message?.conversation || msg.message?.extendedTextMessage?.text);

        const jid = msg.key.remoteJid;
        const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + "@s.whatsapp.net" : (msg.participant || jid);
        const isOwner = sender === global.ownerNumber;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = process.env.PREFIX || ".";
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