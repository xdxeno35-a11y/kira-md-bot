FROM node:23-alpine

RUN apk add --no-cache python3 py3-pip ffmpeg && pip3 install yt-dlp --break-system-packages

WORKDIR /home/container

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]