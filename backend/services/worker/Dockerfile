FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/worker/package*.json ./services/worker/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/worker ./services/worker
COPY shared ./shared

CMD ["npm", "start", "-w", "services/worker"]
