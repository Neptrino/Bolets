#!/bin/sh
set -eu
umask 077

: "${UMAMI_WEBSITE_ID:?UMAMI_WEBSITE_ID is required}"
: "${UMAMI_ADMIN_PASSWORD:?UMAMI_ADMIN_PASSWORD is required}"

heatmap_sample_rate=${UMAMI_HEATMAP_SAMPLE_RATE:-0.15}

if ! jq -en --arg value "$heatmap_sample_rate" \
  '($value | tonumber?) as $rate | $rate != null and $rate > 0 and $rate <= 1' \
  >/dev/null; then
  echo "UMAMI_HEATMAP_SAMPLE_RATE must be a number greater than 0 and at most 1" >&2
  exit 65
fi

heatmap_sample_rate=$(jq -nr --arg value "$heatmap_sample_rate" '$value | tonumber')

if ! printf '%s\n' "$UMAMI_WEBSITE_ID" |
  grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
  echo "UMAMI_WEBSITE_ID must be a lowercase UUID" >&2
  exit 65
fi

if [ "${#UMAMI_ADMIN_PASSWORD}" -lt 16 ]; then
  echo "UMAMI_ADMIN_PASSWORD must contain at least 16 characters" >&2
  exit 65
fi

umami_api_url=${UMAMI_API_URL:-http://127.0.0.1:${UMAMI_HTTP_PORT:-3001}}
response_file=$(mktemp)
reports_file=$(mktemp)
cleanup() {
  rm -f -- "$response_file" "$reports_file"
}
trap cleanup EXIT HUP INT TERM

login() {
  login_password=$1
  jq -nc --arg username admin --arg password "$login_password" \
    '{username: $username, password: $password}' |
    curl --silent --show-error \
      --header 'Content-Type: application/json' \
      --data-binary @- \
      "$umami_api_url/api/auth/login" |
    jq -er '.token'
}

token=$(login "$UMAMI_ADMIN_PASSWORD" 2>/dev/null || true)
if [ -z "$token" ]; then
  token=$(login umami 2>/dev/null || true)
  if [ -z "$token" ]; then
    echo "Could not authenticate with either the configured or bootstrap Umami password" >&2
    exit 77
  fi

  jq -nc --arg currentPassword umami --arg newPassword "$UMAMI_ADMIN_PASSWORD" \
    '{currentPassword: $currentPassword, newPassword: $newPassword}' |
    curl --fail-with-body --silent --show-error \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $token" \
      --data-binary @- \
      "$umami_api_url/api/me/password" >/dev/null

  token=$(login "$UMAMI_ADMIN_PASSWORD")
fi

auth_status=$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  --header "Authorization: Bearer $token" \
  "$umami_api_url/api/me")

if [ "$auth_status" != 200 ]; then
  echo "The configured Umami administrator session could not be verified" >&2
  exit 77
fi

status_code=$(curl --silent --show-error \
  --output "$response_file" \
  --write-out '%{http_code}' \
  --header "Authorization: Bearer $token" \
  "$umami_api_url/api/websites/$UMAMI_WEBSITE_ID")

website_payload() {
  jq -nc \
    --arg name Bolets \
    --arg domain bolets.app \
    --argjson heatmapSampleRate "$heatmap_sample_rate" \
    '{
      name: $name,
      domain: $domain,
      replayConfig: {
        replayEnabled: false,
        heatmapEnabled: true,
        sampleRate: 0,
        heatmapSampleRate: $heatmapSampleRate,
        maskLevel: "strict",
        maxDuration: 300000,
        blockSelector: ""
      }
    }'
}

website_creation_payload() {
  jq -nc \
    --arg id "$UMAMI_WEBSITE_ID" \
    --arg name Bolets \
    --arg domain bolets.app \
    '{id: $id, name: $name, domain: $domain}'
}

website_is_configured() {
  jq -e \
    --arg id "$UMAMI_WEBSITE_ID" \
    --arg domain bolets.app \
    --argjson heatmapSampleRate "$heatmap_sample_rate" \
    '.id == $id and
     .domain == $domain and
     .replayConfig.replayEnabled != true and
     .replayConfig.heatmapEnabled == true and
     .replayConfig.sampleRate == 0 and
     .replayConfig.heatmapSampleRate == $heatmapSampleRate and
     .replayConfig.maskLevel == "strict" and
     .replayConfig.maxDuration == 300000' "$response_file" >/dev/null
}

goal_report_payload() {
  goal_name=$1
  goal_event=$2
  goal_description=$3
  jq -nc \
    --arg websiteId "$UMAMI_WEBSITE_ID" \
    --arg name "$goal_name" \
    --arg event "$goal_event" \
    --arg description "$goal_description" \
    '{
      websiteId: $websiteId,
      type: "goal",
      name: $name,
      description: $description,
      parameters: {type: "event", value: $event}
    }'
}

ensure_goal_report() {
  goal_name=$1
  goal_event=$2
  goal_description=$3
  goal_id=$(jq -r --arg event "$goal_event" \
    'first(.data[] | select(.type == "goal" and .parameters.type == "event" and .parameters.value == $event) | .id) // empty' \
    "$reports_file")

  if [ -n "$goal_id" ] && ! printf '%s\n' "$goal_id" |
    grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
    echo "Umami returned an invalid goal report ID" >&2
    exit 69
  fi

  if [ -n "$goal_id" ] && jq -e \
    --arg id "$goal_id" \
    --arg name "$goal_name" \
    --arg event "$goal_event" \
    --arg description "$goal_description" \
    '.data[] | select(.id == $id and .name == $name and .description == $description and
     .type == "goal" and .parameters.type == "event" and .parameters.value == $event)' \
    "$reports_file" >/dev/null; then
    return
  fi

  goal_endpoint="$umami_api_url/api/reports"
  if [ -n "$goal_id" ]; then
    goal_endpoint="$goal_endpoint/$goal_id"
  fi

  goal_report_payload "$goal_name" "$goal_event" "$goal_description" |
    curl --fail-with-body --silent --show-error --output "$response_file" \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $token" \
      --data-binary @- "$goal_endpoint"

  if ! jq -e \
    --arg websiteId "$UMAMI_WEBSITE_ID" \
    --arg name "$goal_name" \
    --arg event "$goal_event" \
    '.websiteId == $websiteId and .type == "goal" and .name == $name and
     .parameters.type == "event" and .parameters.value == $event' \
    "$response_file" >/dev/null; then
    echo "Umami returned an unexpected goal report" >&2
    exit 69
  fi
}

configure_goal_reports() {
  curl --fail-with-body --silent --show-error --output "$reports_file" \
    --header "Authorization: Bearer $token" \
    "$umami_api_url/api/reports?websiteId=$UMAMI_WEBSITE_ID&type=goal&pageSize=100"

  if ! jq -e '.data | type == "array"' "$reports_file" >/dev/null; then
    echo "Umami returned an unexpected goal report list" >&2
    exit 69
  fi

  ensure_goal_report \
    "User signup" \
    "user-signup" \
    "A new account was successfully created."
  ensure_goal_report \
    "Finding added" \
    "finding-added" \
    "A finding was successfully finalized on the server."
  ensure_goal_report \
    "Infographic downloaded" \
    "infographic-downloaded" \
    "The infographic poster was successfully prepared for download in the browser."
  ensure_goal_report \
    "Infographic shared" \
    "infographic-shared" \
    "The infographic was successfully sent through the browser share sheet."
  ensure_goal_report \
    "Homepage video play" \
    "homepage-video-play" \
    "The homepage showcase video started playing."
  ensure_goal_report \
    "Map cell click" \
    "map-cell-click" \
    "A prediction cell on the main map was selected."
  ensure_goal_report \
    "Map species change" \
    "map-change-species" \
    "The species displayed on the main map was changed."
  ensure_goal_report \
    "Homepage video complete" \
    "homepage-video-complete" \
    "The homepage showcase video reached its end."
  ensure_goal_report \
    "Homepage map CTA click" \
    "homepage-map-cta-click" \
    "A homepage call to action to open the map was selected."
  ensure_goal_report \
    "Map geolocation success" \
    "map-geolocation-success" \
    "The main map successfully received a device location."
  ensure_goal_report \
    "Species map open" \
    "species-map-open" \
    "A map link on a species profile was selected."
  ensure_goal_report \
    "Finding form started" \
    "finding-form-started" \
    "The finding capture form received its first interaction."
  ensure_goal_report \
    "App installed" \
    "app-installed" \
    "The browser confirmed installation or the installed app launched for the first time."
}

funnel_report_payload() {
  funnel_name=$1
  first_event=$2
  second_event=$3
  funnel_window=$4
  funnel_description=$5
  jq -nc \
    --arg websiteId "$UMAMI_WEBSITE_ID" \
    --arg name "$funnel_name" \
    --arg firstEvent "$first_event" \
    --arg secondEvent "$second_event" \
    --argjson window "$funnel_window" \
    --arg description "$funnel_description" \
    '{
      websiteId: $websiteId,
      type: "funnel",
      name: $name,
      description: $description,
      parameters: {
        steps: [
          {type: "event", value: $firstEvent},
          {type: "event", value: $secondEvent}
        ],
        window: $window
      }
    }'
}

ensure_funnel_report() {
  funnel_name=$1
  first_event=$2
  second_event=$3
  funnel_window=$4
  funnel_description=$5
  funnel_id=$(jq -r \
    --arg firstEvent "$first_event" \
    --arg secondEvent "$second_event" \
    'first(.data[] | select(.type == "funnel" and .parameters.steps == [
      {type: "event", value: $firstEvent},
      {type: "event", value: $secondEvent}
    ]) | .id) // empty' "$reports_file")

  if [ -n "$funnel_id" ] && ! printf '%s\n' "$funnel_id" |
    grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'; then
    echo "Umami returned an invalid funnel report ID" >&2
    exit 69
  fi

  if [ -n "$funnel_id" ] && jq -e \
    --arg id "$funnel_id" \
    --arg name "$funnel_name" \
    --arg firstEvent "$first_event" \
    --arg secondEvent "$second_event" \
    --argjson window "$funnel_window" \
    --arg description "$funnel_description" \
    '.data[] | select(.id == $id and .name == $name and .description == $description and
     .type == "funnel" and .parameters.window == $window and .parameters.steps == [
       {type: "event", value: $firstEvent},
       {type: "event", value: $secondEvent}
     ])' "$reports_file" >/dev/null; then
    return
  fi

  funnel_endpoint="$umami_api_url/api/reports"
  if [ -n "$funnel_id" ]; then
    funnel_endpoint="$funnel_endpoint/$funnel_id"
  fi

  funnel_report_payload \
    "$funnel_name" "$first_event" "$second_event" "$funnel_window" "$funnel_description" |
    curl --fail-with-body --silent --show-error --output "$response_file" \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $token" \
      --data-binary @- "$funnel_endpoint"

  if ! jq -e \
    --arg websiteId "$UMAMI_WEBSITE_ID" \
    --arg name "$funnel_name" \
    --arg firstEvent "$first_event" \
    --arg secondEvent "$second_event" \
    --argjson window "$funnel_window" \
    '.websiteId == $websiteId and .type == "funnel" and .name == $name and
     .parameters.window == $window and .parameters.steps == [
       {type: "event", value: $firstEvent},
       {type: "event", value: $secondEvent}
     ]' "$response_file" >/dev/null; then
    echo "Umami returned an unexpected funnel report" >&2
    exit 69
  fi
}

configure_funnel_reports() {
  curl --fail-with-body --silent --show-error --output "$reports_file" \
    --header "Authorization: Bearer $token" \
    "$umami_api_url/api/reports?websiteId=$UMAMI_WEBSITE_ID&type=funnel&pageSize=100"

  if ! jq -e '.data | type == "array"' "$reports_file" >/dev/null; then
    echo "Umami returned an unexpected funnel report list" >&2
    exit 69
  fi

  ensure_funnel_report \
    "Signup completion" \
    "signup-started" \
    "user-signup" \
    7 \
    "An initiated account access flow that creates a new account within seven days."
  ensure_funnel_report \
    "Finding sync completion" \
    "finding-draft-saved" \
    "finding-added" \
    30 \
    "A local finding draft that is finalized on the server within thirty days."
  ensure_funnel_report \
    "App install completion" \
    "app-install-started" \
    "app-installed" \
    7 \
    "An install action that is confirmed by the browser or a first standalone launch within seven days."
}

configure_analytics_reports() {
  configure_goal_reports
  configure_funnel_reports
}

if [ "$status_code" = 200 ]; then
  if ! jq -e --arg id "$UMAMI_WEBSITE_ID" --arg domain bolets.app \
    '.id == $id and .domain == $domain' "$response_file" >/dev/null; then
    echo "Umami returned an unexpected website for the configured ID" >&2
    exit 69
  fi

  if website_is_configured; then
    configure_analytics_reports
    echo "Umami administrator, Bolets website, heatmaps and reports are configured"
    exit 0
  fi

  website_payload |
    curl --fail-with-body --silent --show-error --output "$response_file" \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $token" \
      --data-binary @- "$umami_api_url/api/websites/$UMAMI_WEBSITE_ID"

  if ! website_is_configured; then
    echo "Umami returned an unexpected website after enabling heatmaps" >&2
    exit 69
  fi

  configure_analytics_reports
  echo "Umami administrator, Bolets website, heatmaps and reports are configured"
  exit 0
fi

# Umami intentionally responds with 401 instead of revealing whether an
# inaccessible website UUID exists. The administrator session was verified
# above, so 401 means this fixed website is not yet available to that account.
if [ "$status_code" != 401 ] && [ "$status_code" != 404 ] &&
   ! jq -e '. == null' "$response_file" >/dev/null 2>&1; then
  echo "Unexpected response while checking the Umami website: HTTP $status_code" >&2
  exit 69
fi

website_creation_payload |
  curl --fail-with-body --silent --show-error --output "$response_file" \
    --header 'Content-Type: application/json' \
    --header "Authorization: Bearer $token" \
    --data-binary @- "$umami_api_url/api/websites"

if ! jq -e --arg id "$UMAMI_WEBSITE_ID" --arg domain bolets.app \
  '.id == $id and .domain == $domain' "$response_file" >/dev/null; then
  echo "Umami returned an unexpected website after creation" >&2
  exit 69
fi

website_payload |
  curl --fail-with-body --silent --show-error --output "$response_file" \
    --header 'Content-Type: application/json' \
    --header "Authorization: Bearer $token" \
    --data-binary @- "$umami_api_url/api/websites/$UMAMI_WEBSITE_ID"

if ! website_is_configured; then
  echo "Umami returned an unexpected website after enabling heatmaps" >&2
  exit 69
fi

configure_analytics_reports
echo "Umami administrator, Bolets website, heatmaps and reports are configured"
