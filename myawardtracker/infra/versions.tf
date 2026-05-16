terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # State lives in S3 with native lockfile (Terraform >= 1.10) — no DynamoDB
  # lock table needed. The bucket is supplied at init time via -backend-config
  # so the same code works for any account/environment:
  #   terraform init \
  #     -backend-config="bucket=<state-bucket>" \
  #     -backend-config="key=prod/terraform.tfstate" \
  #     -backend-config="region=us-east-1" \
  #     -backend-config="use_lockfile=true"
  backend "s3" {}
}
