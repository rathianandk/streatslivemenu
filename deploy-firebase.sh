#!/bin/bash

# sTrEATs Live - FREE Firebase Deployment
# Deploys to Firebase Hosting with short URLs like https://streatslive.web.app

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Project name suggestions
PROJECT_SUGGESTIONS=(
    "streatslive"
    "livestreats"
    "streatsgo"
    "foodtrucklive" 
    "streatstrack"
    "streatsmap"
    "streetfood"
    "foodietrack"
    "trucktracker"
    "streatsworld"
)

print_header() {
    echo -e "${PURPLE}"
    echo "🔥 sTrEATs Live - Firebase FREE Deployment"
    echo "=========================================="
    echo "Get a short URL like: https://streatslive.web.app"
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase >/dev/null 2>&1; then
        print_status "Installing Firebase CLI..."
        npm install -g firebase-tools
    fi
    print_success "Firebase CLI is ready"
}

# Create Firebase project
create_firebase_project() {
    echo -e "${YELLOW}Choose your Firebase project name (this will be your URL):${NC}"
    echo ""
    
    for i in "${!PROJECT_SUGGESTIONS[@]}"; do
        echo "$((i+1)). ${PROJECT_SUGGESTIONS[$i]} → https://${PROJECT_SUGGESTIONS[$i]}.web.app"
    done
    
    echo ""
    echo "11. Enter custom name"
    echo ""
    
    while true; do
        read -p "Enter your choice (1-11): " choice
        
        if [[ $choice =~ ^[1-9]$|^10$ ]]; then
            PROJECT_NAME="${PROJECT_SUGGESTIONS[$((choice-1))]}"
            break
        elif [[ $choice == "11" ]]; then
            read -p "Enter custom project name (lowercase, no spaces): " PROJECT_NAME
            if [[ $PROJECT_NAME =~ ^[a-z0-9-]+$ ]]; then
                break
            else
                echo "Invalid name. Use only lowercase letters, numbers, and hyphens."
            fi
        else
            echo "Invalid choice. Please enter 1-11."
        fi
    done
    
    print_success "Selected project name: $PROJECT_NAME"
    
    # Create the project
    print_status "Creating Firebase project..."
    firebase projects:create $PROJECT_NAME --display-name "sTrEATs Live"
    
    print_success "Firebase project created!"
}

# Initialize Firebase in the project
init_firebase() {
    print_status "Initializing Firebase..."
    
    # Login to Firebase
    firebase login --no-localhost
    
    # Initialize Firebase hosting
    firebase init hosting --project $PROJECT_NAME
    
    print_success "Firebase initialized"
}

# Build and deploy
deploy_to_firebase() {
    print_status "Building React application..."
    npm run build
    
    print_status "Deploying to Firebase Hosting..."
    firebase deploy --project $PROJECT_NAME
    
    print_success "Deployment completed!"
}

# Show results
show_results() {
    echo ""
    echo -e "${GREEN}🎉 Your sTrEATs Live app is now LIVE! 🎉${NC}"
    echo "=============================================="
    echo -e "${YELLOW}🌐 Live URL:${NC} https://$PROJECT_NAME.web.app"
    echo -e "${YELLOW}🔗 Alt URL:${NC} https://$PROJECT_NAME.firebaseapp.com"
    echo -e "${YELLOW}💰 Cost:${NC} FREE (10GB storage, 360MB/day transfer)"
    echo "=============================================="
    echo ""
    
    echo -e "${BLUE}📋 Firebase Features:${NC}"
    echo "• SSL Certificate: ✅ Automatic HTTPS"
    echo "• Global CDN: ✅ Fast worldwide access"
    echo "• Custom Domain: ✅ Add later if needed"
    echo "• Analytics: ✅ Built-in Google Analytics"
    echo ""
    
    echo -e "${PURPLE}🔧 Management Commands:${NC}"
    echo "• View console: firebase open hosting --project $PROJECT_NAME"
    echo "• Update app: firebase deploy --project $PROJECT_NAME"
    echo "• View logs: firebase functions:log --project $PROJECT_NAME"
    echo ""
    
    echo -e "${GREEN}🚀 Your short URL is ready to share!${NC}"
}

# Main function
main() {
    print_header
    check_firebase_cli
    create_firebase_project
    init_firebase
    deploy_to_firebase
    show_results
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
