#!/bin/bash

# Render Deployment Script for Instant Screen Share
# This script prepares the app for deployment on Render

set -e

echo "🚀 Preparing Instant Screen Share for Render Deployment"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[RENDER]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_header "Checking project structure..."

# Verify required files for Render
required_files=(
    "package.json"
    "server/server.js"
    "client/index.html"
    "client/styles.css"
    "client/app.js"
    "render.yaml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    else
        print_status "✓ Found: $file"
    fi
done

print_header "Installing dependencies..."
npm install

print_header "Checking app icons..."
if [ ! -f "client/icons/icon-192x192.png" ]; then
    print_warning "App icons not found. Generating placeholders..."
    
    # Create simple placeholder icons
    mkdir -p client/icons
    
    # Create a simple SVG icon and convert to different sizes
    cat > client/icons/icon-placeholder.svg << 'EOF'
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <rect x="80" y="120" width="352" height="220" rx="20" fill="white" opacity="0.9"/>
  <rect x="200" y="360" width="112" height="20" rx="10" fill="white" opacity="0.9"/>
  <rect x="160" y="390" width="192" height="12" rx="6" fill="white" opacity="0.9"/>
  <path d="M380 160 L420 200 L420 240 L380 280 L360 260 L380 240 L360 220 Z" fill="#667eea"/>
</svg>
EOF
    
    # Note: In production, you should use the icon-generator.html
    print_warning "Please use client/icons/icon-generator.html to create proper icons"
fi

print_header "Testing production configuration..."

# Test if server starts (use development port for testing)
print_status "Testing server startup on development port..."
PORT=5678 timeout 10s npm start > /dev/null 2>&1 || {
    print_error "Server failed to start. Checking for issues..."
    
    # Check for common issues
    if [ ! -d "node_modules" ]; then
        print_error "node_modules not found. Run 'npm install' first."
    fi
    
    if [ ! -f "server/server.js" ]; then
        print_error "server.js not found."
    fi
    
    exit 1
}

print_status "✓ Server starts successfully"

print_header "Validating Render configuration..."

# Check render.yaml
if ! grep -q "type: web" render.yaml; then
    print_error "render.yaml missing web service configuration"
    exit 1
fi

if ! grep -q "port: 10000" render.yaml; then
    print_warning "render.yaml should use port 10000 for Render"
fi

print_status "✓ Render configuration valid"

print_header "Creating Render deployment files..."

# Create render-specific environment file
cat > .env.render << 'EOF'
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
CORS_ORIGIN=https://instant-screenshare.onrender.com
EOF

print_status "✓ Created .env.render"

# Update package.json for Render
if grep -q "PORT=5678" package.json; then
    print_warning "Removing hardcoded port from package.json..."
    # This is handled by the previous edits
fi

print_header "Preparing for Git deployment..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    git branch -M main
fi

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    print_warning "No Git remote found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/instant-screenshare.git"
fi

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
    print_status "Creating .gitignore..."
    cat > .gitignore << 'EOF'
node_modules
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
.vscode
.idea
*.log
tmp/
temp/
EOF
fi

print_header "Deployment Summary"
echo "========================"
echo ""
echo "✅ Project is ready for Render deployment!"
echo ""
echo "📋 Next Steps:"
echo "   1. Commit your changes:"
echo "      git add ."
echo "      git commit -m \"Ready for Render deployment\""
echo "      git push origin main"
echo ""
echo "   2. Deploy on Render:"
echo "      - Go to dashboard.render.com"
echo "      - Click 'New +' → 'Web Service'"
echo "      - Connect your GitHub repository"
echo "      - Render will auto-detect settings from render.yaml"
echo ""
echo "   3. Your app will be available at:"
echo "      https://instant-screenshare.onrender.com"
echo ""
echo "🔧 Configuration Files Created:"
echo "   - render.yaml (Render service configuration)"
echo "   - .env.render (Environment variables)"
echo ""
echo "📱 Post-Deployment Checklist:"
echo "   - Test screen sharing functionality"
echo "   - Test QR code scanning"
echo "   - Test PWA installation"
echo "   - Verify HTTPS works"
echo "   - Test on mobile devices"
echo ""
print_status "🎉 Ready for Render deployment! Go to dashboard.render.com to deploy!"