# Setup awal Antigravity CLI di VPS

Dikerjakan sekali oleh pemilik, atau oleh agy dengan persetujuan pemilik di setiap langkah `sudo`. Prasyaratnya: checkout `/opt/tq-cmms` berada pada SHA yang sudah memuat `.agents/skills/tq-cmms-ops/` dan sudah ada di `origin/main`. Penggantian SHA mengikuti [update-release.md](update-release.md). Bila hanya skill yang berubah, tidak perlu build.

## 1. Agy dan workspace

- Agy dipasang dan login di **akun deployment** (pemilik `/opt/tq-cmms`), bukan root. Catat `command -v agy`.
- Agy selalu dijalankan dari `/opt/tq-cmms`. Skill workspace dibaca dari `.agents/skills/`, dan `AGENTS.md` di root mengarahkan ke skill ini.
- Cek dengan `/skills`: `tq-cmms-ops` harus tampil. Setelah `git checkout` SHA baru, jalankan `/skills reload`.

## 2. Izin

1. Backup settings lama bila ada: `cp ~/.gemini/antigravity-cli/settings.json{,.bak-$(date +%F)}`.
2. Gabungkan isi `assets/agy-settings.example.json` ke `~/.gemini/antigravity-cli/settings.json` di bawah `permissions`. Kunci lain yang sudah ada tetap dipertahankan.
3. Urutan prioritas Antigravity adalah Deny > Ask > Allow. Karena `command(sudo)` dan `command(regex:.*docker .*)` ada di `ask`, setiap perintah Docker/sudo tetap meminta persetujuan dalam sesi interaktif. Inilah yang dimaksud: operasi yang mengubah state selalu terlihat oleh pemilik.
4. Verifikasi deny tanpa efek samping: minta agy menjalankan `echo git stash`. Perintah itu harus ditolak. Bila lolos, sintaks regex atau pencocokan berbeda di versi agy terpasang. Sesuaikan aturannya dan uji lagi.
5. `--dangerously-skip-permissions` tidak dipakai di VPS ini.

Daftar deny hanyalah jaring pengaman mekanis. Batas lengkapnya tetap di SKILL.md.

## 3. Timer health read-only

```bash
cd /opt/tq-cmms
DEPLOY_USER=$(stat -c %U /opt/tq-cmms); AGY_PATH=$(sudo -u "$DEPLOY_USER" -i command -v agy)
S=.agents/skills/tq-cmms-ops/assets/systemd
sudo install -m 0644 "$S/tq-cmms-health-record.service" "$S/tq-cmms-health-record.timer" /etc/systemd/system/
sed -e "s|^User=DEPLOY_USER|User=$DEPLOY_USER|" -e "s|^Environment=TQ_AGY=.*|Environment=TQ_AGY=$AGY_PATH|" \
  "$S/tq-cmms-health-report.service" | sudo tee /etc/systemd/system/tq-cmms-health-report.service >/dev/null
sudo systemd-analyze verify /etc/systemd/system/tq-cmms-health-*.service /etc/systemd/system/tq-cmms-health-record.timer
sudo systemctl daemon-reload
sudo systemctl start tq-cmms-health-record.service      # uji sekali
sudo systemctl status --no-pager tq-cmms-health-record.service tq-cmms-health-report.service
sudo python3 -m json.tool /var/lib/tq-cmms/health/latest.json >/dev/null && echo JSON_OK
tail -n 20 .deploy/ops-log/health-$(date -u +%Y-%m).md
sudo systemctl enable --now tq-cmms-health-record.timer
systemctl list-timers --no-pager | grep tq-cmms
```

Setup selesai bila keempat hal berikut terpenuhi:

- `JSON_OK` muncul.
- Entri health ada di ops-log.
- Timer terdaftar.
- Website lain tidak terdampak (unit hanya membaca).

Bila agy gagal di unit report, misalnya karena login atau PATH, script menulis daftar mentah. Periksa `.deploy/ops-log/health-report.err`.

Notifikasi keluar (email/WA/Telegram) belum termasuk di sini. Bila pemilik menginginkannya, tambahkan sebagai langkah terpisah yang mengirim **hanya** baris status, tanpa isi JSON lengkap.

## 4. Catat di HANDOVER-RESULT

Tambahkan ke `.deploy/HANDOVER-RESULT.md`:

- Operator: Antigravity CLI.
- Akun deployment.
- Path agy dan versinya (`agy --version`).
- Lokasi settings.
- Nama timer.
- Mekanisme offsite yang aktif.
- Release rollback yang tersedia.
