resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 10
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Send through our DKIM-signed SES domain instead of Cognito's shared default
  # sender (no-reply@verificationemail.com), which lands in spam. Same-account
  # SES identities are auto-authorized for Cognito — no sending policy needed.
  email_configuration {
    email_sending_account  = "DEVELOPER"
    from_email_address     = "My Award Tracker <no-reply@${var.domain_name}>"
    source_arn             = aws_ses_domain_identity.main.arn
    reply_to_email_address = "support@${var.domain_name}"
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verify your My Award Tracker account"
    email_message        = "Welcome to My Award Tracker. Your verification code is {####}"
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Account type chosen at signup (individual / parent / org_admin).
  schema {
    name                     = "account_type"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
    string_attribute_constraints {
      min_length = 0
      max_length = 32
    }
  }

  user_pool_add_ons {
    advanced_security_mode = "AUDIT"
  }
}

# Public SPA client — no secret, SRP auth.
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  supported_identity_providers = ["COGNITO"]

  callback_urls = [
    "https://${local.domain}/dashboard",
    "http://localhost:3000/dashboard",
  ]
  logout_urls = [
    "https://${local.domain}/",
    "http://localhost:3000/",
  ]
}
