output "frontend_bucket" {
  description = "S3 bucket the static site is uploaded to."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (used for cache invalidation)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain" {
  description = "CloudFront domain name."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "evidence_bucket" {
  description = "Private bucket for evidence uploads."
  value       = aws_s3_bucket.evidence.bucket
}

output "reports_bucket" {
  description = "Private bucket for async report exports (7-day lifecycle)."
  value       = aws_s3_bucket.reports.bucket
}

output "ws_url" {
  description = "WebSocket endpoint for the realtime chat."
  value       = "wss://${local.ws_domain}"
}

output "dynamodb_table" {
  value = aws_dynamodb_table.main.name
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "api_url" {
  description = "Public API base URL."
  value       = "https://${local.api_domain}"
}

output "api_gateway_endpoint" {
  description = "Raw API Gateway endpoint (pre-DNS / debugging)."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "site_url" {
  value = "https://${local.domain}"
}

output "stripe_secret_name" {
  description = "Secrets Manager secret holding the Stripe credentials JSON."
  value       = aws_secretsmanager_secret.stripe.name
}

output "report_from_email" {
  description = "SES sender address for the bi-weekly report email."
  value       = local.report_from_email
}

output "webhook_url" {
  description = "Stripe webhook endpoint to register in the Stripe dashboard."
  value       = "https://${local.api_domain}/webhooks/stripe"
}

# Convenience block: paste into frontend/.env.local
output "frontend_env" {
  description = "Environment values for the frontend build."
  value       = <<-EOT
    NEXT_PUBLIC_AWS_REGION=${var.aws_region}
    NEXT_PUBLIC_API_URL=https://${local.api_domain}
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=${aws_cognito_user_pool.main.id}
    NEXT_PUBLIC_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.web.id}
    NEXT_PUBLIC_SITE_URL=https://${local.domain}
    NEXT_PUBLIC_WS_URL=wss://${local.ws_domain}
  EOT
}
