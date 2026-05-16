# ---------------------------------------------------------------------------
# Evidence bucket: fully private. Accessed only via presigned URLs minted by
# the API Lambda. Objects are keyed by user sub for tenant isolation.
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "evidence" {
  bucket = "${local.name_prefix}-evidence-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Presigned PUT/GET are issued for the browser, so CORS must allow the site.
resource "aws_s3_bucket_cors_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  cors_rule {
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = [
      "https://${local.domain}",
      "https://${local.www_domain}",
      "http://localhost:3000",
    ]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Drop incomplete multipart uploads to avoid silent storage cost.
resource "aws_s3_bucket_lifecycle_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }
}
