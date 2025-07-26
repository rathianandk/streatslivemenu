#!/bin/bash

# sTrEATs Live - FREE Deployment Chooser
# Choose between different free deployment options

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}"
    echo "🆓 sTrEATs Live - FREE Deployment Options"
    echo "========================================"
    echo "Choose your preferred free hosting platform"
    echo -e "${NC}"
}

show_options() {
    echo -e "${CYAN}Available FREE deployment options:${NC}"
    echo ""
    
    echo -e "${YELLOW}1. Google Cloud Run${NC} ⭐ RECOMMENDED"
    echo "   URL: https://streatslive-[hash]-uc.a.run.app"
    echo "   Features: Auto-scaling, 2M requests/month free"
    echo ""
    
    echo -e "${YELLOW}2. Firebase Hosting${NC} ⭐ SHORTEST URLs"
    echo "   URL: https://streatslive.web.app"
    echo "   Features: Global CDN, 10GB storage free"
    echo ""
    
    echo -e "${YELLOW}3. Current Google Cloud (existing)${NC}"
    echo "   URL: https://gen-lang-client-0811007768.uc.r.appspot.com"
    echo "   Features: Already deployed and working"
    echo ""
    
    echo -e "${YELLOW}4. Show all URL options${NC}"
    echo "   View all available creative URL names"
    echo ""
}

deploy_cloudrun() {
    echo -e "${GREEN}🚀 Deploying to Google Cloud Run...${NC}"
    ./deploy-free-cloudrun.sh
}

deploy_firebase() {
    echo -e "${GREEN}🔥 Deploying to Firebase Hosting...${NC}"
    ./deploy-firebase.sh
}

show_current_deployment() {
    echo -e "${GREEN}📍 Current Deployment Info:${NC}"
    echo "=============================================="
    echo "🌐 Live URL: https://gen-lang-client-0811007768.uc.r.appspot.com"
    echo "📱 Platform: Google App Engine"
    echo "🌍 Region: us-central1"
    echo "💰 Cost: FREE (within App Engine limits)"
    echo "=============================================="
    echo ""
    echo "Your app is already live and working!"
    echo "You can keep using this URL or deploy to a new one."
}

show_all_urls() {
    echo -e "${CYAN}🎨 Creative FREE URL Options:${NC}"
    echo ""
    
    echo -e "${YELLOW}Google Cloud Run URLs:${NC}"
    echo "• https://streatslive-abc123-uc.a.run.app"
    echo "• https://livestreats-def456-uc.a.run.app"
    echo "• https://streatsgo-ghi789-uc.a.run.app"
    echo "• https://foodtrucklive-jkl012-uc.a.run.app"
    echo "• https://streatstrack-mno345-uc.a.run.app"
    echo ""
    
    echo -e "${YELLOW}Firebase URLs:${NC}"
    echo "• https://streatslive.web.app"
    echo "• https://livestreats.web.app"
    echo "• https://streatsgo.web.app"
    echo "• https://foodtrucklive.web.app"
    echo "• https://streatstrack.web.app"
    echo ""
    
    echo "All of these are completely FREE! 🎉"
}

main() {
    print_header
    show_options
    
    while true; do
        read -p "Enter your choice (1-4): " choice
        
        case $choice in
            1)
                deploy_cloudrun
                break
                ;;
            2)
                deploy_firebase
                break
                ;;
            3)
                show_current_deployment
                break
                ;;
            4)
                show_all_urls
                echo ""
                ;;
            *)
                echo "Invalid choice. Please enter 1-4."
                ;;
        esac
    done
}

# Run main function
main "$@"
