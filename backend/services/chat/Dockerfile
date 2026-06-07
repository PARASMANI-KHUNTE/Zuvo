FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY services/chat/package*.json ./services/chat/
COPY shared/package*.json ./shared/

RUN npm install

COPY services/chat ./services/chat
COPY shared ./shared

EXPOSE 8007

CMD ["npm", "start", "-w", "services/chat"]
