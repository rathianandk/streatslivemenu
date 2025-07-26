#!/bin/bash

# sTrEATs Live - Production Deployment Script
# Deploys to Google Cloud Run with custom domain support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""  # Will be detected automatically
SERVICE_NAME="streats-live"
REGION="us-central1"
CUSTOM_DOMAIN="streatslive.com"  # Change this to your desired domain

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists gcloud; then
        print_error "Google Cloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Get current project ID
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No active Google Cloud project found. Please run 'gcloud config set project PROJECT_ID'"
        exit 1
    fi
    
    print_success "Prerequisites check passed. Using project: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable run.googleapis.com --quiet
    gcloud services enable cloudbuild.googleapis.com --quiet
    gcloud services enable domains.googleapis.com --quiet
    
    print_success "APIs enabled successfully"
}

# Build and deploy the application
deploy_app() {
    print_status "Building and deploying sTrEATs Live..."
    
    # Build the React app first
    print_status "Building React application..."
    npm run build
    
    # Deploy using Cloud Build
    print_status "Deploying to Cloud Run..."
    gcloud builds submit --config cloudbuild.yaml \
        --substitutions _CUSTOM_DOMAIN=$CUSTOM_DOMAIN,_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION
    
    print_success "Application deployed successfully"
}

# Get the Cloud Run service URL
get_service_url() {
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    print_success "Service is running at: $SERVICE_URL"
}

# Setup custom domain
setup_custom_domain() {
    print_status "Setting up custom domain: $CUSTOM_DOMAIN"
    
    # Check if domain mapping already exists
    if gcloud run domain-mappings describe $CUSTOM_DOMAIN --region=$REGION >/dev/null 2>&1; then
        print_warning "Domain mapping already exists for $CUSTOM_DOMAIN"
    else
        print_status "Creating domain mapping..."
        gcloud run domain-mappings create \
            --service $SERVICE_NAME \
            --domain $CUSTOM_DOMAIN \
            --region $REGION
        
        print_success "Domain mapping created"
    fi
    
    # Get DNS records
    print_status "Getting DNS configuration..."
    echo ""
    echo "=========================================="
    echo "DNS CONFIGURATION REQUIRED"
    echo "=========================================="
    echo "Add these records to your domain registrar:"
    echo ""
    
    gcloud run domain-mappings describe $CUSTOM_DOMAIN --region=$REGION \
        --format="table(status.resourceRecords[].name,status.resourceRecords[].type,status.resourceRecords[].rrdata)"
    
    echo ""
    echo "=========================================="
    echo "IMPORTANT NOTES:"
    echo "1. DNS propagation can take up to 48 hours"
    echo "2. SSL certificate will be automatically provisioned after DNS is configured"
    echo "3. Your app will be available at: https://$CUSTOM_DOMAIN"
    echo "=========================================="
}

# Check domain status
check_domain_status() {
    print_status "Checking domain mapping status..."
    
    STATUS=$(gcloud run domain-mappings describe $CUSTOM_DOMAIN --region=$REGION --format="value(status.conditions[0].type)")
    
    case $STATUS in
        "Ready")
            print_success "Domain is ready! Your app is live at: https://$CUSTOM_DOMAIN"
            ;;
        "CertificateProvisioning")
            print_warning "SSL certificate is being provisioned. This can take up to 24 hours."
            ;;
        "DomainClaimsPending")
            print_warning "Domain ownership verification is pending. Please check your DNS records."
            ;;
        *)
            print_warning "Domain status: $STATUS"
            ;;
    esac
}

# Main deployment flow
main() {
    echo "🚀 sTrEATs Live - Production Deployment"
    echo "========================================"
    echo ""
    
    check_prerequisites
    enable_apis
    deploy_app
    get_service_url
    
    echo ""
    read -p "Do you want to set up custom domain ($CUSTOM_DOMAIN)? [y/N]: " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_custom_domain
        check_domain_status
    else
        print_success "Deployment complete! Your app is running at: $SERVICE_URL"
    fi
    
    echo ""
    print_success "Deployment completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Test your application at the provided URL"
    echo "2. If using custom domain, configure DNS records as shown above"
    echo "3. Monitor your application: gcloud run services logs read $SERVICE_NAME --region=$REGION"
    echo ""
    echo "🔧 Management Commands:"
    echo "- View services: gcloud run services list --region=$REGION"
    echo "- View domain mappings: gcloud run domain-mappings list --region=$REGION"
    echo "- Update deployment: ./deploy-production.sh"
}

# Run main function
main "$@"
