require("dotenv").config();
const http = require('http');
const { commands, loadPlugins } = require("./lib/plugins");
const { connect } = require("./lib/connection");

// Critical Kira Global Assignments
global.botMode = process.env.BOT_MODE || 'public'; 
global.ownerNumber = (process.env.BOT_NUMBER || "").replace(/[^0-9]/g, '');
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP server interface configuration for cloud uptime systems (Railway)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('KIRA-X-MD Online');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web interface checking online via Port ${PORT}`);
});

async function bootKiraSystem() {
    console.log("📥 Parsing structural plugins collection arrays...");
    await loadPlugins();
    global.commands = commands;

    // Trigger modular connection process
    await connect();
}

bootKiraSystem().catch(err => console.error("Fatal System Boot Crash Triggered:", err));
