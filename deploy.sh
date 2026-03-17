#!/bin/bash

# Instant Screen Share Deployment Script
# This script helps prepare and deploy the application to production

set -e

echo "🚀 Instant Screen Share Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Starting deployment preparation..."

# Step 1: Install dependencies
print_status "Installing dependencies..."
npm install

# Step 2: Check if icons exist
print_status "Checking app icons..."
if [ ! -f "client/icons/icon-192x192.png" ]; then
    print_warning "App icons not found. Please generate them first:"
    echo "   1. Open client/icons/icon-generator.html in your browser"
    echo "   2. Click 'Generate Icons' and download all icons"
    echo "   3. Place them in client/icons/ directory"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Run tests
print_status "Running basic tests..."
npm test

# Step 4: Check environment variables
print_status "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example .env
    print_warning "Please update .env file with your production values"
fi

# Step 5: Git check
print_status "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes:"
    git status --short
    read -p "Commit these changes before deployment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Prepare for deployment - $(date)"
        print_status "Changes committed"
    fi
else
    print_status "No uncommitted changes found"
fi

# Step 6: Build check
print_status "Running build check..."
npm run build

# Step 7: Production readiness check
print_status "Checking production readiness..."

# Check if server starts properly
print_status "Testing server startup..."
timeout 10s npm start > /dev/null 2>&1 || {
    print_error "Server failed to start properly"
    exit 1
}
print_status "Server starts successfully"

# Step 8: Create deployment info
print_status "Creating deployment information..."
cat > DEPLOYMENT_INFO.txt << EOF
Instant Screen Share Deployment Information
========================================
Deployment Date: $(date)
Git Commit: $(git rev-parse HEAD)
Node Version: $(node --version)
NPM Version: $(npm --version)

Environment Variables Needed:
- NODE_ENV=production
- PORT=10000 (for Render)
- HOST=0.0.0.0
- CORS_ORIGIN=https://your-app-name.onrender.com

Deployment Steps:
1. Push code to GitHub
2. Create Render Web Service
3. Set environment variables
4. Deploy and test

Post-Deployment Checklist:
- Test screen sharing functionality
- Test QR code scanning
- Test PWA installation
- Verify HTTPS works
- Test on mobile devices
EOF

print_status "Deployment preparation complete!"
echo
echo "📋 Next Steps:"
echo "   1. Push your code to GitHub:"
echo "      git push origin main"
echo "   2. Go to dashboard.render.com"
echo "   3. Create new Web Service"
echo "   4. Connect your GitHub repository"
echo "   5. Set environment variables (see DEPLOYMENT_INFO.txt)"
echo "   6. Deploy!"
echo
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo "🔧 Configuration saved to DEPLOYMENT_INFO.txt"
echo
print_status "Ready for deployment! 🎉"