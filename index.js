require("dotenv").config();
const fs = require('fs');
const http = require('http');
const P = require("pino");
const axios = require("axios");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { commands, loadPlugins } = require("./lib/plugins");
loadPlugins();
global.commands = commands;

// Global settings
global.botMode = 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
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

// Keep-alive server
http.createServer((req, res) => res.end('KIRA-X-MD Online')).listen(process.env.PORT || 3000);

async function startKira() {
    
    // ===== SAFE API SESSION FETCHING =====
    if (process.env.SESSION_ID && !fs.existsSync("./session/creds.json")) {
        console.log("🔄 Loading KIRA Session...");

        if (!fs.existsSync("./session")) {
            fs.mkdirSync("./session");
        }

        try {
            const response = await axios.get(
                `https://kira-session-generator-api.onrender.com/session?id=${process.env.SESSION_ID}`
            );

            if (!response.data.status) {
                throw new Error("Invalid Session ID");
            }

            let credentialsData = typeof response.data.data === 'object' 
                ? JSON.stringify(response.data.data) 
                : response.data.data;

            fs.writeFileSync(
                "./session/creds.json",
                credentialsData,
                "utf8"
            );

            console.log("✅ Session Loaded Successfully");

        } catch (err) {
            console.log("❌ Session Load Failed:", err.message);
            if (fs.existsSync("./session/creds.json")) fs.unlinkSync("./session/creds.json");
            return; 
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "fatal" }),
        auth: state,
        printQRInTerminal: true 
    });

    // Request Pairing Code if not registered
    if (!sock.authState.creds.registered && global.ownerNumber) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(global.ownerNumber);
            console.log("\n🔑 *YOUR PAIRING CODE:* " + code + "\n");
        }, 3000);
    }

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
                    text: `╭━━━〔 KIRA-X-MD 〕━━━⬣\n\n✅ Connected Successfully\n\n👤 Owner : Madhav\n🤖 Bot : KIRA-X-MD\n🌐 Repo :\nhttps://github.com/Madhavgkmd/kira-md-bot\n\n📢 Support Group :\nhttps://chat.whatsapp.com/C3hbXjblNLiF7CoDYJ8lwY\n\n╰━━━━━━━━━━━━━━⬣`
                }); 
                isStarted = true;
            }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startKira();
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Anti-Delete Feature
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
                    const ownerJid = `${global.ownerNumber}@s.whatsapp.net`;

                    await sock.sendMessage(ownerJid, {
                        text: `🚨 DELETED MESSAGE\n\n👤 USER:\n${sender}\n\n💬 CHAT:\n${jid}`
                    });

                    await sock.sendMessage(ownerJid, { forward: deletedMsg });
                }
            }
        } catch (err) {
            console.log("ANTI DELETE ERROR:", err);
        }
    });

    // Welcome & Goodbye Events
    global.welcomeChats = global.welcomeChats || [];
    global.goodbyeChats = global.goodbyeChats || [];

    sock.ev.on("group-participants.update", async (update) => {
        try {
            const jid = update.id;
            const action = update.action;

            for (const participant of update.participants) {
                const userJid = participant.id || participant;

                if ((action === "add" || action === "join") && global.welcomeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `🎉 Welcome @${userJid.split("@")[0]} to the group!`,
                        mentions: [userJid]
                    });
                }

                if ((action === "remove" || action === "leave") && global.goodbyeChats.includes(jid)) {
                    await sock.sendMessage(jid, {
                        text: `👋 Goodbye @${userJid.split("@")[0]}!`,
                        mentions: [userJid]
                    });
                }
            }
        } catch (err) {
            console.log("WELCOME/GOODBYE ERROR:", err);
        }
    });

    // Messages Entry Point
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            if (msg.key?.id) {
                global.messageStore[msg.key.id] = msg;
                if (Object.keys(global.messageStore).length > 5000) {
                    delete global.messageStore[Object.keys(global.messageStore)[0]];
                }
            }

            const jid = msg.key.remoteJid;
            const sender = msg.key.fromMe
                ? (sock.user.id.split(':')[0] + "@s.whatsapp.net")
                : (msg.participant || jid);

            const cleanSender = sender.replace(/[^0-9]/g, '');
            const isOwner = cleanSender === global.ownerNumber;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const prefix = process.env.PREFIX || ".";
            const isGroup = jid.endsWith("@g.us");

            // Auto Downloader Route
            global.autoDlChats = global.autoDlChats || [];
            global.autoDlAllGroups = global.autoDlAllGroups || false;
            global.autoDlAllDms = global.autoDlAllDms || false;

            const autoDlEnabled = global.autoDlChats.includes(jid) || (global.autoDlAllGroups && isGroup) || (global.autoDlAllDms && !isGroup);

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

            if (!text.startsWith(prefix)) return;

            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = commands.find(cmd => cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName)));

            if (command) {
                if (global.botMode === 'private' && !isOwner) return;
                if (command.category === 'owner' && !isOwner) {
                    return await sock.sendMessage(jid, { text: "❌ *Owner only!*" }, { quoted: msg });
                }

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

startKira();
