# Running Aspect under systemd

This directory contains a production-ready systemd unit for the Aspect
server, plus an environment file template.

## What you get

- `aspect.service` — the unit file. Runs the built server as a dedicated
  `aspect` user, restarts on failure, and applies a strong sandbox
  (`ProtectSystem=strict`, `ProtectHome`, `NoNewPrivileges`, …).
- `aspect.env.example` — environment template with `HA_URL`, `HA_TOKEN`,
  `PORT`, `ASPECT_WEB_DIR`, `ASPECT_DB`.

## One-time install

```bash
# 1. Create the service user and install paths.
sudo useradd --system --home /opt/aspect --shell /usr/sbin/nologin aspect
sudo mkdir -p /opt/aspect /opt/aspect/data /etc/aspect

# 2. Build the project (on a build host or the target).
pnpm install
pnpm build

# 3. Copy the built tree to /opt/aspect. You need at minimum:
#    - apps/server/dist/         (server bundle)
#    - apps/server/node_modules/ (better-sqlite3 native binding for THIS node)
#    - apps/web/dist/            (web assets)
#    - node_modules/             (workspace hoisted deps)
#    - package.json, pnpm-workspace.yaml
sudo rsync -a --delete \
    --exclude='.git' --exclude='apps/*/src' --exclude='apps/*/test' \
    ./ /opt/aspect/

sudo chown -R aspect:aspect /opt/aspect

# 4. Drop in the env file and lock it down.
sudo cp deploy/aspect.env.example /etc/aspect/aspect.env
sudo chown aspect:aspect /etc/aspect/aspect.env
sudo chmod 600 /etc/aspect/aspect.env
sudoedit /etc/aspect/aspect.env   # set HA_URL + HA_TOKEN

# 5. Install and start the unit.
sudo cp deploy/aspect.service /etc/systemd/system/aspect.service
sudo systemctl daemon-reload
sudo systemctl enable --now aspect.service

# 6. Confirm.
sudo systemctl status aspect.service
journalctl -u aspect.service -f
```

Aspect is then live at `http://<host>:8099`.

## Notes & tweaks

- **Node path.** The unit uses `/usr/bin/node`. If you're on nvm/asdf or a
  packaged distro, run `which node` and update `ExecStart=` accordingly.
  Don't point at an nvm `current` symlink — it follows the invoking user's
  shell, not the service user's.
- **`better-sqlite3` is a native module.** It's built against a specific
  node ABI. Always run `pnpm install` (or `pnpm rebuild better-sqlite3`)
  on the same node version that the service will use, or copy
  `node_modules` from a matching host.
- **`ASPECT_DB` path.** The default in the env file is
  `/opt/aspect/data/aspect.db`. If you change it, also update
  `ReadWritePaths=` in `aspect.service` — the sandbox blocks writes
  everywhere else.
- **Running from a different prefix.** Change `WorkingDirectory=`,
  `ReadWritePaths=`, and the `aspect.env` paths together. Everything
  else stays the same.
- **Updating.** Rsync the new build over `/opt/aspect/`, then
  `sudo systemctl restart aspect.service`. The web client reconnects
  automatically.

## Logs

Aspect logs to stdout/stderr, so `journalctl` is the source of truth:

```bash
journalctl -u aspect.service -f         # live tail
journalctl -u aspect.service --since=1h # last hour
```
