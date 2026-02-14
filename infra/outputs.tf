output "function_url" {
  description = "Public HTTPS endpoint for the agent"
  value       = trimsuffix(aws_lambda_function_url.agent.function_url, "/")
}

output "agent_card_url" {
  description = "A2A agent card discovery URL"
  value       = "${trimsuffix(aws_lambda_function_url.agent.function_url, "/")}/.well-known/agent-card.json"
}

output "function_name" {
  description = "Lambda function name (for aws cli commands)"
  value       = aws_lambda_function.agent.function_name
}

output "ecr_repository_url" {
  description = "ECR repository URL (for docker push)"
  value       = aws_ecr_repository.agent.repository_url
}

output "log_group" {
  description = "CloudWatch log group (for aws logs commands)"
  value       = aws_cloudwatch_log_group.lambda.name
}
