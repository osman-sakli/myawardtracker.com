# ---------------------------------------------------------------------------
# EventBridge Scheduler rules. Cheaper than always-on workers; per-invocation
# cost is essentially zero at our scale.
# ---------------------------------------------------------------------------

# Permission EventBridge uses to invoke the snapshot / cleanup Lambdas.
data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${local.name_prefix}-scheduler-role"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

data "aws_iam_policy_document" "scheduler" {
  statement {
    sid     = "InvokeJobs"
    actions = ["lambda:InvokeFunction"]
    resources = [
      aws_lambda_function.snapshot.arn,
      aws_lambda_function.cleanup.arn,
      aws_lambda_function.report.arn,
    ]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  name   = "${local.name_prefix}-scheduler-policy"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.scheduler.json
}

# ---- Daily snapshot ------------------------------------------------------

resource "aws_lambda_permission" "snapshot_scheduler" {
  statement_id  = "AllowSchedulerInvokeSnapshot"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.snapshot.function_name
  principal     = "scheduler.amazonaws.com"
}

resource "aws_lambda_permission" "cleanup_scheduler" {
  statement_id  = "AllowSchedulerInvokeCleanup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup.function_name
  principal     = "scheduler.amazonaws.com"
}

resource "aws_scheduler_schedule" "daily_snapshot" {
  name        = "${local.name_prefix}-daily-snapshot"
  description = "Roll yesterday's clock sessions into per-org / per-member daily stats."
  group_name  = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = "cron(0 2 * * ? *)"
  state               = "ENABLED"

  target {
    arn      = aws_lambda_function.snapshot.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      shardId = 0
      shards  = 1
    })

    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 1
    }
  }
}

# ---- Hourly chat cleanup -------------------------------------------------

resource "aws_scheduler_schedule" "hourly_cleanup" {
  name        = "${local.name_prefix}-hourly-cleanup"
  description = "Sweep expired chat messages, stale invites, and abandoned WS rows."
  group_name  = "default"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 15
  }

  schedule_expression = "rate(1 hour)"
  state               = "ENABLED"

  target {
    arn      = aws_lambda_function.cleanup.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({})

    retry_policy {
      maximum_event_age_in_seconds = 1800
      maximum_retry_attempts       = 0
    }
  }
}
