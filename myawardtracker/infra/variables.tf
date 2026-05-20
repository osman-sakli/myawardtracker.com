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

# ---------------------------------------------------------------------------
# Stripe — secrets live in Secrets Manager; price ids are not secrets.
# ---------------------------------------------------------------------------

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
  description = "Stripe price id for the yearly $4.99 Individual subscription."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_small" {
  description = "Stripe price id for the $39/year Small org base plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_medium" {
  description = "Stripe price id for the $78/year Medium org base plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_large" {
  description = "Stripe price id for the $117/year Large org base plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_small_storage" {
  description = "Stripe price id for the $69/year Small org plan with storage add-on."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_medium_storage" {
  description = "Stripe price id for the $138/year Medium org plan with storage add-on."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_org_large_storage" {
  description = "Stripe price id for the $207/year Large org plan with storage add-on."
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
  description = "Monthly cost cap (USD) for the budget alarm. Target architecture sits at < $30/mo."
  type        = number
  default     = 30
}
