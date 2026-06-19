const fs = require('fs');
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

let isStarted = false;

async function connect() {
    // 1. Establish session base pathing
    if (!fs.existsSync("./session")) {
        fs.mkdirSync("./session");
    }

    // 2. Resolve Kira Remote Session ID credentials structure 
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
            if (typeof sessionData === 'string') {
                sessionData = JSON.parse(sessionData);
            }

            // Write authentication keys formatted perfectly for Baileys deserializer engines
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
            return connect(); 
        }
    }

    // 3. MultiFile Auth setups
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    
    let version;
    try {
        const fetched = await fetchLatestBaileysVersion();
        version = fetched.version;
    } catch (e) {
        version = [2, 3000, 1017502447]; 
    }

    console.log("📡 Initializing WhatsApp Socket Stream...");
    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu("Chrome")
    });

    // Save auth adjustments instantly
    sock.ev.on("creds.update", saveCreds);

    // 4. Track Connection Lifecycle State Actions
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
                console.log("🔄 Reconnecting socket link context in 5 seconds...");
                await global.sleep(5000);
                connect();
            } else {
                console.log("❌ Connection rejected or session expired. Clearing cache directory...");
                if (fs.existsSync("./session")) {
                    fs.rmSync("./session", { recursive: true, force: true });
                }
                connect();
            }
        }
    });

    // 5. Native Message Upsert Listener Hook
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            
            // Check message origin settings against running mode configuration
            if (msg.key.fromMe && global.botMode === 'public') return;

            // Hand off your message parameter payload down to your custom 
            // kira plugin collection controllers inside /lib/plugins.js
        } catch (error) {
            console.error("Error running core connection event processor pipeline:", error);
        }
    });

    return sock;
}

module.exports = { connect };
