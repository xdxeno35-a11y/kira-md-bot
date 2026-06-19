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
    Browsers,
    BufferJSON // Used to format keys correctly
} = require("@whiskeysockets/baileys");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

global.botMode = 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
let isStarted = false; 
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP server for Railway Port Binding
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

async function startKira() {
    
    if (!fs.existsSync("./session")) {
        fs.mkdirSync("./session");
    }

    // STRICT SESSION_ID FETCHING ONLY
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Fetching and parsing KIRA Session ID from API...");
        try {
            const { data } = await axios.get(
                `https://kira-session-generator-api.onrender.com/session?id=${process.env.SESSION_ID}`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 15000
                }
            );

            if (!data.status || !data.data) {
                throw new Error("API returned an invalid or empty session structure.");
            }

            let sessionData = data.data;

            // Handle stringified inner payloads smoothly
            if (typeof sessionData === 'string') {
                sessionData = JSON.parse(sessionData);
            }

            // Write data using standard formatting that Baileys can deserialize perfectly
            fs.writeFileSync(
                "./session/creds.json", 
                JSON.stringify(sessionData, BufferJSON.replacer, 2), 
                "utf8"
            );
            
            console.log("✅ Session file saved locally.");

        } catch (err) {
            console.log("❌ Critical Session Error:", err.message);
            console.log("🔄 Retrying configuration fetch in 15 seconds...");
            await global.sleep(15000);
            return startKira();
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

    console.log("📡 Initializing WhatsApp Connection...");
    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: false, // Explicitly disabled per your instructions
        browser: Browsers.ubuntu("Chrome")
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
            if (!isStarted) {
                const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;
                try {
                    await sock.sendMessage(ownerJid, { text: `✅ *KIRA-X-MD Connected Successfully via Session ID*` });
                } catch (e) {}
                isStarted = true;
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`📡 Socket closed with code: ${statusCode || "unknown"}`);
            
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting socket in 5 seconds...");
                await global.sleep(5000);
                startKira();
            } else {
                console.log("❌ Connection rejected or session expired. Clearing cache directory...");
                if (fs.existsSync("./session")) {
                    fs.rmSync("./session", { recursive: true, force: true });
                }
                startKira();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startKira();
