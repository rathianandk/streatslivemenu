#!/bin/bash

# sTrEATs Live - FREE Google Cloud Run Deployment
# Deploys to a creative free URL on Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Creative service name options (user can choose)
SERVICE_OPTIONS=(
    "streatslive"
    "livestreats" 
    "streatsgo"
    "foodtrucklive"
    "streatstrack"
    "streatsmap"
    "streetfood"
    "trucktracker"
    "streatsworld"
    "foodietrack"
)

print_header() {
    echo -e "${PURPLE}"
    echo "🚀 sTrEATs Live - FREE Google Cloud Deployment"
    echo "=============================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to select service name
select_service_name() {
    echo -e "${YELLOW}Choose your service name for the free URL:${NC}"
    echo ""
    
    for i in "${!SERVICE_OPTIONS[@]}"; do
        echo "$((i+1)). ${SERVICE_OPTIONS[$i]} → https://${SERVICE_OPTIONS[$i]}-[hash]-uc.a.run.app"
    done
    
    echo ""
    echo "11. Enter custom name"
    echo ""
    
    while true; do
        read -p "Enter your choice (1-11): " choice
        
        if [[ $choice =~ ^[1-9]$|^10$ ]]; then
            SERVICE_NAME="${SERVICE_OPTIONS[$((choice-1))]}"
            break
        elif [[ $choice == "11" ]]; then
            read -p "Enter custom service name (lowercase, no spaces): " SERVICE_NAME
            # Validate service name
            if [[ $SERVICE_NAME =~ ^[a-z0-9-]+$ ]]; then
                break
            else
                print_error "Invalid name. Use only lowercase letters, numbers, and hyphens."
            fi
        else
            print_error "Invalid choice. Please enter 1-11."
        fi
    done
    
    print_success "Selected service name: $SERVICE_NAME"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v gcloud >/dev/null 2>&1; then
        print_error "Google Cloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Get current project ID
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No active Google Cloud project found. Please run 'gcloud config set project PROJECT_ID'"
        exit 1
    fi
    
    print_success "Using project: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable run.googleapis.com --quiet
    gcloud services enable cloudbuild.googleapis.com --quiet
    
    print_success "APIs enabled successfully"
}

# Build and deploy
deploy_to_cloudrun() {
    print_status "Building React application..."
    npm run build
    
    print_status "Deploying to Google Cloud Run..."
    
    # Deploy using gcloud run deploy directly
    gcloud run deploy $SERVICE_NAME \
        --source . \
        --region us-central1 \
        --platform managed \
        --allow-unauthenticated \
        --port 8080 \
        --set-env-vars "NODE_ENV=production,REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDdiy1hXAg5BI4XWCleJxa_S2cssiWHxyQ" \
        --memory 1Gi \
        --cpu 1 \
        --max-instances 10 \
        --min-instances 0 \
        --quiet
    
    print_success "Deployment completed!"
}

# Get service URL
get_service_info() {
    print_status "Getting service information..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=us-central1 --format="value(status.url)")
    
    echo ""
    echo -e "${GREEN}🎉 Your sTrEATs Live app is now LIVE! 🎉${NC}"
    echo "=============================================="
    echo -e "${YELLOW}🌐 Live URL:${NC} $SERVICE_URL"
    echo -e "${YELLOW}📱 Service:${NC} $SERVICE_NAME"
    echo -e "${YELLOW}🌍 Region:${NC} us-central1"
    echo -e "${YELLOW}💰 Cost:${NC} FREE (within generous limits)"
    echo "=============================================="
    echo ""
    
    echo -e "${BLUE}📋 Service Details:${NC}"
    echo "• SSL Certificate: ✅ Automatic HTTPS"
    echo "• Global CDN: ✅ Fast worldwide access"
    echo "• Auto-scaling: ✅ Handles traffic spikes"
    echo "• Free Tier: ✅ 2M requests/month"
    echo ""
    
    echo -e "${PURPLE}🔧 Management Commands:${NC}"
    echo "• View logs: gcloud run services logs read $SERVICE_NAME --region=us-central1"
    echo "• Update app: ./deploy-free-cloudrun.sh"
    echo "• Delete service: gcloud run services delete $SERVICE_NAME --region=us-central1"
    echo ""
    
    echo -e "${GREEN}🚀 Ready to share your app with the world!${NC}"
}

# Main function
main() {
    print_header
    check_prerequisites
    select_service_name
    enable_apis
    deploy_to_cloudrun
    get_service_info
}

# Run main function
main "$@"
