// plugins/weather.js - KIRA X MD (4‑day forecast, no API key)
const axios = require('axios');

module.exports = {
    name: 'weather',
    alias: ['forecast', 'wthr'],
    category: 'utility',
    description: 'Get current + 3‑day weather forecast',
    usage: `${process.env.PREFIX || '.'}weather <city name>`,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const query = (args && Array.isArray(args) ? args.join(' ') : '').trim();

        if (!query) {
            await sock.sendMessage(jid, { text: `🌤️ *WEATHER FORECAST*\n\n❌ *Missing city name*\n➤ Example: ${process.env.PREFIX || '.'}weather London` }, { quoted: msg });
            return;
        }

        await sock.sendMessage(jid, { react: { text: "🌤️", key: msg.key } });
        const statusMsg = await sock.sendMessage(jid, { text: `🔍 *Fetching weather for* : ${query}...` });

        try {
            // 1. Geocoding – convert city name to coordinates
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`;
            const geoRes = await axios.get(geoUrl, { timeout: 10000 });
            if (!geoRes.data.results || geoRes.data.results.length === 0) {
                throw new Error('City not found');
            }
            const { latitude, longitude, name, country } = geoRes.data.results[0];

            // 2. Weather data – current + 3‑day forecast
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=auto&forecast_days=4`;
            const weatherRes = await axios.get(weatherUrl, { timeout: 10000 });
            const current = weatherRes.data.current_weather;
            const daily = weatherRes.data.daily;

            // Helper: map weather code to emoji & description
            const getWeatherEmoji = (code) => {
                const codes = {
                    0: '☀️ Clear sky',
                    1: '🌤️ Mainly clear',
                    2: '⛅ Partly cloudy',
                    3: '☁️ Overcast',
                    45: '🌫️ Foggy',
                    48: '🌫️ Foggy',
                    51: '🌦️ Light drizzle',
                    53: '🌦️ Moderate drizzle',
                    55: '🌧️ Dense drizzle',
                    61: '🌧️ Slight rain',
                    63: '🌧️ Moderate rain',
                    65: '🌧️ Heavy rain',
                    71: '🌨️ Slight snow',
                    73: '🌨️ Moderate snow',
                    75: '🌨️ Heavy snow',
                    80: '🌧️ Rain showers',
                    81: '🌧️ Rain showers',
                    82: '🌧️ Violent showers',
                    95: '⛈️ Thunderstorm',
                    96: '⛈️ Thunderstorm with hail',
                    99: '⛈️ Thunderstorm with hail'
                };
                return codes[code] || '🌡️ Unknown';
            };

            // Current weather
            const currentDesc = getWeatherEmoji(current.weathercode);
            const currentTemp = current.temperature;

            // Build forecast string for 4 days (today + next 3)
            const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4'];
            let forecastLines = '';
            for (let i = 0; i < daily.time.length; i++) {
                const date = new Date(daily.time[i]);
                const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
                const max = daily.temperature_2m_max[i];
                const min = daily.temperature_2m_min[i];
                const feelsMax = daily.apparent_temperature_max[i];
                const rain = daily.precipitation_sum[i] || 0;
                const wind = daily.windspeed_10m_max[i];
                const weatherDesc = getWeatherEmoji(daily.weathercode[i]);
                forecastLines += `\n*${dayName}* : ${weatherDesc}\n  🌡️ ${min}°C – ${max}°C (feels ${feelsMax}°C)\n  💧 Rain: ${rain}mm  🌬️ Wind: ${wind} km/h\n`;
            }

            const response = `🌍 *WEATHER FORECAST* 🌍
📍 *${name}, ${country}*

☀️ *Current* :
   ${currentDesc}
   🌡️ Temperature: ${currentTemp}°C

📅 *4‑Day Forecast* :
${forecastLines}

━━━━━━━━━━━━━━━━━━━
🔹 *KIRA X MD* 🔹`;

            await sock.sendMessage(jid, { text: response, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error('Weather error:', err);
            await sock.sendMessage(jid, { text: `❌ *Error* : ${err.message}`, edit: statusMsg.key });
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        }
    }
};