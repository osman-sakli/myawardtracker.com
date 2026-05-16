# ---------------------------------------------------------------------------
# Stripe configuration in SSM Parameter Store. Created with placeholders;
# update the real values out-of-band (AWS console or CLI) — they are not
# tracked in state thanks to ignore_changes.
# ---------------------------------------------------------------------------

resource "aws_ssm_parameter" "stripe_secret_key" {
  name        = "${local.ssm_prefix}/stripe/secret_key"
  description = "Stripe secret API key"
  type        = "SecureString"
  value       = var.stripe_secret_key

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "stripe_webhook_secret" {
  name        = "${local.ssm_prefix}/stripe/webhook_secret"
  description = "Stripe webhook signing secret"
  type        = "SecureString"
  value       = var.stripe_webhook_secret

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "stripe_prices" {
  name        = "${local.ssm_prefix}/stripe/prices"
  description = "JSON map of planId -> Stripe price id"
  type        = "String"
  value = jsonencode({
    individual   = var.stripe_price_individual
    family       = var.stripe_price_family
    small_group  = var.stripe_price_small_group
    medium_group = var.stripe_price_medium_group
  })

  lifecycle {
    ignore_changes = [value]
  }
}
