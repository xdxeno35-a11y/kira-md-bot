require("dotenv").config();
const fs = require('fs');
const http = require('http');
const P = require("pino");
const axios = require("axios");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion, // Brought back for dynamic version fetching
    Browsers
} = require("@whiskeysockets/baileys");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

// Global configurations
global.botMode = 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
global.autoDlChats = [];
global.autoDlAllGroups = false;
global.autoDlAllDms = false;
global.antiDeleteChats = [];
global.messageStore = {};

let isStarted = false; 
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP server for Railway Port Binding
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

async function startKira() {
    
    // ===== EXACT API SESSION FETCHING BLOCK =====
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading KIRA Session...");

        if (!fs.existsSync("./session")) {
            fs.mkdirSync("./session");
        }

        try {
            const { data } = await axios.get(
                `https://kira-session-generator-api.onrender.com/session?id=${process.env.SESSION_ID}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                }
            );

            if (!data.status) {
                throw new Error("Invalid Session ID");
            }

            const credentialsData = typeof data.data === 'object' 
                ? JSON.stringify(data.data, null, 2) 
                : data.data;

            fs.writeFileSync("./session/creds.json", credentialsData, "utf8");
            console.log("✅ Session Loaded Successfully");

        } catch (err) {
            console.log("❌ Session Load Failed:", err.message);
            console.log("🔄 Retrying in 10 seconds...");
            await global.sleep(10000);
            return startKira(); 
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    
    // FETCH LATEST PRODUCTION VERSION DYNAMICALLY TO RESOLVE CODE 405
    let version;
    try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
        console.log(`📡 Using Latest WhatsApp Web Version: ${version.join('.')}`);
    } catch (e) {
        // Fallback array if servers fail to respond momentarily
        version = [2, 3000, 1017502447]; 
    }

    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu("Chrome"), // Switched to Ubuntu Chrome which has high compatibility rates
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    });

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
                    text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n\n🤖 Bot : KIRA-X-MD\n\n╰━━━━━━━━━━━━━━⬣`
                }); 
                isStarted = true;
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`📡 Connection closed. Code: ${statusCode || "unknown"}. Reconnecting logic triggered...`);

            if (shouldReconnect) {
                console.log("🔄 Connection closed, reconnecting in 5 seconds...");
                await global.sleep(5000);
                startKira();
            } else {
                console.log("❌ Session expired or unlinked. Clearing directory...");
                if (fs.existsSync("./session")) {
                    fs.rmSync("./session", { recursive: true, force: true });
                }
                startKira();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Messages entry point
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;
            const jid = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";

            if (!text.startsWith(prefix)) return;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

            if (command) {
                await global.sleep(1500);
                await command.execute(sock, msg, args);
            }
        } catch (err) {
            console.error("Command processing error:", err.message);
        }
    });
}

startKira();
