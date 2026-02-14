#!/usr/bin/env bash
# Deploy the agent to AWS Lambda (Docker container).
# Usage: bash scripts/deploy.sh [image-tag]
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Docker running
#   - Terraform initialized (cd infra && terraform init)
#   - ECR repo created (terraform apply -target=aws_ecr_repository.agent)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_DIR/infra"
IMAGE_TAG="${1:-$(date +%Y%m%d-%H%M%S)}"

# ─── Get ECR URL from Terraform ────────────────────────────────────
cd "$INFRA_DIR"
ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null) || {
  echo "Error: Could not read ECR URL from terraform outputs."
  echo "Run: cd infra && terraform apply -target=aws_ecr_repository.agent"
  exit 1
}

# Extract region from ECR URL (format: <account>.dkr.ecr.<region>.amazonaws.com/<repo>)
REGION=$(echo "$ECR_URL" | sed 's/.*\.ecr\.\(.*\)\.amazonaws\.com.*/\1/')
REGISTRY=$(echo "$ECR_URL" | cut -d/ -f1)

echo "==> Authenticating Docker with ECR ($REGION)"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building image: $ECR_URL:$IMAGE_TAG"
cd "$PROJECT_DIR"
docker build --target lambda -t "$ECR_URL:$IMAGE_TAG" .

echo "==> Pushing image to ECR"
docker push "$ECR_URL:$IMAGE_TAG"

echo "==> Running terraform apply"
cd "$INFRA_DIR"
terraform apply -var "image_tag=$IMAGE_TAG" -auto-approve

echo ""
echo "Deploy complete!"
echo "──────────────────────────────────────────"
terraform output
