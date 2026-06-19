FROM node:20-alpine

# ആവശ്യമായ സിസ്റ്റം ടൂളുകളും ലൈബ്രറികളും ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    build-base \
    vips-dev \
    fftw-dev \
    gcc \
    g++ \
    make \
    libc6-compat \
    git

# yt-dlp ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN pip3 install yt-dlp --break-system-packages

# പപ്പറ്റീർ/ക്രോമിയം ഡിപെൻഡൻസികൾക്കായി എക്സ്ട്രാ സെറ്റിംഗ്സ് (ആവശ്യമെങ്കിൽ)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=8080

WORKDIR /home/container

COPY package*.json ./

# ഡിപെൻഡൻസികൾ ക്ലീൻ ആയി ഇൻസ്റ്റാൾ ചെയ്യാൻ ഓപ്ഷനുകൾ മാറ്റുന്നു
RUN npm install --legacy-peer-deps || npm install

COPY . .

# പോർട്ട് എക്സ്പോസ് ചെയ്യുന്നു (Railway/Render ആപ്പുകൾക്ക് ഇത് ആവശ്യമാണ്)
EXPOSE 8080

CMD ["node", "index.js"]
