#!/bin/bash
# ============================================================
#  五月咖啡 一键部署脚本
#  用法：在项目目录里运行   ./deploy.sh
#  作用：① 提交并推送到 GitHub（备份/版本）
#        ② 同步文件到阿里云服务器并重启网站
#  说明：会自动跳过 数据库 / 上传文件 / 虚拟环境 等，
#        绝不会覆盖客户留言、订单、会员等线上数据。
# ============================================================

set -e
cd "$(dirname "$0")"

SERVER="root@47.107.42.77"
APP_DIR="/var/www/maycoffee"
KEY="$HOME/.ssh/maycoffee_deploy"
SSH_OPTS="-i $KEY -o StrictHostKeyChecking=no -o ConnectTimeout=20"

echo ""
echo "==> 1/3 提交并推送到 GitHub ..."
git add -A
if git diff --cached --quiet; then
    echo "    （没有新的改动需要提交）"
else
    git commit -m "更新 - $(date '+%Y-%m-%d %H:%M:%S')"
fi
if git push origin main; then
    echo "    GitHub 推送成功"
else
    echo "    ⚠️  GitHub 推送失败（请检查代理 Shadowrocket 是否开启）；仍会继续部署到服务器"
fi

echo ""
echo "==> 2/3 同步文件到服务器 ..."
rsync -az --no-perms --no-owner --no-group --timeout=120 \
    --exclude '.git' \
    --exclude 'venv' \
    --exclude '.venv' \
    --exclude 'venv_test' \
    --exclude 'env' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'messages.db' \
    --exclude '*.sqlite' \
    --exclude 'instance' \
    --exclude 'uploads' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    -e "ssh $SSH_OPTS" \
    ./ "$SERVER:$APP_DIR/"

echo ""
echo "==> 3/3 重启网站服务 ..."
ssh $SSH_OPTS "$SERVER" "systemctl restart maycoffee && sleep 2 && systemctl is-active maycoffee"

echo ""
echo "✅ 部署完成！打开 https://www.maycoffee.com.cn 查看效果"
