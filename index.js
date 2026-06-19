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

// HTTP Server for Cloud Uptime Systems (e.g., Railway, Render)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('KIRA-X-MD Online');
}).listen(PORT, '0.0.0.0');

async function startKira() {
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading session from SESSION_ID...");
        if (!fs.existsSync("./session")) fs.mkdirSync("./session");
        let sessionId = process.env.SESSION_ID;

        if (sessionId.startsWith("KIRA~")) {
            sessionId = sessionId.slice(5);
        }

        fs.writeFileSync(
            "./session/creds.json",
            Buffer.from(sessionId, "base64").toString()
        );
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
        printQRInTerminal: !process.env.SESSION_ID // Only print QR if no SESSION_ID is supplied
    });

    // Pairing Code Strategy implementation
    if (!sock.authState.creds.registered && !process.env.SESSION_ID) {
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
            try {
                await sock.groupAcceptInvite("C3hbXjblNLiF7CoDYJ8lwY");
            } catch (e) { }

            if (!isStarted) {
                try {
                    await sock.sendMessage(global.ownerNumber, {
                        text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n\n👤 Owner : Madhav\n🤖 Bot : KIRA-X-MD\n🌐 Repo :\nhttps://github.com/Madhavgkmd/kira-md-bot\n\n📢 Support Group :\nhttps://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY\n\n╰━━━━━━━━━━━━━━⬣`
                    });
                } catch (err) {}
                isStarted = true;
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`📡 Connection closed. Status Code: ${statusCode || "unknown"}. Reconnecting: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                await global.sleep(5000);
                startKira();
            } else {
                console.log("❌ Logged out. Clearing local session folder...");
                if (fs.existsSync("./session")) {
                    fs.rmSync("./session", { recursive: true, force: true });
                }
                startKira();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ===== ANTI DELETE SYSTEM =====
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

                    await sock.sendMessage(
                        global.ownerNumber,
                        { text: `🚨 DELETED MESSAGE\n\n👤 USER:\n${sender}\n\n💬 CHAT:\n${jid}` }
                    );

                    await sock.sendMessage(
                        global.ownerNumber,
                        { forward: deletedMsg }
                    );
                }
            }
        } catch (err) {
            console.log("ANTI DELETE ERROR:", err);
        }
    });

    // ===== WELCOME & GOODBYE =====
    global.welcomeChats = global.welcomeChats || [];
    global.goodbyeChats = global.goodbyeChats || [];

    sock.ev.on("group-participants.update", async (update) => {
        try {
            const jid = update.id;
            const action = update.action;

            for (const participant of update.participants) {
                const targetJid = participant.id || participant;

                // Welcome Trigger
                if ((action === "add" || action === "join") && global.welcomeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `🎉 Welcome @${targetJid.split("@")[0]} to the group!`,
                        mentions: [targetJid]
                    });
                }

                // Goodbye Trigger
                if ((action === "remove" || action === "leave") && global.goodbyeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `👋 Goodbye @${targetJid.split("@")[0]}!`,
                        mentions: [targetJid]
                    });
                }
            }
        } catch (err) {
            console.log("WELCOME/GOODBYE ERROR:", err);
        }
    });

    // ===== CENTRALIZED MESSAGE UPSERT HANDLER LINK =====
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.key?.id) return;

            // Cache message for anti-delete routines
            global.messageStore[msg.key.id] = msg;
            if (Object.keys(global.messageStore).length > 5000) {
                delete global.messageStore[Object.keys(global.messageStore)[0]];
            }

            if (!msg.message) return;

            const jid = msg.key.remoteJid;
            const sender = msg.key.fromMe
                ? sock.user.id.split(':')[0] + "@s.whatsapp.net"
                : (msg.participant || jid);

            const isOwner = sender === global.ownerNumber;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";
            const isGroup = jid.endsWith("@g.us");

            // ===== RUN AUTO DOWNLOAD ROUTINES =====
            global.autoDlChats = global.autoDlChats || [];
            global.autoDlAllGroups = global.autoDlAllGroups || false;
            global.autoDlAllDms = global.autoDlAllDms || false;

            const autoDlEnabled =
                global.autoDlChats.includes(jid) ||
                (global.autoDlAllGroups && isGroup) ||
                (global.autoDlAllDms && !isGroup);

            if (autoDlEnabled && text && !text.startsWith(prefix)) {
                try {
                    await global.sleep(2000);

                    if (/instagram\.com/i.test(text)) {
                        const insta = commands.find(c => c.name === "insta");
                        if (insta) return await insta.execute(sock, msg, [text]);
                    }

                    if (/facebook\.com|fb\.watch/i.test(text)) {
                        const fb = commands.find(c => c.name === "fb");
                        if (fb) return await fb.execute(sock, msg, [text]);
                    }

                    if (/youtube\.com|youtu\.be/i.test(text)) {
                        const ytv = commands.find(c => c.name === "ytv");
                        if (ytv) return await ytv.execute(sock, msg, [text]);
                    }
                } catch (e) {
                    console.error("AUTO DL ERROR:", e);
                }
            } 

            // Prevent further execution if prefix is missing
            if (!text.startsWith(prefix)) return;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

            if (command) {
                if (global.botMode === 'private' && !isOwner) return;
                if (command.category === 'owner' && !isOwner) {
                    return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
                }

                // Simulate processing latency delay
                await global.sleep(1500);
                await command.execute(sock, msg, args, isOwner);
            }
        } catch (err) {
            console.error("========== COMMAND ERROR ==========");
            console.error("MESSAGE:", err?.message);
            console.error("STACK:", err?.stack);
            console.error("===================================");
        }
    });
}

startKira().catch(err => console.error("Critical Execution Fault:", err));
