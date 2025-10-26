#!/bin/bash

set -e

echo "🔧 zamOS Development Script"
echo "==========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🗄️  Setting up database...${NC}"
# Create data directory if it doesn't exist
mkdir -p data

# Run migrations
echo -e "${BLUE}Running database migrations...${NC}"
npm run db:migrate

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}🚀 Starting development server...${NC}"
echo ""
echo "Development server will be available at: http://localhost:5173"
echo ""
echo "Useful commands:"
echo "  Database studio: npm run db:studio"
echo "  Generate migrations: npm run db:generate"
echo "  Run migrations: npm run db:migrate"
echo ""

# Start the dev server
npm run dev
