#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUCKET_NAME="personapass-app"
DISTRIBUTION_ID="E1Y04VU46FMFU"

echo -e "${YELLOW}🚀 Starting AWS deployment...${NC}"

# Build the application
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}☁️ Uploading to S3...${NC}"

# Upload WASM files with correct MIME type (THIS FIXES YOUR ISSUE!)
echo -e "${YELLOW}🔧 Uploading WASM files with correct MIME type...${NC}"
aws s3 sync ./dist s3://$BUCKET_NAME \
  --exclude "*" \
  --include "*.wasm" \
  --content-type "application/wasm" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Upload JS files
echo -e "${YELLOW}📄 Uploading JavaScript files...${NC}"
aws s3 sync ./dist s3://$BUCKET_NAME \
  --exclude "*" \
  --include "*.js" \
  --content-type "application/javascript" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Upload CSS files
echo -e "${YELLOW}🎨 Uploading CSS files...${NC}"
aws s3 sync ./dist s3://$BUCKET_NAME \
  --exclude "*" \
  --include "*.css" \
  --content-type "text/css" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Upload HTML files (no cache for index.html)
echo -e "${YELLOW}📄 Uploading HTML files...${NC}"
aws s3 sync ./dist s3://$BUCKET_NAME \
  --exclude "*" \
  --include "*.html" \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

# Upload everything else
echo -e "${YELLOW}📄 Uploading remaining files...${NC}"
aws s3 sync ./dist s3://$BUCKET_NAME \
  --exclude "*.wasm" \
  --exclude "*.js" \
  --exclude "*.css" \
  --exclude "*.html" \
  --delete

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app will be live at: https://d37jk1ntfbemdx.cloudfront.net${NC}"
echo -e "${YELLOW}⏳ Note: CloudFront deployment takes 10-15 minutes to complete${NC}"