# Multi-stage build for React Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build static files
RUN npm run build

# Production stage - serve static files with simple http server
FROM node:20-alpine

WORKDIR /app

# Install serve package to serve static files
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Serve static files
CMD ["serve", "-s", "dist", "-l", "5000"]
