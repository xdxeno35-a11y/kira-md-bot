const fs = require("fs");
const path = require("path");

module.exports = {
    name: "remove",
    alias: ["delplugin"],
    category: "owner",

    async execute(sock,msg,args){

        const jid = msg.key.remoteJid;

        const name = args[0];

        if(!name){
            return sock.sendMessage(jid,{
                text:"❌ Give plugin name"
            });
        }

        const file =
            path.join(
                __dirname,
                `${name}.js`
            );

        if(!fs.existsSync(file)){
            return sock.sendMessage(jid,{
                text:"❌ Plugin not found"
            });
        }

        fs.unlinkSync(file);

        const index =
            global.commands.findIndex(
                c => c.name === name
            );

        if(index !== -1){
            global.commands.splice(index,1);
        }

        await sock.sendMessage(jid,{
            text:`🗑️ Removed ${name}`
        });
    }
};