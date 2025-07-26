#!/bin/bash

# Domain Availability Checker for sTrEATs Live
# Checks availability of potential domain names

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[CHECKING]${NC} $1"
}

print_available() {
    echo -e "${GREEN}[AVAILABLE]${NC} $1"
}

print_taken() {
    echo -e "${RED}[TAKEN]${NC} $1"
}

# Function to check domain availability using whois
check_domain() {
    local domain=$1
    print_status "Checking $domain..."
    
    # Use whois to check domain availability
    if command -v whois >/dev/null 2>&1; then
        result=$(whois $domain 2>/dev/null | grep -i "no match\|not found\|no entries found\|status: available")
        if [ -n "$result" ]; then
            print_available "$domain - Available for registration!"
            echo "  💰 Register at: https://domains.google.com/registrar/search?searchTerm=$domain"
        else
            print_taken "$domain - Already registered"
        fi
    else
        echo "  ⚠️  whois command not found. Please check manually at: https://domains.google.com/registrar/search?searchTerm=$domain"
    fi
    echo ""
}

echo "🔍 Checking Domain Availability for sTrEATs Live"
echo "================================================"
echo ""

# List of potential domain names
domains=(
    "streatslive.com"
    "streats-live.com" 
    "streeteatslive.com"
    "streatsapp.com"
    "foodtrucklive.com"
    "streatstrack.com"
    "livestreats.com"
    "streatsgo.com"
    "mystreats.com"
    "streatsmap.com"
    "streatslocator.com"
    "streatsworld.com"
    "streatszone.com"
    "streatsnet.com"
    "streatsio.com"
)

echo "Checking availability for ${#domains[@]} domain names..."
echo ""

for domain in "${domains[@]}"; do
    check_domain "$domain"
done

echo "================================================"
echo "💡 Tips for choosing a domain:"
echo "1. Keep it short and memorable"
echo "2. Avoid hyphens if possible"
echo "3. Consider .com, .app, or .io extensions"
echo "4. Make sure it's easy to spell and pronounce"
echo ""
echo "🌐 Alternative extensions to consider:"
echo "- .app (great for mobile apps)"
echo "- .io (popular with tech companies)"
echo "- .co (short and modern)"
echo "- .live (perfect for live tracking)"
echo ""
echo "📝 Once you choose a domain:"
echo "1. Register it at Google Domains or your preferred registrar"
echo "2. Update the CUSTOM_DOMAIN variable in deploy-production.sh"
echo "3. Run ./deploy-production.sh to deploy with your custom domain"
