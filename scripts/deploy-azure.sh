#!/usr/bin/env bash
# Redeploy the current working tree to the existing Azure Container App:
# builds the image, pushes it to the app's registry, and rolls out a new revision.
# Secrets/env vars live on the Container App and are left untouched.
#
# Prereqs: Docker running, `az login` done, containerapp extension installed
# (`az extension add --name containerapp`).
#
# Usage (from repo root, Git Bash):  ./scripts/deploy-azure.sh
set -euo pipefail
# Stop Git Bash rewriting "/..." arguments into Windows paths before they reach az.
export MSYS_NO_PATHCONV=1

RG="${RG:-rg-agent-dashboard}"
APP="${APP:-agent-dashboard}"

cd "$(dirname "$0")/.."

REGISTRY=$(az containerapp show -g "$RG" -n "$APP" --query "properties.configuration.registries[0].server" -o tsv)
TAG="$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo -dirty)-$(date +%Y%m%d%H%M)"
IMAGE="$REGISTRY/agent-dashboard:$TAG"

echo "Building $IMAGE"
docker build --platform linux/amd64 -t "$IMAGE" .
az acr login -n "${REGISTRY%%.*}"
docker push "$IMAGE"

echo "Rolling out new revision"
az containerapp update -g "$RG" -n "$APP" --image "$IMAGE" \
  --query "{revision:properties.latestRevisionName, fqdn:properties.configuration.ingress.fqdn}" -o table
