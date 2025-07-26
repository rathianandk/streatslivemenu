#!/bin/bash

# sTrEATs Live - Custom Domain Deployment Script
# This script deploys the app to Google Cloud Run with a custom domain

set -e

# Configuration
PROJECT_ID="your-gcp-project-id"  # Replace with your actual project ID
SERVICE_NAME="streats-live"
REGION="us-central1"
DOMAIN="streatslive.com"  # Replace with your actual domain
BUILD_ID=$(date +%Y%m%d%H%M%S)

echo "🚀 Deploying sTrEATs Live to custom domain: $DOMAIN"

# Step 1: Build and push the container
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:$BUILD_ID

# Step 2: Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$BUILD_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDdiy1hXAg5BI4XWCleJxa_S2cssiWHxyQ \
  --set-env-vars NODE_ENV=production

# Step 3: Map custom domain
echo "🔗 Mapping custom domain..."
gcloud run domain-mappings create \
  --service $SERVICE_NAME \
  --domain $DOMAIN \
  --region $REGION

echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Add these DNS records to your domain registrar:"
echo "   - Get the DNS records with: gcloud run domain-mappings describe $DOMAIN --region=$REGION"
echo "2. SSL certificate will be automatically provisioned"
echo "3. Your app will be available at: https://$DOMAIN"
echo ""
echo "🔍 Check status with:"
echo "   gcloud run domain-mappings list --region=$REGION"
