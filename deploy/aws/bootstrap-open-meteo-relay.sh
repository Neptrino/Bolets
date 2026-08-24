#!/usr/bin/env bash
set -euo pipefail

aws_region="${AWS_REGION:-eu-south-2}"
stack_name="bolets-open-meteo-relay"
github_owner="Neptrino"
github_repository="Bolets"

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

account_id="$(aws sts get-caller-identity --query Account --output text)"
caller_arn="$(aws sts get-caller-identity --query Arn --output text)"
if [[ "$caller_arn" != "arn:aws:iam::${account_id}:root" ]]; then
  echo "Bootstrap caller: $caller_arn"
else
  echo "Using the short-lived root browser session for one-time bootstrap only." >&2
fi

npm run lambda:check

task_tmp="$(mktemp -d "${TMPDIR:-/tmp}/bolets-lambda-bootstrap.XXXXXX")"
cleanup() {
  find "$task_tmp" -type f -delete
  find "$task_tmp" -depth -type d -empty -delete
}
trap cleanup EXIT

artifact_zip="$task_tmp/open-meteo-relay.zip"
(cd lambda/open-meteo-relay/dist && zip -q "$artifact_zip" index.js)
artifact_sha="$(shasum -a 256 "$artifact_zip" | cut -d ' ' -f 1)"
artifact_bucket="bolets-lambda-artifacts-${account_id}-${aws_region}"
artifact_key="open-meteo-relay/${artifact_sha}.zip"

if ! aws s3api head-bucket --bucket "$artifact_bucket" >/dev/null 2>&1; then
  aws s3api create-bucket \
    --bucket "$artifact_bucket" \
    --region "$aws_region" \
    --create-bucket-configuration "LocationConstraint=${aws_region}" >/dev/null
  aws s3api put-public-access-block \
    --bucket "$artifact_bucket" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-encryption \
    --bucket "$artifact_bucket" \
    --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-bucket-versioning \
    --bucket "$artifact_bucket" \
    --versioning-configuration Status=Enabled
fi
aws s3 cp "$artifact_zip" "s3://${artifact_bucket}/${artifact_key}" \
  --only-show-errors

github_oidc_arn="arn:aws:iam::${account_id}:oidc-provider/token.actions.githubusercontent.com"
if ! aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "$github_oidc_arn" >/dev/null 2>&1; then
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --tags Key=Project,Value=Bolets >/dev/null
fi

aws cloudformation deploy \
  --region "$aws_region" \
  --stack-name "$stack_name" \
  --template-file deploy/aws/open-meteo-relay.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "ArtifactBucket=${artifact_bucket}" \
    "ArtifactKey=${artifact_key}" \
    "GitHubOidcProviderArn=${github_oidc_arn}" \
    "GitHubOwner=${github_owner}" \
    "GitHubRepository=${github_repository}"

aws cloudformation describe-stacks \
  --region "$aws_region" \
  --stack-name "$stack_name" \
  --query 'Stacks[0].Outputs[?OutputKey==`FunctionUrl` || OutputKey==`GitHubDeployRoleArn`].[OutputKey,OutputValue]' \
  --output table
