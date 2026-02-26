FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY gateway/package*.json ./gateway/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY gateway ./gateway

EXPOSE 5000

CMD ["npm", "start", "-w", "gateway"]
