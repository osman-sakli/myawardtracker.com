# ---------------------------------------------------------------------------
# Bi-weekly progress report. EventBridge fires the Lambda every Sunday and the
# handler no-ops on odd ISO weeks, producing an every-other-Sunday cadence
# (EventBridge cron cannot express "every other week" on its own).
# ---------------------------------------------------------------------------

resource "aws_iam_role" "report" {
  name               = "${local.name_prefix}-report-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "report" {
  statement {
    sid     = "DynamoScan"
    actions = ["dynamodb:Scan", "dynamodb:Query", "dynamodb:GetItem"]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
    ]
  }

  statement {
    sid       = "SesSend"
    actions   = ["ses:SendEmail"]
    resources = [aws_ses_domain_identity.main.arn]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [local.report_from_email]
    }
  }
}

resource "aws_iam_role_policy" "report" {
  name   = "${local.name_prefix}-report-policy"
  role   = aws_iam_role.report.id
  policy = data.aws_iam_policy_document.report.json
}

resource "aws_iam_role_policy_attachment" "report_basic" {
  role       = aws_iam_role.report.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "report" {
  name              = "/aws/lambda/${local.name_prefix}-report"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "report" {
  function_name    = "${local.name_prefix}-report"
  role             = aws_iam_role.report.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "handlers.report_email.handler"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  memory_size      = 256
  timeout          = 120

  environment {
    variables = local.lambda_env
  }

  depends_on = [aws_cloudwatch_log_group.report]
}

resource "aws_cloudwatch_event_rule" "report_weekly" {
  name                = "${local.name_prefix}-report-weekly"
  description         = "Sunday 13:00 UTC trigger; handler runs only on even ISO weeks."
  schedule_expression = "cron(0 13 ? * SUN *)"
}

resource "aws_cloudwatch_event_target" "report" {
  rule = aws_cloudwatch_event_rule.report_weekly.name
  arn  = aws_lambda_function.report.arn
}

resource "aws_lambda_permission" "report_events" {
  statement_id  = "AllowEventBridgeInvokeReport"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.report_weekly.arn
}
