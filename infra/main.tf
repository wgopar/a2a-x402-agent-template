# A2A Agent — AWS Lambda (Docker) Infrastructure

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── ECR Repository ────────────────────────────────────────────────
resource "aws_ecr_repository" "agent" {
  name                 = var.function_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
}

# ─── IAM Role ──────────────────────────────────────────────────────
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ─── CloudWatch Log Group ──────────────────────────────────────────
# Explicit creation to control retention (default is infinite).
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
}

# ─── Lambda Function ───────────────────────────────────────────────
resource "aws_lambda_function" "agent" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.agent.repository_url}:${var.image_tag}"
  memory_size   = var.memory_size
  timeout       = 30

  environment {
    variables = local.env_vars
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda,
  ]
}

locals {
  # Maps 1:1 to src/config.ts. AGENT_URL is injected after Function URL creation.
  env_vars = {
    WALLET_ADDRESS    = var.wallet_address
    PRIVATE_KEY       = var.private_key
    NETWORK           = var.network
    RPC_URL           = var.rpc_url
    FACILITATOR_URL   = var.facilitator_url
    AGENT_NAME        = var.agent_name
    AGENT_DESCRIPTION = var.agent_description
    AGENT_URL         = "pending"
  }
}

# ─── Function URL ──────────────────────────────────────────────────
resource "aws_lambda_function_url" "agent" {
  function_name      = aws_lambda_function.agent.function_name
  authorization_type = "NONE"

  cors {
    allow_origins  = ["*"]
    allow_methods  = ["GET", "POST", "OPTIONS"]
    allow_headers  = ["content-type", "x-payment", "x-payment-response"]
    expose_headers = ["x-payment-response"]
    max_age        = 3600
  }
}

# ─── AGENT_URL Injection ───────────────────────────────────────────
# Lambda needs AGENT_URL for the A2A agent card, but the Function URL
# doesn't exist until after Lambda is created. We create Lambda with
# AGENT_URL="pending", then inject the real URL via AWS CLI.
resource "terraform_data" "inject_agent_url" {
  triggers_replace = aws_lambda_function_url.agent.function_url

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      aws lambda update-function-configuration \
        --function-name '${aws_lambda_function.agent.function_name}' \
        --region '${var.aws_region}' \
        --environment '${replace(jsonencode({
          Variables = merge(local.env_vars, {
            AGENT_URL = trimsuffix(aws_lambda_function_url.agent.function_url, "/")
          })
        }), "'", "'\\''")}' \
        --no-cli-pager > /dev/null
    EOT
  }
}
