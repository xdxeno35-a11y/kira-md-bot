# ആൽപൈന് പകരം കൂടുതൽ സ്റ്റേബിൾ ആയ ഡെബിയൻ ബുൾസ്ഐ ഇമേജ് ഉപയോഗിക്കുന്നു
FROM node:20-bullseye-slim

# ആവശ്യമായ ടൂളുകളും സിസ്റ്റം ഡിപെൻഡൻസികളും ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    ffmpeg \
    curl \
    git \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp ഇൻസ്റ്റാൾ ചെയ്യുന്നു (ഡെബിയൻ സ്റ്റൈലിൽ)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# PM2 ഗ്ലോബൽ ഇൻസ്റ്റലേഷൻ
RUN npm install -g pm2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=8080

WORKDIR /home/container

COPY package*.json ./

# ഡിപെൻഡൻസികൾ ക്ലീൻ ആയി ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 8080

# pm2-runtime ഉപയോഗിച്ച് ബോട്ട് സ്റ്റാർട്ട് ചെയ്യുന്നു
CMD ["pm2-runtime", "index.js", "--name", "kira-x-md"]
