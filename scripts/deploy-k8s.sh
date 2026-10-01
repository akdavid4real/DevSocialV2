#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 || $# -gt 5 ]]; then
  echo 'Usage: deploy-k8s.sh CONTEXT BACKEND_IMAGE FRONTEND_IMAGE [BACKEND_ENV_FILE] [base|local|hosted]' >&2
  exit 2
fi
DEPLOY_CONTEXT=$1
BACKEND_IMAGE=$2
FRONTEND_IMAGE=$3
BACKEND_ENV_FILE=${4:-}
DEPLOY_OVERLAY=${5:-base}
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
case "$DEPLOY_OVERLAY" in
  base) MANIFEST_PATH="$REPO_ROOT/deploy/k8s/base" ;;
  local|hosted) MANIFEST_PATH="$REPO_ROOT/deploy/k8s/$DEPLOY_OVERLAY" ;;
  *) echo 'Overlay must be base, local, or hosted' >&2; exit 2 ;;
esac
for IMAGE in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
  [[ "$IMAGE" =~ ^[a-zA-Z0-9./_:-]+:[a-zA-Z0-9._-]+$ ]] || { echo 'Use an explicit image:tag reference (digests are not supported here)' >&2; exit 2; }
done
TEMP_DEPLOY=$(mktemp -d)
trap 'rm -rf "$TEMP_DEPLOY"' EXIT
kubectl kustomize "$MANIFEST_PATH" --load-restrictor=LoadRestrictionsNone > "$TEMP_DEPLOY/resources.yaml"
cat > "$TEMP_DEPLOY/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - resources.yaml
images:
  - name: devsocial-backend
    newName: ${BACKEND_IMAGE%:*}
    newTag: ${BACKEND_IMAGE##*:}
  - name: devsocial-frontend
    newName: ${FRONTEND_IMAGE%:*}
    newTag: ${FRONTEND_IMAGE##*:}
EOF
# Explicit context prevents deploying into whichever cluster happens to be current.
kubectl --context="$DEPLOY_CONTEXT" apply -f "$REPO_ROOT/deploy/k8s/base/namespace.yaml"
if [[ -n "$BACKEND_ENV_FILE" ]]; then
  kubectl --context="$DEPLOY_CONTEXT" -n devsocial create secret generic backend-env \
    --from-env-file="$BACKEND_ENV_FILE" --dry-run=client -o yaml |
    kubectl --context="$DEPLOY_CONTEXT" apply --server-side --field-manager=devsocial-deploy -f -
fi
kubectl --context="$DEPLOY_CONTEXT" -n devsocial get secret backend-env >/dev/null
kubectl kustomize "$TEMP_DEPLOY" --load-restrictor=LoadRestrictionsNone |
  kubectl --context="$DEPLOY_CONTEXT" apply -f -
kubectl --context="$DEPLOY_CONTEXT" -n devsocial rollout status deployment/backend --timeout=180s
kubectl --context="$DEPLOY_CONTEXT" -n devsocial rollout status deployment/frontend --timeout=180s
