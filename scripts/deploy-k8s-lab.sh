#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 3 ]]; then
  echo 'Usage: deploy-k8s-lab.sh CONTEXT FRONTEND_IMAGE:TAG https://BACKEND.onrender.com' >&2
  exit 2
fi
LAB_CONTEXT=$1
LAB_IMAGE=$2
LAB_API=$3
[[ "$LAB_IMAGE" =~ ^[a-zA-Z0-9./_:-]+:[a-zA-Z0-9._-]+$ ]] || { echo 'An explicit image:tag is required' >&2; exit 2; }
[[ "$LAB_API" =~ ^https://[a-zA-Z0-9-]+\.onrender\.com$ ]] || { echo 'Use the Render backend HTTPS origin without a trailing slash' >&2; exit 2; }
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
TEMP_LAB=$(mktemp -d)
trap 'rm -rf "$TEMP_LAB"' EXIT
bash "$REPO_ROOT/scripts/render-k8s-lab.sh" "$LAB_IMAGE" "$LAB_API" > "$TEMP_LAB/lab.yaml"
kubectl --context="$LAB_CONTEXT" apply -f "$TEMP_LAB/lab.yaml"
kubectl --context="$LAB_CONTEXT" -n devsocial rollout status deployment/frontend --timeout=180s
kubectl --context="$LAB_CONTEXT" -n devsocial get pods,services
