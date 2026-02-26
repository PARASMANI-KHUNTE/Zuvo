FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace package.jsons
COPY package*.json ./
COPY services/blog/package*.json ./services/blog/
COPY shared/package*.json ./shared/

# Install root and workspace dependencies
RUN npm install

# Copy source code
COPY services/blog ./services/blog
COPY shared ./shared

EXPOSE 8001

CMD ["npm", "start", "-w", "services/blog"]
