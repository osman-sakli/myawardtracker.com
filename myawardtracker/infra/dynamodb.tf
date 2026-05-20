# Single-table design. On-demand billing keeps idle cost at zero.
#
# GSI roster:
#   GSI1 — Activities by profile, time-sorted.
#   GSI2 — Subscription lookup by Stripe customer.
#   GSI3 — User-by-email, user-by-org membership listing, invite-by-token,
#          slug uniqueness for organizations.
#   GSI4 — Org-wide time-sorted streams: chat by channel, clock-sessions org-
#          wide, member listing by join time, per-user notification inbox.
#   GSI5 — WebSocket fan-out: connections by user; connections by channel.
#
# DynamoDB Streams are on so the report worker can react to ReportJob inserts.
resource "aws_dynamodb_table" "main" {
  name             = "${local.name_prefix}-data"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "PK"
  range_key        = "SK"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "S"
  }
  attribute {
    name = "GSI2PK"
    type = "S"
  }
  attribute {
    name = "GSI2SK"
    type = "S"
  }
  attribute {
    name = "GSI3PK"
    type = "S"
  }
  attribute {
    name = "GSI3SK"
    type = "S"
  }
  attribute {
    name = "GSI4PK"
    type = "S"
  }
  attribute {
    name = "GSI4SK"
    type = "S"
  }
  attribute {
    name = "GSI5PK"
    type = "S"
  }
  attribute {
    name = "GSI5SK"
    type = "S"
  }

  # Activities by profile, time-sorted (list / history / calendar / filters).
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # Lookup by Stripe customer id (webhook reconciliation).
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  # User-by-email + membership-by-user + invite-by-token + slug uniqueness.
  global_secondary_index {
    name            = "GSI3"
    hash_key        = "GSI3PK"
    range_key       = "GSI3SK"
    projection_type = "ALL"
  }

  # Org-wide time-sorted streams (chat, clock, members, notifications).
  global_secondary_index {
    name            = "GSI4"
    hash_key        = "GSI4PK"
    range_key       = "GSI4SK"
    projection_type = "ALL"
  }

  # WebSocket fan-out by user/channel.
  global_secondary_index {
    name            = "GSI5"
    hash_key        = "GSI5PK"
    range_key       = "GSI5SK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
