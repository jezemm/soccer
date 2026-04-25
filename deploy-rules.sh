#!/usr/bin/env bash
# Deploys firestore.rules to the named Firestore database via REST API.
# The standard `firebase deploy --only firestore:rules` silently skips named databases.
set -e

PROJECT="gen-lang-client-0029897959"
DATABASE="ai-studio-d1fcc763-4ce4-4bde-b121-8a73822ddcd3"
RULES_FILE="firestore.rules"

TOKEN=$(cat ~/.config/configstore/firebase-tools.json | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access_token'])")

echo "Creating ruleset from ${RULES_FILE}..."
CONTENT=$(python3 -c "import json,sys; print(json.dumps(open('${RULES_FILE}').read()))")
RULESET=$(curl -s -X POST \
  "https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"source\":{\"files\":[{\"name\":\"${RULES_FILE}\",\"content\":${CONTENT}}]}}")

RULESET_NAME=$(echo "$RULESET" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
echo "Created ruleset: ${RULESET_NAME}"

echo "Releasing to database ${DATABASE}..."
curl -s -X PATCH \
  "https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore/${DATABASE}?updateMask=rulesetName" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"release\":{\"name\":\"projects/${PROJECT}/releases/cloud.firestore/${DATABASE}\",\"rulesetName\":\"${RULESET_NAME}\"}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Released to:', d.get('name','')); print('ERROR:',d['error']) if 'error' in d else None"

echo "Done."
