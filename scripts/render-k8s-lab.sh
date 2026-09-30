#!/usr/bin/env bash
# Render a portable, secret-free bundle to paste into a hosted lab.
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo 'Usage: render-k8s-lab.sh FRONTEND_IMAGE:TAG https://BACKEND.onrender.com' >&2
  exit 2
fi
LAB_IMAGE=$1
LAB_API=$2
[[ "$LAB_IMAGE" =~ ^[a-zA-Z0-9./_:-]+:[a-zA-Z0-9._-]+$ ]] || { echo 'An explicit image:tag is required' >&2; exit 2; }
[[ "$LAB_API" =~ ^https://[a-zA-Z0-9-]+\.onrender\.com$ ]] || { echo 'Use the Render backend HTTPS origin without a trailing slash' >&2; exit 2; }
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
TEMP_LAB=$(mktemp -d)
trap 'rm -rf "$TEMP_LAB"' EXIT
kubectl kustomize "$REPO_ROOT/deploy/k8s/lab" --load-restrictor=LoadRestrictionsNone > "$TEMP_LAB/resources.yaml"
cat > "$TEMP_LAB/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [resources.yaml]
images:
  - name: devsocial-frontend
    newName: ${LAB_IMAGE%:*}
    newTag: ${LAB_IMAGE##*:}
EOF
kubectl kustomize "$TEMP_LAB" --load-restrictor=LoadRestrictionsNone
printf '\n---\n'
kubectl -n devsocial create configmap render-api \
  --from-literal="url=$LAB_API" --dry-run=client -o yaml
