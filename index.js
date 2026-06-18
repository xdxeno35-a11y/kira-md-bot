require("dotenv").config();
const fs = require('fs');
const http = require('http');
const P = require("pino");
const axios = require("axios"); // Added axios for session fetching
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

// Global settings
global.botMode = 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
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
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Keep-alive server
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 3000);

async function startKira() {
    
    // ===== CORRECTED API SESSION FETCHING =====
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading KIRA Session...");

        if (!fs.existsSync("./session")) {
            fs.mkdirSync("./session");
        }

        try {
            const response = await axios.get(
                `https://kira-session-generator-api.onrender.com/session?id=${process.env.SESSION_ID}`
            );

            if (!response.data.status) {
                throw new Error("Invalid Session ID");
            }

            fs.writeFileSync(
                "./session/creds.json",
                response.data.data,
                "utf8"
            );

            console.log("✅ Session Loaded Successfully");

        } catch (err) {
            console.log("❌ Session Load Failed:", err.message);
            return; // API crash aayyal execution stop cheyyunnu (to avoid QR generation loop)
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: true 
    });

    // Request Pairing Code if not registered
    if (!sock.authState.creds.registered && global.ownerNumber) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(global.ownerNumber);
            console.log("\n🔑 *YOUR PAIRING CODE:* " + code + "\n");
        }, 3000);
    }

    // Connection Updates
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
            try {
                await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
            } catch (e) { }

            if (!isStarted) {
                const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;
                await sock.sendMessage(ownerJid, {
                    text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n\n👤 Owner : Madhav\n🤖 Bot : KIRA-X-MD\n🌐 Repo :\nhttps://github.com/Madhavgkmd/kira-md-bot\n\n📢 Support Group :\nhttps://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY\n\n╰━━━━━━━━━━━━━━⬣`
                }); 
                isStarted = true;
            }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startKira();
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Anti-Delete Feature
    sock.ev.on("messages.update", async (updates) => {
        try {
            for (const update of updates) {
                if (update.update?.message === null || update.update?.messageStubType) {
                    const key = update.key;
                    if (!key) continue;

                    const jid = key.remoteJid;
                    if (!global.antiDeleteChats.includes(jid)) continue;

                    const deletedMsg = global.messageStore[key.id];
                    if (!deletedMsg) continue;

                    const sender = deletedMsg.participant || deletedMsg.key.participant || deletedMsg.key.remoteJid;
                    const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;

                    await sock.sendMessage(ownerJid, {
                        text: `🚨 DELETED MESSAGE\n\n👤 USER:\n${sender}\n\n💬 CHAT:\n${jid}`
                    });

                    await sock.sendMessage(
