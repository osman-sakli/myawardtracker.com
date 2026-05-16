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
  description = "Stripe secret key. Leave as placeholder and update the SSM parameter out-of-band."
  type        = string
  default     = "REPLACE_ME"
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret."
  type        = string
  default     = "REPLACE_ME"
  sensitive   = true
}

variable "stripe_price_individual" {
  description = "Stripe price id for the Individual plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_family" {
  description = "Stripe price id for the Family plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_small_group" {
  description = "Stripe price id for the Small Group plan."
  type        = string
  default     = "REPLACE_ME"
}

variable "stripe_price_medium_group" {
  description = "Stripe price id for the Medium Group plan."
  type        = string
  default     = "REPLACE_ME"
}
