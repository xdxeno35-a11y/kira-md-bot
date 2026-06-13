require("dotenv").config();

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

// 🚀 SPEED OPTIMIZATION: Command Map for Instant Lookup
const commandMap = new Map();
commands.forEach(cmd => {
    commandMap.set(cmd.name, cmd);
    if (cmd.alias) {
        cmd.alias.forEach(alias => commandMap.set(alias, cmd));
    }
});

async function startKira() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: false, // 🚫 QR കോഡ് ഓഫ് ആക്കി
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 🚀 PAIRING CODE LOGIC
    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.BOT_NUMBER; 
        
        if (phoneNumber) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(`\n=========================================`);
                    console.log(`🔢 നിന്റെ PAIRING CODE ഇതാണ്: ${code}`);
                    console.log(`=========================================\n`);
                } catch (err) {
                    console.log("Pairing code error:", err);
                }
            }, 3000);
        } else {
            console.log("\n⚠️ ശ്രദ്ധിക്കുക: BOT_NUMBER വേരിയബിൾ പാനലിൽ നൽകിയിട്ടില്ല!\n");
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║    ⚡ KIRA X MD - SYSTEM ONLINE - [PREMIUM]          ║
║    ────────────────────────────────────────          ║
║    ◈ Status: Encrypted & Secure                      ║
║    ◈ Version: 1.0.0 (Stable)                         ║
║    ◈ Support: https://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
            `);
        }

        if (connection === "close") {
            console.log("⚠️ Connection Closed");
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5 seconds...");
                setTimeout(() => startKira(), 5000);
            } else {
                console.log("❌ Logged Out. Delete session and try again.");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages;
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";

            if (!text.startsWith(prefix)) return;

            const commandName = text.slice(prefix.length).trim().split(" ").toLowerCase();
            const args = text.slice(prefix.length + commandName.length).trim().split(/ +/).filter(Boolean);

            const command = commandMap.get(commandName);
            if (!command) return;

            await command.execute(sock, msg, args);
        } catch (err) {
            console.error("Command Error:", err);
        }
    });
}

startKira();

// 🚀 RAILWAY FIX: Web Server
const http = require('http');
http.createServer((req, res) => res.end('Kira Bot is Alive! ⚡')).listen(process.env.PORT || 8080, () => {
    console.log("🌐 Web server is running...");
});