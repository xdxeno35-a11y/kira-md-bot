const axios = require('axios');

module.exports = {
    name: 'fb',
    alias: ['facebook', 'fbdl'],
    category: 'downloader',
    description: 'Download Facebook videos',
    usage: `${process.env.PREFIX || '.'}fb <URL>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        let url = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.gg'))) {
            return await sock.sendMessage(jid, { text: "❌ *Please provide a valid Facebook URL!*" }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📥", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `📥 *Downloading Facebook video...*` });

        try {
            const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/fbdl?url=${encodeURIComponent(url)}`;
            const res = await axios.get(apiUrl);
            
            const apiData = res.data;
            let videoUrl = '';

            // നീ അയച്ച JSON ഫോർമാറ്റ് അനുസരിച്ചുള്ള കൃത്യമായ ചെക്കിംഗ്
            if (apiData.data) {
                if (Array.isArray(apiData.data) && apiData.data.length > 0) {
                    let first = apiData.data;
                    videoUrl = first.high || first.hd || first.url || first.video || first.low || first.sd;
                } else if (typeof apiData.data === 'object') {
                    // ഇവിടെയാണ് നിന്റെ API-യിലെ 'high' ലിങ്ക് എടുക്കുന്നത്
                    videoUrl = apiData.data.high || apiData.data.hd || apiData.data.url || apiData.data.video_hd || apiData.data.low || apiData.data.sd;
                }
            } else if (apiData.result) {
                videoUrl = apiData.result.high || apiData.result.hd || apiData.result.url;
            }

            if (!videoUrl) {
                console.log("FB API Response:", JSON.stringify(apiData, null, 2));
                throw new Error('Video link not found');
            }

            const { data: buffer } = await axios.get(videoUrl, { responseType: 'arraybuffer' });

            await sock.sendMessage(jid, { 
                video: buffer, 
                mimetype: 'video/mp4', 
                caption: '*🎌 KIRA X MD FACEBOOK DOWNLOADER 🎌*' 
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Facebook video sent*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error('FB Error:', err.message);
            await sock.sendMessage(jid, { text: `❌ *Failed to download!*`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};