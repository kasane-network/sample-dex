# Contabo Deploy Guide (`kasane-dex-indexer`)

この手順は、Kasane Explore 用 indexer（`bun run token-indexer:run`）を  
Contabo サーバー上で `kasane-dex-indexer` として常駐/定期実行するためのものです。
リポジトリは **sparse-checkout で indexer 実行に必要な最小パスのみ取得** します。

## 0. 前提

- SSH 接続先:
  - `Host contabo-deployer`
  - `HostName 167.86.83.183`
  - `User deployer`
- このサーバーには既存で `kasane-indexer.service`（別実装）が存在します。
- 衝突回避のため、この手順では **新規名** `kasane-dex-indexer` を使います。

## 1. 初回セットアップ（サーバー）

```bash
ssh contabo-deployer

# bun インストール（未導入の場合）
curl -fsSL https://bun.sh/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
bun --version

# 配置（sparse-checkout）
sudo mkdir -p /opt/kasane-dex
sudo chown -R deployer:deployer /opt/kasane-dex
cd /opt/kasane-dex

# 初回
git init
git remote add origin <YOUR_REPO_URL>
git config core.sparseCheckout true
cat > .git/info/sparse-checkout <<'EOF'
v2-interface/package.json
v2-interface/bun.lock
v2-interface/packages/api/
v2-interface/packages/config/
v2-interface/packages/sessions/
v2-interface/packages/utilities/
v2-interface/config/
EOF
git fetch --depth=1 origin <YOUR_BRANCH>
git checkout -B <YOUR_BRANCH> origin/<YOUR_BRANCH>

cd v2-interface
bun install
```

## 2. 環境変数ファイル作成

```bash
sudo mkdir -p /etc/kasane
sudo cp packages/api/scripts/deploy/kasane-v2-user-positions/.env.example /etc/kasane/kasane-dex-indexer.env
sudo nano /etc/kasane/kasane-dex-indexer.env
```

最低限、以下を正しく設定:

- `INDEXER_RPC_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

必要に応じて:

- `INDEXER_V2_FACTORY_ADDRESS`
- `INDEXER_V2_MAX_PAIRS`
- `INDEXER_STABLE_TOKEN_ADDRESSES`
- `INDEXER_V2_USER_WALLET_ADDRESSES`
- `INDEXER_TOKEN_LIST_URLS`
- `INDEXER_NATIVE_PRICE_SYMBOL`（default: `ICPUSDT`）
- `INDEXER_NATIVE_PRICE_TOKEN_ADDRESSES`（default: `WICP` + `0xeeee...`）

## 3. systemd ユニット作成

`/etc/systemd/system/kasane-dex-indexer.service`:

```ini
[Unit]
Description=Kasane DEX Explore Indexer
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=deployer
Group=deployer
WorkingDirectory=/opt/kasane-dex/v2-interface/packages/api
EnvironmentFile=/etc/kasane/kasane-dex-indexer.env
ExecStart=/bin/bash -lc 'export BUN_INSTALL=/home/deployer/.bun; export PATH=$BUN_INSTALL/bin:$PATH; bun run token-indexer:run'
StandardOutput=journal
StandardError=journal
```

`/etc/systemd/system/kasane-dex-indexer.timer`:

```ini
[Unit]
Description=Run Kasane DEX Explore Indexer every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=kasane-dex-indexer.service
Persistent=true

[Install]
WantedBy=timers.target
```

反映:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kasane-dex-indexer.timer
```

## 4. 動作確認

```bash
systemctl status kasane-dex-indexer.timer --no-pager
systemctl list-timers --all | grep kasane-dex-indexer

# 手動実行
sudo systemctl start kasane-dex-indexer.service
sudo journalctl -u kasane-dex-indexer.service -n 200 --no-pager
```

## 5. 更新手順

```bash
ssh contabo-deployer
cd /opt/kasane-dex
git fetch origin <YOUR_BRANCH>
git reset --hard origin/<YOUR_BRANCH>
cd v2-interface
bun install
sudo systemctl start kasane-dex-indexer.service
sudo journalctl -u kasane-dex-indexer.service -n 100 --no-pager
```

## 6. 既存 indexer との関係

- 既存 `kasane-indexer.service` は別用途（`/opt/kasane/tools/indexer`）です。
- この手順の `kasane-dex-indexer` は別名運用なので、基本は共存可能です。
- もし移行で置き換える場合のみ、既存を停止:

```bash
sudo systemctl disable --now kasane-indexer.service
```
