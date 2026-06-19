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
    BufferJSON
} = require("@whiskeysockets/baileys");

// Loading plugins based on your structural architecture
const { commands, loadPlugins } = require("./lib/plugins");

async function initializeApp() {
    console.log("📥 Loading Plugins...");
    await loadPlugins();
    global.commands = commands;
    
    // Global configurations
    global.botMode = process.env.BOT_MODE || 'public'; 
    global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
    global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    let isStarted = false; 

    // HTTP server for Railway Port Binding
    const PORT = process.env.PORT || 3000;
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('KIRA-X-MD Online');
    }).listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Server active on port ${PORT}`);
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
                    throw new Error("API returned an empty or faulty session object.");
                }

                let sessionData = data.data;

                if (typeof sessionData === 'string') {
                    sessionData = JSON.parse(sessionData);
                }

                // Format structure correctly using Baileys JSON serializer replacement criteria
                fs.writeFileSync(
                    "./session/creds.json", 
                    JSON.stringify(sessionData, BufferJSON.replacer, 2), 
                    "utf8"
                );
                
                console.log("✅ Session authentication credentials configured locally.");

            } catch (err) {
                console.log("❌ Critical Session Error:", err.message);
                console.log("🔄 Retrying retrieval configuration in 15 seconds...");
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

        console.log("📡 Initializing WhatsApp Connection Instance...");
        const sock = makeWASocket({
            version,
            logger: P({ level: "fatal" }),
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu("Chrome")
        });

        // Sync and monitor session state modifications
        sock.ev.on("creds.update", saveCreds);

        // Track Connection State Updates
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
                console.log(`📡 Socket closed with status code: ${statusCode || "unknown"}`);
                
                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log("🔄 Reconnecting socket link context in 5 seconds...");
                    await global.sleep(5000);
                    startKira();
                } else {
                    console.log("❌ Authentication rejected or session expired. Flushing cache folder structure...");
                    if (fs.existsSync("./session")) {
                        fs.rmSync("./session", { recursive: true, force: true });
                    }
                    startKira();
                }
            }
        });

        // X-Asena Pattern: Core Message Upsert Handler Hook
        sock.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                if (chatUpdate.type !== 'notify') return;
                
                const msg = chatUpdate.messages[0];
                if (!msg.message) return;
                
                // Block self execution strings depending on operational environments
                if (msg.key.fromMe && global.botMode === 'public') return;

                // Pass context to your loaded module components inside ./lib/plugins
                // You can add your standard message structure normalization parser here
                // e.g., const messageContext = smsg(sock, msg);
                
            } catch (error) {
                console.error("Error executing processing scope update:", error);
            }
        });
    }

    startKira();
}

initializeApp().catch(err => console.error("Initialization Failed:", err));
