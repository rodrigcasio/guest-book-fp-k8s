FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

COPY public ./public/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3000

CMD ["node", "server.js"]
