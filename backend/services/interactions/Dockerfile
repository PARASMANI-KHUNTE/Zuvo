FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/interactions/package*.json ./services/interactions/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/interactions ./services/interactions
COPY shared ./shared

EXPOSE 8002

CMD ["npm", "start", "-w", "services/interactions"]
