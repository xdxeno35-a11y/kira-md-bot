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

let isStarted = false; 

// Keep alive for Railway
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 8080);

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
        logger: P({ level: "silent" }),
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

            // Auto Join Group
            try {
                await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
                console.log("✅ Joined support group!");
            } catch (e) { console.log("Could not join group."); }

            // Startup Message
            if (!isStarted) {
                await sock.sendMessage(global.ownerNumber, { text: "🚀 *KIRA X MD STARTED*\n\n*Support Group:* https://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY" });
                isStarted = true;
            }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startKira();
            else console.log("❌ Logged Out.");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const jid = msg.key.remoteJid;
            const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + "@s.whatsapp.net" : (msg.participant || jid);
            const isOwner = sender === global.ownerNumber;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";
            if (!text.startsWith(prefix)) return;

            const commandName = text.slice(prefix.length).trim().split(" ")[0].toLowerCase();
            const args = text.slice(prefix.length + commandName.length).trim().split(/ +/).filter(Boolean);
            const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

            if (command) {
                // Security Check
                if (global.botMode === 'private' && !isOwner) return;
                if (command.category === 'owner' && !isOwner) {
                    return await sock.sendMessage(jid, { text: "❌ *This is an owner-only command!*" }, { quoted: msg });
                }
                
                await command.execute(sock, msg, args, isOwner);
            }
        } catch (err) {
            console.log("Command Error:", err);
        }
    });
}

startKira();