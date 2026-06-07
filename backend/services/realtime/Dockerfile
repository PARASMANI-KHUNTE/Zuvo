FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/realtime/package*.json ./services/realtime/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/realtime ./services/realtime
COPY shared ./shared

EXPOSE 8004

CMD ["npm", "start", "-w", "services/realtime"]
