# ---------------------------------------------------------------------------
# Lambda. Both functions share one deployment package (built by
# backend/build.sh) and differ only by handler entrypoint.
# ---------------------------------------------------------------------------

data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/build"
  output_path = "${local.backend_dist}/backend.zip"
}

# ---- API Lambda role ------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${local.name_prefix}-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "api" {
  statement {
    sid = "DynamoAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:TransactWriteItems",
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
    ]
  }

  statement {
    sid       = "EvidenceBucketAccess"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.evidence.arn}/*"]
  }

  statement {
    sid       = "StripeSecretRead"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.stripe.arn]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "${local.name_prefix}-api-policy"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

resource "aws_iam_role_policy_attachment" "api_basic" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---- Webhook Lambda role --------------------------------------------------

resource "aws_iam_role" "webhook" {
  name               = "${local.name_prefix}-webhook-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "webhook" {
  statement {
    sid = "DynamoAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
    ]
  }

  statement {
    sid       = "StripeSecretRead"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.stripe.arn]
  }
}

resource "aws_iam_role_policy" "webhook" {
  name   = "${local.name_prefix}-webhook-policy"
  role   = aws_iam_role.webhook.id
  policy = data.aws_iam_policy_document.webhook.json
}

resource "aws_iam_role_policy_attachment" "webhook_basic" {
  role       = aws_iam_role.webhook.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---- Log groups (explicit, so retention bounds cost) ----------------------

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.name_prefix}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "webhook" {
  name              = "/aws/lambda/${local.name_prefix}-webhook"
  retention_in_days = var.log_retention_days
}

# ---- Functions ------------------------------------------------------------

locals {
  lambda_env = {
    TABLE_NAME              = aws_dynamodb_table.main.name
    EVIDENCE_BUCKET         = aws_s3_bucket.evidence.bucket
    USER_POOL_ID            = aws_cognito_user_pool.main.id
    USER_POOL_CLIENT_ID     = aws_cognito_user_pool_client.web.id
    STRIPE_SECRET_NAME      = local.stripe_secret_name
    STRIPE_PRICE_INDIVIDUAL = var.stripe_price_individual
    REPORT_FROM_EMAIL       = local.report_from_email
    SITE_URL                = "https://${local.domain}"
    CORS_ORIGIN             = "https://${local.domain}"
    POWERTOOLS_LOG_LEVEL    = "INFO"
    POWERTOOLS_SERVICE_NAME = "myawardtracker"
  }
}

resource "aws_lambda_function" "api" {
  function_name    = "${local.name_prefix}-api"
  role             = aws_iam_role.api.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.api.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = var.lambda_memory_mb
  timeout          = 15

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_lambda_function" "webhook" {
  function_name    = "${local.name_prefix}-webhook"
  role             = aws_iam_role.webhook.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.stripe_webhook.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 256
  timeout          = 15

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.webhook]
}
