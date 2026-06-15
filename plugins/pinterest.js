const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'pinterest',
    alias: ['pin', 'pindl', 'pinsearch'],
    category: 'downloader',
    description: 'Download or Search Pinterest media',
    usage: `${process.env.PREFIX || '.'}pinterest <URL or Query>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const input = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!input) {
            return await sock.sendMessage(jid, { 
                text: `❌ *What do you want from Pinterest?*\n\n📥 *To Download:* .pin <Pinterest Link>\n🔍 *To Search:* .pin anime wallpaper` 
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: "📌", key: msg.key } });

        const isUrl = input.match(/(https?:\/\/(www\.)?(pinterest\.com|pin\.it)\/[^\s]+)/gi);

        if (isUrl) {
            const url = isUrl[0];
            let filePath = '';
            let success = false;

            try {
                const apis = [
                    `https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`,
                    `https://api.ryzendesu.vip/api/downloader/pinterest?url=${encodeURIComponent(url)}`,
                    `https://api-aswin-sparky.koyeb.app/api/downloader/pinterest?url=${encodeURIComponent(url)}`,
                    `https://jerrycoder.oggyapi.workers.dev/down/pinterest?url=${encodeURIComponent(url)}`
                ];

                for (let i = 0; i < apis.length; i++) {
                    let mediaUrl = '';
                    let isVideo = false;

                    try {
                        const res = await axios.get(apis[i], { timeout: 6000 });
                        const data = res.data;

                        if (data.data && data.data.url) mediaUrl = data.data.url;
                        else if (data.url) mediaUrl = data.url;
                        else if (data.result && data.result.url) mediaUrl = data.result.url;

                        if (!mediaUrl) continue;

                        if (mediaUrl.includes('pincdn.app') && i < apis.length - 1) {
                            continue; 
                        }

                        isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || (data.result && data.result.type === 'video');

                        const tempDir = path.join(__dirname, '../temp');
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                        const fileName = `pin_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
                        filePath = path.join(tempDir, fileName);

                        const writer = fs.createWriteStream(filePath);
                        const mediaRes = await axios({
                            url: mediaUrl,
                            method: 'GET',
                            responseType: 'stream',
                            maxRedirects: 5,
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                        });

                        mediaRes.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        const stats = fs.statSync(filePath);
                        
                        if (stats.size < 10000) {
                            fs.unlinkSync(filePath);
                            throw new Error("File is corrupted or too small.");
                        }

                        if (isVideo) {
                            await sock.sendMessage(jid, { 
                                video: { url: filePath }, 
                                mimetype: 'video/mp4',
                                caption: '📌 *KIRA X MD PINTEREST*' 
                            }, { quoted: msg });
                        } else {
                            await sock.sendMessage(jid, { 
                                image: { url: filePath }, 
                                mimetype: 'image/jpeg',
                                caption: '📌 *KIRA X MD PINTEREST*' 
                            }, { quoted: msg });
                        }

                        success = true;
                        break; 

                    } catch (e) {
                        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    }
                }

                if (!success) throw new Error("Could not download a playable video from any server.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest DL Error:", err.message); // എറർ മാത്രം കാണിക്കും
                await sock.sendMessage(jid, { text: `❌ *Download failed:* ${err.message}` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }

        } else {
            try {
                const searchUrl = `https://jerrycoder.oggyapi.workers.dev/search/pin?q=${encodeURIComponent(input)}&type=image&limit=5`;
                const res = await axios.get(searchUrl);
                
                let results = [];
                if (res.data.result && Array.isArray(res.data.result)) results = res.data.result;
                else if (res.data.data && Array.isArray(res.data.data)) results = res.data.data;
                else if (Array.isArray(res.data)) results = res.data;

                if (results.length === 0) throw new Error("No pins found for your search.");

                results = results.slice(0, 5);
                await sock.sendMessage(jid, { text: `📥 *Downloading ${results.length} pins for:* ${input}` });

                let sentCount = 0;

                for (const item of results) {
                    const imgUrl = typeof item === 'string' ? item : (item.image || item.url || item.media_url);
                    if (imgUrl) {
                        try {
                            const imgRes = await axios.get(imgUrl, {
                                responseType: 'arraybuffer',
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                            });
                            
                            await sock.sendMessage(jid, { 
                                image: Buffer.from(imgRes.data), 
                                mimetype: 'image/jpeg',
                                caption: `📌 *KIRA X MD*` 
                            });
                            sentCount++;
                        } catch (e) {}
                    }
                }
                
                if (sentCount === 0) throw new Error("Failed to bypass Pinterest block for all images.");
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Pinterest Search Error:", err.message); // എറർ മാത്രം കാണിക്കും
                await sock.sendMessage(jid, { text: `❌ *Search failed:* ${err.message}` }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            }
        }
    }
};