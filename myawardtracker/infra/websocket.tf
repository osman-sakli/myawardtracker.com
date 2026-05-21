# ---------------------------------------------------------------------------
# WebSocket API. JWT authentication is performed inside the Lambda on $connect
# (Cognito's HTTP-API JWT authorizer doesn't work on WebSocket APIs).
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "ws" {
  name                       = "${local.name_prefix}-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "ws" {
  api_id                    = aws_apigatewayv2_api.ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = aws_lambda_function.ws.invoke_arn
  content_handling_strategy = "CONVERT_TO_TEXT"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_apigatewayv2_route" "ws_send" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "sendmessage"
  target    = "integrations/${aws_apigatewayv2_integration.ws.id}"
}

resource "aws_cloudwatch_log_group" "ws_access" {
  name              = "/aws/apigateway/${local.name_prefix}-ws"
  retention_in_days = var.log_retention_days
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = "prod"
  auto_deploy = true

  # CloudWatch Logs access logging requires the account-level role; create
  # that first or AWS returns BadRequestException on CreateStage.
  depends_on = [aws_api_gateway_account.main]

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.ws_access.arn
    format = jsonencode({
      requestId    = "$context.requestId"
      ip           = "$context.identity.sourceIp"
      requestTime  = "$context.requestTime"
      routeKey     = "$context.routeKey"
      connectionId = "$context.connectionId"
      status       = "$context.status"
    })
  }

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 100
  }
}

resource "aws_lambda_permission" "ws" {
  statement_id  = "AllowAPIGatewayInvokeWs"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/*"
}

# ---- Custom domain: ws.myawardtracker.com --------------------------------

resource "aws_apigatewayv2_domain_name" "ws" {
  domain_name = "ws.${var.domain_name}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.main.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  domain_name = aws_apigatewayv2_domain_name.ws.id
  stage       = aws_apigatewayv2_stage.ws.id
}
