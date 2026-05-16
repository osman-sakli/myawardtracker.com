locals {
  name_prefix = "${var.project}-${var.environment}"

  domain     = var.domain_name
  www_domain = "www.${var.domain_name}"
  api_domain = "api.${var.domain_name}"

  # All hostnames the single ACM certificate must cover.
  cert_sans = [local.www_domain, local.api_domain]

  ssm_prefix = "/${var.project}/${var.environment}"

  backend_dist = "${path.module}/../backend/dist"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
