variable "project" {
  description = "Project slug used to name resources."
  type        = string
  default     = "myawardtracker"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region. Must be us-east-1 — CloudFront ACM certs live here."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain. The Route 53 hosted zone must already exist."
  type        = string
  default     = "myawardtracker.com"
}

variable "log_retention_days" {
  description = "CloudWatch log retention to bound cost."
  type        = number
  default     = 14
}

variable "lambda_memory_mb" {
  description = "Memory for the API Lambda."
  type        = number
  default     = 256
}

variable "stripe_secret_key" {
  description = "Stripe live secret key. Leave as placeholder; the real value is written into Secrets Manager out-of-band."
  type        = string
  default     = "REPLACE_ME"
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret. Leave as placeholder; written into Secrets Manager out-of-band."
  type        = string
  default     = "REPLACE_ME"
  sensitive   = true
}

variable "stripe_price_individual" {
  description = "Stripe price id for the one-time $9.99 Individual purchase."
  type        = string
  default     = "REPLACE_ME"
}

# ---------------------------------------------------------------------------
# Cost guardrails
# ---------------------------------------------------------------------------

variable "alert_email" {
  description = "Email to receive budget alerts. Leave empty to skip the Budget."
  type        = string
  default     = ""
}

variable "budget_monthly_usd" {
  description = "Monthly cost cap (USD) for the budget alarm."
  type        = number
  default     = 20
}
