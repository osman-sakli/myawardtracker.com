# ---------------------------------------------------------------------------
# Lambda. Every function shares one deployment package (built by
# backend/build.sh) and differs only by handler entrypoint.
# ---------------------------------------------------------------------------

data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/build"
  output_path = "${local.backend_dist}/backend.zip"
}

# ---- Common assume-role doc ----------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ---- API Lambda role ------------------------------------------------------

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
      "dynamodb:Scan",
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
    sid       = "ReportsBucketRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.reports.arn}/*"]
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

# ---- WebSocket Lambda role -----------------------------------------------

resource "aws_iam_role" "ws" {
  name               = "${local.name_prefix}-ws-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "ws" {
  statement {
    sid = "DynamoAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
    ]
  }

  statement {
    sid       = "ManageWsConnections"
    actions   = ["execute-api:ManageConnections"]
    resources = ["${aws_apigatewayv2_api.ws.execution_arn}/*"]
  }
}

resource "aws_iam_role_policy" "ws" {
  name   = "${local.name_prefix}-ws-policy"
  role   = aws_iam_role.ws.id
  policy = data.aws_iam_policy_document.ws.json
}

resource "aws_iam_role_policy_attachment" "ws_basic" {
  role       = aws_iam_role.ws.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---- Snapshot / cleanup / report job role --------------------------------

resource "aws_iam_role" "jobs" {
  name               = "${local.name_prefix}-jobs-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "jobs" {
  statement {
    sid = "DynamoAccess"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem",
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams",
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
      aws_dynamodb_table.main.stream_arn,
    ]
  }

  statement {
    sid       = "ReportsBucketWrite"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.reports.arn}/*"]
  }
}

resource "aws_iam_role_policy" "jobs" {
  name   = "${local.name_prefix}-jobs-policy"
  role   = aws_iam_role.jobs.id
  policy = data.aws_iam_policy_document.jobs.json
}

resource "aws_iam_role_policy_attachment" "jobs_basic" {
  role       = aws_iam_role.jobs.name
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

resource "aws_cloudwatch_log_group" "ws" {
  name              = "/aws/lambda/${local.name_prefix}-ws"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "snapshot" {
  name              = "/aws/lambda/${local.name_prefix}-snapshot"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "cleanup" {
  name              = "/aws/lambda/${local.name_prefix}-cleanup"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "reports" {
  name              = "/aws/lambda/${local.name_prefix}-reports"
  retention_in_days = var.log_retention_days
}

# ---- Shared environment --------------------------------------------------

locals {
  lambda_env = {
    TABLE_NAME                      = aws_dynamodb_table.main.name
    EVIDENCE_BUCKET                 = aws_s3_bucket.evidence.bucket
    REPORTS_BUCKET                  = aws_s3_bucket.reports.bucket
    USER_POOL_ID                    = aws_cognito_user_pool.main.id
    USER_POOL_CLIENT_ID             = aws_cognito_user_pool_client.web.id
    STRIPE_SECRET_NAME              = local.stripe_secret_name
    STRIPE_PRICE_INDIVIDUAL         = var.stripe_price_individual
    STRIPE_PRICE_ORG_SMALL          = var.stripe_price_org_small
    STRIPE_PRICE_ORG_MEDIUM         = var.stripe_price_org_medium
    STRIPE_PRICE_ORG_LARGE          = var.stripe_price_org_large
    STRIPE_PRICE_ORG_SMALL_STORAGE  = var.stripe_price_org_small_storage
    STRIPE_PRICE_ORG_MEDIUM_STORAGE = var.stripe_price_org_medium_storage
    STRIPE_PRICE_ORG_LARGE_STORAGE  = var.stripe_price_org_large_storage
    REPORT_FROM_EMAIL               = local.report_from_email
    SITE_URL                        = "https://${local.domain}"
    CORS_ORIGIN                     = "https://${local.domain}"
    WS_API_ENDPOINT                 = "wss://${aws_apigatewayv2_domain_name.ws.domain_name}"
    POWERTOOLS_LOG_LEVEL            = "INFO"
    POWERTOOLS_SERVICE_NAME         = "myawardtracker"
  }
}

# ---- Functions ------------------------------------------------------------

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

resource "aws_lambda_function" "ws" {
  function_name    = "${local.name_prefix}-ws"
  role             = aws_iam_role.ws.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.ws.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 256
  timeout          = 10

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.ws]
}

resource "aws_lambda_function" "snapshot" {
  function_name    = "${local.name_prefix}-snapshot"
  role             = aws_iam_role.jobs.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.snapshot_job.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 512
  timeout          = 900

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.snapshot]
}

resource "aws_lambda_function" "cleanup" {
  function_name    = "${local.name_prefix}-cleanup"
  role             = aws_iam_role.jobs.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.cleanup_job.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 256
  timeout          = 60

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.cleanup]
}

resource "aws_lambda_function" "reports" {
  function_name    = "${local.name_prefix}-reports"
  role             = aws_iam_role.jobs.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.report_job.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 1024
  timeout          = 120

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.reports]
}

# Stream trigger: ReportJob inserts wake the reports Lambda.
resource "aws_lambda_event_source_mapping" "reports_stream" {
  event_source_arn  = aws_dynamodb_table.main.stream_arn
  function_name     = aws_lambda_function.reports.arn
  starting_position = "LATEST"
  batch_size        = 5
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT"]
        dynamodb = {
          NewImage = {
            entityType = { S = ["ReportJob"] }
            status     = { S = ["queued"] }
          }
        }
      })
    }
  }
}
