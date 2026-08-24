# AWS Open-Meteo relay

The Lambda is a third egress adapter for the PostgreSQL-coordinated ingestion
pipeline. It owns no schedule or provider quota and accepts only timestamped,
HMAC-signed allowlisted Open-Meteo requests.

Run the bootstrap once from a short-lived AWS browser session:

```bash
AWS_REGION=eu-south-2 deploy/aws/bootstrap-open-meteo-relay.sh
```

The stack creates an ARM64 Node.js 24 Lambda, a retained generated HMAC secret,
a versioned `live` alias, a public Function URL protected by application HMAC,
14-day logs, reserved concurrency four, and a GitHub OIDC role restricted to
the `Neptrino/Bolets` `Production` environment. It stores build archives in a
private, encrypted, versioned S3 bucket. The GitHub role can update code,
publish a version, and move only the `live` alias; it cannot change IAM,
secrets, concurrency, or the Function URL policy.

Copy the Function URL plus `v1/fetch` and the secret value into the VPS
`/opt/bolets/secrets/functions.env` as `OPEN_METEO_AWS_RELAY_URL` and
`OPEN_METEO_AWS_RELAY_HMAC_SECRET`. Never print, commit, or store the secret in
GitHub.
