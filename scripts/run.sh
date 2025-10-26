#!/bin/bash

set -e

echo "🚀 zamOS Deployment Script"
echo "=========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="zamos-dashboard"

echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker compose down

echo -e "${YELLOW}🗑️  Removing old images...${NC}"
docker rmi $APP_NAME 2>/dev/null || true

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npm run db:migrate

echo -e "${YELLOW}🔨 Building new image...${NC}"
docker compose build --no-cache

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker compose up -d

echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 3

echo -e "${YELLOW}🧹 Cleaning up unused images...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Dashboard is running at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:    docker compose logs -f"
echo "  Stop:         docker compose down"
echo "  Restart:      docker compose restart"
echo "  Status:       docker compose ps"
echo "  DB Studio:    npm run db:studio"
echo ""
