# ---------------------------------------------------------------------------
# Stripe credentials in AWS Secrets Manager. The secret is created with
# placeholder values; the real live keys are written out-of-band (AWS CLI or
# console) so they never enter Terraform state or the repo. ignore_changes on
# secret_string keeps a later `terraform apply` from clobbering them.
# ---------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "stripe" {
  name        = local.stripe_secret_name
  description = "Stripe live secret key and webhook signing secret (JSON)."
  tags        = local.tags
}

resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secret_key     = var.stripe_secret_key
    webhook_secret = var.stripe_webhook_secret
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
