#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DISTRIBUTION_ID="E1Y04VU46FMFU"
DOMAIN="personapass.xyz"

echo -e "${YELLOW}🌐 Setting up custom domain for PersonaPass...${NC}"

# Step 1: Request SSL certificate
echo -e "${YELLOW}🔐 Requesting SSL certificate for $DOMAIN...${NC}"
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --subject-alternative-names "www.$DOMAIN" \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

echo -e "${GREEN}✅ Certificate requested: $CERT_ARN${NC}"

# Step 2: Get validation records
echo -e "${YELLOW}📋 Getting DNS validation records...${NC}"
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table

echo -e "${YELLOW}📝 MANUAL STEP REQUIRED:${NC}"
echo -e "${RED}You need to add these DNS records to your domain registrar:${NC}"
echo -e "${YELLOW}1. Go to your domain registrar (GoDaddy, Namecheap, etc.)${NC}"
echo -e "${YELLOW}2. Add the CNAME records shown above${NC}"
echo -e "${YELLOW}3. Wait for DNS propagation (5-10 minutes)${NC}"
echo -e "${YELLOW}4. Certificate will be auto-validated${NC}"

echo -e "${GREEN}🎯 After certificate is validated, run: ./update-cloudfront-domain.sh${NC}"

# Create the next script
cat > update-cloudfront-domain.sh << 'EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DISTRIBUTION_ID="E1Y04VU46FMFU"
DOMAIN="personapass.xyz"
CERT_ARN="$1"

if [ -z "$CERT_ARN" ]; then
    echo -e "${RED}❌ Please provide certificate ARN as argument${NC}"
    echo -e "${YELLOW}Usage: ./update-cloudfront-domain.sh <CERTIFICATE_ARN>${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Updating CloudFront distribution with custom domain...${NC}"

# Get current distribution config
aws cloudfront get-distribution-config \
  --id $DISTRIBUTION_ID \
  --query 'DistributionConfig' > current-config.json

# Update config with custom domain and certificate
cat current-config.json | jq --arg cert "$CERT_ARN" --arg domain "$DOMAIN" '
.Aliases.Quantity = 2 |
.Aliases.Items = ["'$DOMAIN'", "www.'$DOMAIN'"] |
.ViewerCertificate = {
  "ACMCertificateArn": $cert,
  "SSLSupportMethod": "sni-only",
  "MinimumProtocolVersion": "TLSv1.2_2021",
  "CertificateSource": "acm"
}' > updated-config.json

# Update the distribution
ETAG=$(aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --query 'ETag' --output text)

aws cloudfront update-distribution \
  --id $DISTRIBUTION_ID \
  --distribution-config file://updated-config.json \
  --if-match $ETAG

echo -e "${GREEN}✅ CloudFront updated! Deployment takes 10-15 minutes${NC}"
echo -e "${YELLOW}📝 FINAL STEP: Update your DNS records:${NC}"
echo -e "${YELLOW}1. Go to your domain registrar${NC}"
echo -e "${YELLOW}2. Update A record for $DOMAIN to point to CloudFront:${NC}"
echo -e "${YELLOW}   Type: ALIAS/CNAME${NC}"
echo -e "${YELLOW}   Name: @ (or blank)${NC}"
echo -e "${YELLOW}   Value: d37jk1ntfbemdx.cloudfront.net${NC}"
echo -e "${YELLOW}3. Update CNAME record for www.$DOMAIN:${NC}"
echo -e "${YELLOW}   Type: CNAME${NC}"
echo -e "${YELLOW}   Name: www${NC}"
echo -e "${YELLOW}   Value: d37jk1ntfbemdx.cloudfront.net${NC}"

rm current-config.json updated-config.json

EOF

chmod +x update-cloudfront-domain.sh

echo -e "${GREEN}🎉 Domain setup scripts created!${NC}"