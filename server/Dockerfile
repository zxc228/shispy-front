FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose Socket.IO port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
