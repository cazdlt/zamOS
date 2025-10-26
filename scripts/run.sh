#!/bin/bash

set -e

echo "🚀 zamOS Deployment Script"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="zamos-dashboard"
COMPOSE_FILE="docker-compose.yml"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Use appropriate docker-compose command
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main || git pull origin master || echo "Not a git repository or unable to pull"

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DOCKER_COMPOSE down || echo "No containers to stop"

echo -e "${YELLOW}🗑️  Removing old images...${NC}"
docker rmi $APP_NAME 2>/dev/null || echo "No old image to remove"

echo -e "${YELLOW}🔨 Building new image...${NC}"
$DOCKER_COMPOSE build --no-cache

echo -e "${YELLOW}🚀 Starting containers...${NC}"
$DOCKER_COMPOSE up -d

echo -e "${YELLOW}🧹 Cleaning up unused images...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Dashboard is running at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:    $DOCKER_COMPOSE logs -f"
echo "  Stop:         $DOCKER_COMPOSE down"
echo "  Restart:      $DOCKER_COMPOSE restart"
echo "  Status:       $DOCKER_COMPOSE ps"
