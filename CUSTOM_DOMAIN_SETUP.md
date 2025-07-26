# Custom Domain Setup for sTrEATs Live

This guide will help you deploy sTrEATs Live to a custom domain like `streatslive.com` on Google Cloud Platform.

## Prerequisites

1. **Domain Registration**: You need to own the domain (e.g., `streatslive.com`)
2. **Google Cloud Project**: Active GCP project with billing enabled
3. **Required APIs**: Cloud Run API, Cloud Build API, and Domain Mapping API enabled

## Step 1: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable domains.googleapis.com
```

## Step 2: Configure Your Project

1. Edit `deploy-custom-domain.sh` and replace:
   - `your-gcp-project-id` with your actual GCP project ID
   - `streatslive.com` with your actual domain name

## Step 3: Deploy to Custom Domain

```bash
# Make the script executable
chmod +x deploy-custom-domain.sh

# Run the deployment
./deploy-custom-domain.sh
```

## Step 4: Configure DNS Records

After deployment, get the required DNS records:

```bash
gcloud run domain-mappings describe streatslive.com --region=us-central1
```

This will show you the DNS records to add to your domain registrar:

1. **A Record**: Points to Google's IP addresses
2. **AAAA Record**: Points to Google's IPv6 addresses
3. **CNAME Record**: For www subdomain (optional)

## Step 5: Verify Domain Ownership

Google Cloud will automatically verify domain ownership and provision SSL certificates.

## Alternative Domains Available

If `streatslive.com` is not available, consider these alternatives:

- `streats-live.com`
- `streeteatslive.com`
- `streatsapp.com`
- `foodtrucklive.com`
- `streatstrack.com`

## Monitoring and Management

### Check deployment status:
```bash
gcloud run services list --region=us-central1
```

### Check domain mapping status:
```bash
gcloud run domain-mappings list --region=us-central1
```

### View logs:
```bash
gcloud run services logs read streats-live --region=us-central1
```

### Update deployment:
```bash
# Rebuild and redeploy
gcloud builds submit --tag gcr.io/PROJECT_ID/streats-live:latest
gcloud run deploy streats-live --image gcr.io/PROJECT_ID/streats-live:latest --region=us-central1
```

## Cost Considerations

- **Cloud Run**: Pay per request (very cost-effective for moderate traffic)
- **Cloud Build**: Free tier includes 120 build-minutes per day
- **Domain Mapping**: No additional cost
- **SSL Certificates**: Free with Google-managed certificates

## Troubleshooting

### Domain verification issues:
```bash
# Check domain mapping status
gcloud run domain-mappings describe DOMAIN --region=us-central1

# Delete and recreate if needed
gcloud run domain-mappings delete DOMAIN --region=us-central1
```

### SSL certificate issues:
- SSL certificates can take up to 24 hours to provision
- Ensure DNS records are correctly configured
- Check that domain is accessible via HTTP first

## Security Features

- **HTTPS Only**: Automatic SSL/TLS encryption
- **Google Cloud Armor**: DDoS protection included
- **IAM Integration**: Fine-grained access control
- **VPC Integration**: Optional private networking

Your sTrEATs Live app will be production-ready with enterprise-grade security and scalability!
