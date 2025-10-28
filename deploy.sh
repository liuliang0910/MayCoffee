#!/bin/bash

# 五月咖啡网站部署脚本
# 部署到阿里云服务器

echo "开始部署五月咖啡网站..."

# 服务器信息
SERVER_IP="47.107.42.77"
SERVER_USER="root"
SERVER_PATH="/var/www/html"

# 当前项目路径
PROJECT_PATH="/Users/liuliang/Library/Mobile Documents/com~apple~CloudDocs/222 - Web | 网页/20250919，测试"

# 1. 备份服务器上的旧文件(如果有)
echo "步骤1: 备份旧文件..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p /root/backup && cp -r ${SERVER_PATH}/* /root/backup/ 2>/dev/null || true"

# 2. 清空目标目录
echo "步骤2: 清空目标目录..."
ssh ${SERVER_USER}@${SERVER_IP} "rm -rf ${SERVER_PATH}/*"

# 3. 上传所有文件到服务器
echo "步骤3: 上传文件到服务器..."
scp -r "${PROJECT_PATH}"/*.html ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/
scp -r "${PROJECT_PATH}"/css ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/
scp -r "${PROJECT_PATH}"/js ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/
scp -r "${PROJECT_PATH}"/images ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/

# 4. 设置文件权限
echo "步骤4: 设置文件权限..."
ssh ${SERVER_USER}@${SERVER_IP} "chmod -R 755 ${SERVER_PATH}"

# 5. 重启Nginx
echo "步骤5: 重启Nginx..."
ssh ${SERVER_USER}@${SERVER_IP} "systemctl restart nginx || service nginx restart"

echo "================================"
echo "部署完成!"
echo "访问地址: http://${SERVER_IP}"
echo "旧文件已备份到服务器: /root/backup/"
echo "================================"
