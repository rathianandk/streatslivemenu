# sTrEATs Live - Custom Domain Deployment Options

## 🎯 Available Domain Names

Based on our availability check, here are the **AVAILABLE** domains perfect for your sTrEATs Live app:

### 🏆 **Recommended Options:**

1. **`streatslive.com`** ⭐ **BEST CHOICE**
   - Perfect match for your app name
   - Short, memorable, and brandable
   - Easy to spell and pronounce

2. **`livestreats.com`** ⭐ **EXCELLENT**
   - Emphasizes the "live" tracking feature
   - Great for marketing and SEO

3. **`foodtrucklive.com`** ⭐ **DESCRIPTIVE**
   - Clearly describes what the app does
   - Good for organic search traffic

### 🚀 **Other Great Options:**

- `streats-live.com` (with hyphen)
- `streeteatslive.com` (longer but descriptive)
- `streatstrack.com` (emphasizes tracking)
- `streatsgo.com` (short and catchy)
- `streatsmap.com` (emphasizes mapping)
- `streatsio.com` (modern .com alternative)

## 📋 **Deployment Steps**

### Step 1: Choose and Register Your Domain

1. Pick a domain from the available list above
2. Register it at [Google Domains](https://domains.google.com) or your preferred registrar
3. Cost: ~$12-15/year for .com domains

### Step 2: Update Configuration

Edit the domain in your deployment script:

```bash
# In deploy-production.sh, change this line:
CUSTOM_DOMAIN="streatslive.com"  # Replace with your chosen domain
```

### Step 3: Deploy to Production

```bash
# Run the comprehensive deployment script
./deploy-production.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Enable required Google Cloud APIs
- ✅ Build and deploy your React app
- ✅ Set up Cloud Run service
- ✅ Configure custom domain mapping
- ✅ Provide DNS configuration instructions

### Step 4: Configure DNS

After deployment, you'll get DNS records to add to your domain registrar:

```
Type    Name    Value
A       @       216.239.32.21
A       @       216.239.34.21
A       @       216.239.36.21
A       @       216.239.38.21
AAAA    @       2001:4860:4802:32::15
AAAA    @       2001:4860:4802:34::15
AAAA    @       2001:4860:4802:36::15
AAAA    @       2001:4860:4802:38::15
```

## 💰 **Cost Breakdown**

### Domain Registration:
- `.com` domain: ~$12-15/year
- `.app` domain: ~$20/year
- `.io` domain: ~$35/year

### Google Cloud Hosting:
- **Cloud Run**: Pay-per-request (very cost-effective)
  - Free tier: 2 million requests/month
  - After free tier: $0.40 per million requests
- **Cloud Build**: 120 build-minutes/day free
- **SSL Certificate**: Free (Google-managed)
- **Domain Mapping**: Free

**Estimated monthly cost for moderate traffic: $5-20**

## 🔧 **Alternative Deployment Methods**

### Option 1: Quick Deploy (Current)
```bash
./deploy-production.sh
```

### Option 2: Manual Cloud Build
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Option 3: GitHub Actions (Automated)
Set up continuous deployment from your GitHub repository.

## 🌟 **Production Features**

Your deployed app will include:

- ✅ **Custom Domain** (e.g., https://streatslive.com)
- ✅ **SSL/HTTPS** (automatic certificate)
- ✅ **Global CDN** (fast worldwide access)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **99.95% Uptime SLA**
- ✅ **DDoS Protection**
- ✅ **Real-time Food Truck Tracking**
- ✅ **Virtual Queue System**
- ✅ **Customer Notifications**
- ✅ **Vendor Dashboard**

## 🎯 **Recommended Next Steps**

1. **Choose Domain**: I recommend `streatslive.com` - it's perfect!
2. **Register Domain**: Go to [Google Domains](https://domains.google.com/registrar/search?searchTerm=streatslive.com)
3. **Deploy**: Run `./deploy-production.sh`
4. **Configure DNS**: Add the provided DNS records
5. **Test**: Your app will be live at your custom domain!

## 📞 **Support**

If you encounter any issues:

1. Check logs: `gcloud run services logs read streats-live --region=us-central1`
2. View services: `gcloud run services list`
3. Check domain status: `gcloud run domain-mappings list`

Your sTrEATs Live app will be production-ready with enterprise-grade infrastructure! 🚀
