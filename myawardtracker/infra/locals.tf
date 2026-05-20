locals {
  name_prefix = "${var.project}-${var.environment}"

  domain     = var.domain_name
  www_domain = "www.${var.domain_name}"
  api_domain = "api.${var.domain_name}"
  ws_domain  = "ws.${var.domain_name}"

  # All hostnames the single ACM certificate must cover.
  cert_sans = [local.www_domain, local.api_domain, local.ws_domain]

  # Secrets Manager secret holding the Stripe credentials JSON.
  stripe_secret_name = "${var.project}/${var.environment}/stripe"

  # Verified SES sender for the bi-weekly progress report.
  report_from_email = "reports@${var.domain_name}"

  backend_dist = "${path.module}/../backend/dist"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
