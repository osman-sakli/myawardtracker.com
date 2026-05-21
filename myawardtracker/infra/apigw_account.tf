# ---------------------------------------------------------------------------
# Account-level API Gateway CloudWatch Logs role.
#
# WebSocket v2 stages cannot be created with access logging until the account
# carries a service role that lets API Gateway write to CloudWatch Logs. This
# is a one-per-account/region setting (shared by v1 + v2), so the resource is
# `aws_api_gateway_account` even though it also unblocks our v2 stage.
#
# The HTTP API's access logs work without this role because HTTP API v2
# pushes logs through the *integration's* role; the WebSocket API does not.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "apigw_logs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apigw_logs" {
  name               = "${local.name_prefix}-apigw-logs-role"
  assume_role_policy = data.aws_iam_policy_document.apigw_logs_assume.json
}

resource "aws_iam_role_policy_attachment" "apigw_logs" {
  role       = aws_iam_role.apigw_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.apigw_logs.arn
}
