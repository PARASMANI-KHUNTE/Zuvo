FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/auth/package*.json ./services/auth/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/auth ./services/auth
COPY shared ./shared

EXPOSE 8000

CMD ["npm", "start", "-w", "services/auth"]
