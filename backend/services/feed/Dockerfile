FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/feed/package*.json ./services/feed/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/feed ./services/feed
COPY shared ./shared

EXPOSE 8005

CMD ["npm", "start", "-w", "services/feed"]
