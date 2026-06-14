require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const P = require("pino");
const http = require("http");

const { commands, loadPlugins } = require("./lib/plugins");

loadPlugins();
global.commands = commands;

// Railway-യിൽ ബോട്ട് ഉണർന്നിരിക്കാൻ (Keep Alive)
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 8080);

async function startKira() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: true 
    });

    // പെയറിങ് കോഡ് ലോജിക്
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
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startKira();
            else console.log("❌ Logged Out. Delete session folder and scan again.");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages;
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";

            if (!text.startsWith(prefix)) return;

            const commandName = text.slice(prefix.length).trim().split(" ").toLowerCase();
            const args = text.slice(prefix.length + commandName.length).trim().split(/ +/).filter(Boolean);

            const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

            if (command) await command.execute(sock, msg, args);
        } catch (err) {
            console.log("Command Error:", err);
        }
    });
}

startKira();