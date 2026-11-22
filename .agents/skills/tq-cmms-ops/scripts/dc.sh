# shellcheck shell=bash
# Fungsi Compose produksi tq-cmms. Pakai dengan:
#   source /opt/tq-cmms/.agents/skills/tq-cmms-ops/scripts/dc.sh
#   dc ps -a
# Sumber: docs/deployment/VPS-TQ-CMMS.md bagian 6. Definisikan ulang di setiap shell baru.
# Override hanya untuk uji di luar VPS: TQ_ROOT, TQ_PROJECT, TQ_DOCKER (mis. "docker").

dc() {
  local root="${TQ_ROOT:-/opt/tq-cmms}"
  local project="${TQ_PROJECT:-tq-cmms}"
  local docker_cmd
  read -r -a docker_cmd <<<"${TQ_DOCKER:-sudo docker}"

  local required
  for required in .env compose.yaml infra/deploy/compose.vps.yaml; do
    if [ ! -f "$root/$required" ]; then
      printf 'dc: %s/%s tidak ada; ini bukan checkout produksi tq-cmms. Berhenti.\n' "$root" "$required" >&2
      return 2
    fi
  done

  local files=(-f "$root/compose.yaml" -f "$root/infra/deploy/compose.vps.yaml")
  if [ -f "$root/.deploy/compose.mysql-pin.yaml" ]; then
    files+=(-f "$root/.deploy/compose.mysql-pin.yaml")
  fi
  # Hanya membaca satu kunci non-rahasia; .env tidak pernah di-source.
  if grep -Eq "^DRAWINGS_STORAGE_DRIVER=[\"']?s3[\"']?[[:space:]]*$" "$root/.env"; then
    files+=(-f "$root/infra/deploy/compose.drawings-s3.yaml")
  fi

  "${docker_cmd[@]}" compose --project-name "$project" --env-file "$root/.env" "${files[@]}" "$@"
}
