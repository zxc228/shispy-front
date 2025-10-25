#!/bin/bash

# Shispy Deploy Script
# Этот скрипт автоматизирует деплой приложения на сервер

set -e  # Exit on error

echo "🚀 Starting Shispy deployment..."

# Configuration
SERVER_USER="your-user"
SERVER_HOST="your-server-ip"
DEPLOY_PATH="/var/www/shispy"
COMPOSE_FILE="docker-compose.yml"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Docker images locally (optional)
echo -e "${BLUE}📦 Building Docker images...${NC}"
# docker-compose build

# Step 2: Copy files to server
echo -e "${BLUE}📤 Copying files to server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${DEPLOY_PATH}"
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  ./ ${SERVER_USER}@${SERVER_HOST}:${DEPLOY_PATH}/

# Step 3: Deploy on server
echo -e "${BLUE}🔄 Deploying on server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << EOF
  cd ${DEPLOY_PATH}
  
  # Pull latest changes (if using Git)
  # git pull origin main
  
  # Build and start containers
  docker-compose down
  docker-compose build
  docker-compose up -d
  
  # Show status
  docker-compose ps
EOF

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Frontend: http://${SERVER_HOST}${NC}"
echo -e "${BLUE}🎮 Game Server: ws://${SERVER_HOST}:3001${NC}"
