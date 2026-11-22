#!/usr/bin/env bash
# Snapshot kesehatan tq-cmms, READ-ONLY. Keluaran: satu objek JSON di stdout.
# Tidak membaca rahasia (.env hanya di-grep untuk RELEASE_TAG/DRAWINGS_STORAGE_DRIVER).
# Jalankan sebagai root (systemd) atau: sudo TQ_DOCKER=docker bash scripts/health-check.sh
# Override hanya untuk uji di luar VPS: TQ_ROOT, TQ_PROJECT, TQ_DOCKER, TQ_HOST, TQ_HTTPS_PORT,
# TQ_BACKEND_CERT, TQ_PUBLIC_CERT, TQ_STATE_DIR.
set -euo pipefail

ROOT="${TQ_ROOT:-/opt/tq-cmms}"
HOST="${TQ_HOST:-tq-cmms.com}"
HTTPS_PORT="${TQ_HTTPS_PORT:-18443}"
BACKEND_CERT="${TQ_BACKEND_CERT:-$ROOT/infra/certs/tls.crt}"
PUBLIC_CERT="${TQ_PUBLIC_CERT:-/etc/letsencrypt/live/$HOST/fullchain.pem}"
STATE_DIR="${TQ_STATE_DIR:-/var/lib/tq-cmms}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dc.sh
. "$SCRIPT_DIR/dc.sh"
read -r -a DOCKER <<<"${TQ_DOCKER:-sudo docker}"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Setiap probe menulis ke $work; kegagalan probe dicatat, bukan menghentikan snapshot.
probe() { local name="$1"; shift; "$@" >"$work/$name" 2>"$work/$name.err" || echo "$?" >"$work/$name.rc"; }

env_key() { grep -E "^$1=" "$ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'" || true; }

probe git_sha git -c safe.directory="$ROOT" -C "$ROOT" rev-parse HEAD
probe git_status git -c safe.directory="$ROOT" -C "$ROOT" status --porcelain
env_key RELEASE_TAG >"$work/release_tag"
env_key DRAWINGS_STORAGE_DRIVER >"$work/storage_driver"
probe compose_ps dc ps -a --format json
# Kumpulkan restart/OOM per container milik project.
if [ -s "$work/compose_ps" ]; then
  python3 -c '
import json,sys
raw=open(sys.argv[1]).read().strip()
rows=json.loads(raw) if raw.startswith("[") else [json.loads(l) for l in raw.splitlines() if l.strip()]
print("\n".join(r.get("Name","") for r in rows if r.get("Name")))' "$work/compose_ps" >"$work/names" 2>/dev/null || true
  if [ -s "$work/names" ]; then
    # shellcheck disable=SC2046
    probe inspect "${DOCKER[@]}" inspect --format '{{.Name}} {{.RestartCount}} {{.State.OOMKilled}}' $(cat "$work/names")
  fi
fi
probe df df -P / /var/lib/docker "$ROOT"
probe dfi df -Pi / /var/lib/docker "$ROOT"
probe meminfo grep -E '^(MemAvailable|MemTotal|SwapFree):' /proc/meminfo
probe backup_db sh -c "ls -1t '$ROOT'/backups/plant-*.sql.gz 2>/dev/null | head -1 | xargs -r stat -c '%Y %s %n'"
probe backup_files sh -c "ls -1t '$ROOT'/backups/drawings-files-*.tar.gz 2>/dev/null | head -1 | xargs -r stat -c '%Y %s %n'"
probe cert_backend openssl x509 -noout -enddate -in "$BACKEND_CERT"
probe cert_public openssl x509 -noout -enddate -in "$PUBLIC_CERT"
for path in gateway-health auth/login; do
  probe "http_${path//\//_}" curl --cacert "$BACKEND_CERT" --resolve "$HOST:$HTTPS_PORT:127.0.0.1" \
    -sS -o /dev/null -m 10 -w '%{http_code}' "https://$HOST:$HTTPS_PORT/$path"
done
probe listeners sh -c "ss -lntH | awk '{print \$4}'"
[ -e "$STATE_DIR/maintenance" ] && echo true >"$work/maintenance" || echo false >"$work/maintenance"

python3 - "$work" "$HTTPS_PORT" <<'PY'
import json, os, re, socket, sys, time
from datetime import datetime, timezone

work, https_port = sys.argv[1], sys.argv[2]
def read(name):
    try:
        return open(os.path.join(work, name)).read().strip()
    except FileNotFoundError:
        return ""
def failed(name):
    return os.path.exists(os.path.join(work, name + ".rc"))
def err(name):
    return read(name + ".err")[:200]

now = time.time()
issues, warnings = [], []
report = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
          "host": socket.gethostname()}

# Git / release
dirty = [l for l in read("git_status").splitlines() if l.strip()]
report["release"] = {"git_sha": read("git_sha") or None, "release_tag": read("release_tag") or None,
                     "dirty_files": len(dirty), "storage_driver": read("storage_driver") or "fs",
                     "maintenance_on": read("maintenance") == "true"}
if dirty:
    warnings.append(f"working tree VPS punya {len(dirty)} perubahan lokal; review sebelum update")
if report["release"]["maintenance_on"]:
    warnings.append("penanda maintenance aktif; domain memberi 503")

# Services
services = []
raw = read("compose_ps")
if failed("compose_ps") or not raw:
    issues.append("dc ps gagal: " + (err("compose_ps") or "tanpa keluaran"))
else:
    rows = json.loads(raw) if raw.startswith("[") else [json.loads(l) for l in raw.splitlines() if l.strip()]
    restarts = {}
    for line in read("inspect").splitlines():
        parts = line.split()
        if len(parts) == 3:
            restarts[parts[0].lstrip("/")] = (int(parts[1]), parts[2] == "true")
    jobs = {"migrate", "bootstrap", "drawings-ops"}
    for r in rows:
        name, svc = r.get("Name", ""), r.get("Service", "")
        state, health = r.get("State", ""), r.get("Health", "")
        rc, oom = restarts.get(name, (None, None))
        services.append({"service": svc, "state": state, "health": health or None,
                         "exit_code": r.get("ExitCode"), "restarts": rc, "oom_killed": oom})
        if svc in jobs:
            if svc == "migrate" and state == "exited" and r.get("ExitCode") not in (0, None):
                issues.append(f"job migrate terakhir keluar dengan kode {r.get('ExitCode')}")
            continue
        if state != "running":
            issues.append(f"{svc} tidak running ({state})")
        elif health and health != "healthy":
            issues.append(f"{svc} {health}")
        if oom:
            issues.append(f"{svc} pernah OOMKilled")
        if rc and rc > 3:
            warnings.append(f"{svc} restart {rc}x")
    expected = {"mysql", "auth", "portal", "bag-filter", "consumables", "drawings", "nginx", "backup"}
    missing = expected - {s["service"] for s in services}
    if missing:
        issues.append("container tidak ada: " + ", ".join(sorted(missing)))
report["services"] = services

# Disk / inode / memory
def parse_df(name, label):
    out = {}
    for line in read(name).splitlines()[1:]:
        cols = line.split()
        # Mount = kolom terakhir, persen = kolom sebelumnya (tahan nama device berspasi).
        if len(cols) >= 6:
            pct = cols[-2].rstrip("%")
            out[cols[-1]] = int(pct) if pct.isdigit() else None
    for mount, pct in out.items():
        if pct is not None and pct >= 90:
            issues.append(f"{label} {mount} {pct}%")
        elif pct is not None and pct >= 80:
            warnings.append(f"{label} {mount} {pct}%")
    return out
report["disk_used_pct"] = parse_df("df", "disk")
report["inode_used_pct"] = parse_df("dfi", "inode")
mem = {k: int(v) // 1024 for k, v in re.findall(r"^(\w+):\s+(\d+) kB", read("meminfo"), re.M)}
report["memory_mib"] = mem
if mem.get("MemAvailable", 10**9) < 768:
    issues.append(f"MemAvailable {mem.get('MemAvailable')} MiB < 768")
elif mem.get("MemAvailable", 10**9) < 1536:
    warnings.append(f"MemAvailable {mem.get('MemAvailable')} MiB")

# Backups
def backup(name, label, required):
    line = read(name)
    if not line:
        (issues if required else warnings).append(f"tidak ada backup {label}")
        return None
    mtime, size, path = line.split(" ", 2)
    age_h = round((now - int(mtime)) / 3600, 1)
    if age_h > 26:
        (issues if required else warnings).append(f"backup {label} terbaru berumur {age_h} jam (> 26)")
    return {"file": os.path.basename(path), "age_hours": age_h, "size_bytes": int(size)}
report["backup"] = {"database": backup("backup_db", "database", True),
                    # Arsip file hanya dibuat bila volume fs berisi; ketiadaannya cukup warning.
                    "drawings_files": backup("backup_files", "drawings-files", False)}

# Certificates
def cert(name, label):
    if failed(name):
        warnings.append(f"sertifikat {label} tidak terbaca: {err(name).splitlines()[0] if err(name) else ''}")
        return None
    end = read(name).split("=", 1)[-1]
    try:
        expiry = datetime.strptime(end, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    except ValueError:
        warnings.append(f"format tanggal sertifikat {label} tidak dikenal")
        return {"not_after": end}
    days = round((expiry.timestamp() - now) / 86400, 1)
    if days < 7:
        issues.append(f"sertifikat {label} kedaluwarsa dalam {days} hari")
    elif days < 30:
        warnings.append(f"sertifikat {label} kedaluwarsa dalam {days} hari")
    return {"not_after": expiry.isoformat(), "days_left": days}
report["certificates"] = {"backend": cert("cert_backend", "backend"), "public": cert("cert_public", "publik")}

# Backend HTTPS via loopback, TLS terverifikasi
http = {}
for key, path, want in (("http_gateway-health", "/gateway-health", "204"), ("http_auth_login", "/auth/login", "200")):
    code = read(key) or None
    http[path] = code
    if code != want:
        issues.append(f"backend {path} memberi {code or 'gagal'} (harus {want}) {err(key)}".strip())
report["backend_http"] = http

# Port binding: gateway project hanya loopback, tidak ada MySQL/Next di host
bad = []
for addr in read("listeners").splitlines():
    host, _, port = addr.rpartition(":")
    if port in (https_port, "18080") and host not in ("127.0.0.1",):
        bad.append(addr)
    if port in ("3306", "3000", "3001", "3002", "3003", "3004"):
        bad.append(addr)
report["listeners_flagged"] = bad
if bad:
    issues.append("binding tidak semestinya: " + ", ".join(bad))

report["issues"], report["warnings"] = issues, warnings
report["status"] = "CRIT" if issues else ("WARN" if warnings else "OK")
print(json.dumps(report, indent=2, ensure_ascii=False))
PY
