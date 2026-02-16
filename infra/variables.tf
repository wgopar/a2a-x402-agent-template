# ─── AWS ───────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-west-2"
}

variable "function_name" {
  description = "Unique name for this agent (used for Lambda, ECR, IAM, and all AWS resources)"
  type        = string
  # No default — must be unique per agent to prevent resource collisions
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

variable "agent_provider_name" {
  description = "Organization name for Agent Card provider field (optional)"
  type        = string
  default     = ""
}

variable "agent_provider_url" {
  description = "Organization URL for Agent Card provider field (optional)"
  type        = string
  default     = ""
}

variable "agent_docs_url" {
  description = "Documentation URL shown in Agent Card (optional)"
  type        = string
  default     = ""
}

variable "agent_icon_url" {
  description = "Icon URL shown in Agent Card (optional)"
  type        = string
  default     = ""
}
