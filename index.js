require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const P = require("pino");

const { commands, loadPlugins } = require("./lib/plugins");

loadPlugins();

// Helper: random delay between min and max milliseconds
function randomDelay(minMs = 2000, maxMs = 5000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function startKira() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log("\n📱 Scan QR Code:\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("✅ KIRA X MD Connected Successfully!");
        }

        if (connection === "close") {
            console.log("⚠️ Connection Closed");
            console.log("Reason:", lastDisconnect?.error);

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5 seconds...");
                await randomDelay(5000, 5000); // Wait exactly 5 seconds
                startKira();
            } else {
                console.log("❌ Logged Out. Delete session and scan QR again.");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];

            if (!msg.message) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";

            const prefix = process.env.PREFIX || ".";

            if (!text.startsWith(prefix)) return;

            const commandName = text
                .slice(prefix.length)
                .trim()
                .split(" ")[0]
                .toLowerCase();

            const args = text
                .slice(prefix.length + commandName.length)
                .trim()
                .split(/ +/)
                .filter(Boolean);

            const command = commands.find(
                cmd =>
                    cmd.name === commandName ||
                    (cmd.alias && cmd.alias.includes(commandName))
            );

            if (!command) return;

            // 🔥 BAN PROTECTION: Show typing indicator + random delay
            await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
            await randomDelay(2500, 6000); // 2.5 to 6 seconds human-like delay

            await command.execute(sock, msg, args);
        } catch (err) {
            console.log("Command Error:", err);
        }
    });
}

startKira();