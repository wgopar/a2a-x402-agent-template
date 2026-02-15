# ─── AWS ───────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-west-2"
}

variable "function_name" {
  description = "Name for the Lambda function and ECR repository"
  type        = string
  default     = "a2a-agent"
}

variable "memory_size" {
  description = "Lambda memory in MB (also scales CPU proportionally)"
  type        = number
  default     = 256
}

variable "image_tag" {
  description = "Docker image tag to deploy (use git SHA or timestamp for immutable tags)"
  type        = string
  default     = "latest"
}

# ─── Agent Identity ────────────────────────────────────────────────

variable "wallet_address" {
  description = "Ethereum wallet address for receiving x402 payments"
  type        = string
  sensitive   = true
}

variable "private_key" {
  description = "Private key for signing transactions (ERC-8004 identity)"
  type        = string
  sensitive   = true
}

# ─── Network ───────────────────────────────────────────────────────

variable "network" {
  description = "EVM network identifier (e.g. eip155:84532 for Base Sepolia)"
  type        = string
  default     = "eip155:84532"
}

variable "rpc_url" {
  description = "JSON-RPC endpoint for the target network"
  type        = string
  default     = "https://sepolia.base.org"
}

variable "facilitator_url" {
  description = "x402 facilitator service URL for payment verification"
  type        = string
  default     = "https://www.x402.org/facilitator"
}

# ─── Agent Metadata ────────────────────────────────────────────────

variable "agent_name" {
  description = "Human-readable agent name (shown in A2A agent card)"
  type        = string
  default     = "Hello Agent"
}

variable "agent_description" {
  description = "Agent description (shown in A2A agent card)"
  type        = string
  default     = "A simple Hello World agent"
}
