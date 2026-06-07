FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/search/package*.json ./services/search/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/search ./services/search
COPY shared ./shared

EXPOSE 8006

CMD ["npm", "start", "-w", "services/search"]
