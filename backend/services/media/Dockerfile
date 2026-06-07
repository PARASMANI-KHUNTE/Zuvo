FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/media/package*.json ./services/media/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/media ./services/media
COPY shared ./shared

EXPOSE 8003

CMD ["npm", "start", "-w", "services/media"]
