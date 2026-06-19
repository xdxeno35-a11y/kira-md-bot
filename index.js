require("dotenv").config();
const fs = require('fs');
const http = require('http');
const P = require("pino");
const axios = require("axios");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

global.botMode = 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
let isStarted = false; 
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP server for Port Binding
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

async function startKira() {
    
    if (!fs.existsSync("./session")) {
        fs.mkdirSync("./session");
    }

    // Attempt to download API Session first
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Attempting to load API Session...");
        try {
            const { data } = await axios.get(
                `https://kira-session-generator-api.onrender.com/session?id=${process.env.SESSION_ID}`,
                { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
            );

            if (data.status && data.data) {
                let parsedCredentials = data.data;
                if (typeof parsedCredentials === 'string') parsedCredentials = JSON.parse(parsedCredentials);
                fs.writeFileSync("./session/creds.json", JSON.stringify(parsedCredentials, null, 2), "utf8");
                console.log("✅ Session Loaded and Parsed Successfully!");
            }
        } catch (err) {
            console.log("⚠️ API Session fetch failed, falling back to Pairing Code system:", err.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    
    let version;
    try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
    } catch (e) {
        version = [2, 3000, 1017502447]; 
    }

    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: false, // Set to false to allow Pairing Code fallbacks
        browser: Browsers.ubuntu("Chrome")
    });

    // PAIRING CODE GENERATOR BLOCK (Triggers if credentials don't exist)
    if (!sock.authState.creds.registered) {
        const targetNumber = global.ownerNumber;
        
        if (!targetNumber) {
            console.log("❌ ERROR: BOT_NUMBER environmental variable is missing. Cannot generate pairing code.");
            return;
        }

        console.log(`📱 Generating pairing code for phone number: ${targetNumber}...`);
        await global.sleep(3000); // Wait for socket stabilization
        
        try {
            const code = await sock.requestPairingCode(targetNumber);
            console.log(`\n🔑 YOUR WHATSAPP PAIRING CODE: \x1b[32m${code}\x1b[0m\n`);
        } catch (err) {
            console.log("❌ Pairing code generation failed:", err.message);
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
            if (!isStarted) {
                const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;
                await sock.sendMessage(ownerJid, { text: `✅ *KIRA-X-MD Connected Successfully*` }); 
                isStarted = true;
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting in 5 seconds...");
                await global.sleep(5000);
                startKira();
            } else {
                console.log("❌ Logged out. Wiping session...");
                fs.rmSync("./session", { recursive: true, force: true });
                startKira();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startKira();
