data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# The hosted zone for myawardtracker.com is assumed to already exist.
data "aws_route53_zone" "main" {
  name         = "${var.domain_name}."
  private_zone = false
}
