#!/bin/bash

# 五月咖啡网站 - 阿里云自动部署脚本
# 使用方法: bash deploy_aliyun.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置信息
SERVER_IP="47.107.42.77"
SERVER_USER="root"
APP_PATH="/var/www/maycoffee"
GITHUB_REPO="https://github.com/liuliang0910/MayCoffee.git"

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}五月咖啡网站 - 阿里云部署脚本${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# 第一步：连接测试
echo -e "${YELLOW}步骤 1: 测试服务器连接...${NC}"
if ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo '连接成功'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 服务器连接成功${NC}"
else
    echo -e "${RED}✗ 无法连接到服务器 ${SERVER_IP}${NC}"
    echo "请检查:"
    echo "1. 服务器 IP 是否正确"
    echo "2. 是否已配置 SSH 密钥"
    echo "3. 防火墙是否允许 SSH 连接"
    exit 1
fi

# 第二步：安装依赖
echo -e "${YELLOW}步骤 2: 安装系统依赖...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
    # 检测操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    fi

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        echo "检测到 Ubuntu/Debian 系统"
        apt update -qq
        apt install -y python3 python3-pip python3-venv nginx git > /dev/null 2>&1
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        echo "检测到 CentOS/RHEL 系统"
        yum update -y -q
        yum install -y python3 python3-pip nginx git > /dev/null 2>&1
    else
        echo "未知的操作系统: $OS"
        exit 1
    fi
    echo "系统依赖安装完成"
EOF
echo -e "${GREEN}✓ 系统依赖安装完成${NC}"

# 第三步：克隆或更新项目
echo -e "${YELLOW}步骤 3: 克隆/更新项目...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    if [ -d "${APP_PATH}" ]; then
        echo "项目已存在，更新中..."
        cd ${APP_PATH}
        git pull origin main
    else
        echo "克隆项目中..."
        mkdir -p ${APP_PATH}
        git clone ${GITHUB_REPO} ${APP_PATH}
    fi
EOF
echo -e "${GREEN}✓ 项目克隆/更新完成${NC}"

# 第四步：设置 Python 虚拟环境
echo -e "${YELLOW}步骤 4: 设置 Python 虚拟环境...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << EOF
    cd ${APP_PATH}
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    # 激活虚拟环境并安装依赖
    source venv/bin/activate
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    pip install -q gunicorn
    
    echo "Python 依赖安装完成"
EOF
echo -e "${GREEN}✓ Python 虚拟环境设置完成${NC}"

# 第五步：配置 Nginx
echo -e "${YELLOW}步骤 5: 配置 Nginx...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
    # 创建 Nginx 配置
    cat > /etc/nginx/sites-available/maycoffee << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias /var/www/maycoffee/;
        expires 30d;
    }
}
NGINX_CONFIG

    # 启用配置
    if [ ! -L /etc/nginx/sites-enabled/maycoffee ]; then
        ln -s /etc/nginx/sites-available/maycoffee /etc/nginx/sites-enabled/
    fi

    # 禁用默认配置
    rm -f /etc/nginx/sites-enabled/default

    # 测试配置
    nginx -t > /dev/null 2>&1 && echo "Nginx 配置正确" || echo "Nginx 配置有误"

    # 重启 Nginx
    systemctl restart nginx
    echo "Nginx 配置完成"
EOF
echo -e "${GREEN}✓ Nginx 配置完成${NC}"

# 第六步：配置 Systemd 服务
echo -e "${YELLOW}步骤 6: 配置 Systemd 服务...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
    cat > /etc/systemd/system/maycoffee.service << 'SERVICE_CONFIG'
[Unit]
Description=MayCoffee Flask Application
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/maycoffee
Environment="PATH=/var/www/maycoffee/venv/bin"
ExecStart=/var/www/maycoffee/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 app:app
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_CONFIG

    # 重新加载 systemd
    systemctl daemon-reload
    
    # 启动服务
    systemctl start maycoffee
    
    # 设置开机自启
    systemctl enable maycoffee
    
    echo "Systemd 服务配置完成"
EOF
echo -e "${GREEN}✓ Systemd 服务配置完成${NC}"

# 第七步：验证部署
echo -e "${YELLOW}步骤 7: 验证部署...${NC}"
sleep 2

# 检查应用是否运行
if ssh ${SERVER_USER}@${SERVER_IP} "systemctl is-active --quiet maycoffee"; then
    echo -e "${GREEN}✓ Flask 应用运行正常${NC}"
else
    echo -e "${RED}✗ Flask 应用未运行${NC}"
    echo "查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'journalctl -u maycoffee -n 20'"
fi

# 检查 Nginx 是否运行
if ssh ${SERVER_USER}@${SERVER_IP} "systemctl is-active --quiet nginx"; then
    echo -e "${GREEN}✓ Nginx 运行正常${NC}"
else
    echo -e "${RED}✗ Nginx 未运行${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "访问地址: ${YELLOW}http://${SERVER_IP}${NC}"
echo -e "管理后台: ${YELLOW}http://${SERVER_IP}/admin${NC}"
echo ""
echo "常用命令:"
echo "  查看状态:   ssh ${SERVER_USER}@${SERVER_IP} 'systemctl status maycoffee'"
echo "  查看日志:   ssh ${SERVER_USER}@${SERVER_IP} 'journalctl -u maycoffee -f'"
echo "  重启应用:   ssh ${SERVER_USER}@${SERVER_IP} 'systemctl restart maycoffee'"
echo "  更新代码:   ssh ${SERVER_USER}@${SERVER_IP} 'cd ${APP_PATH} && git pull && systemctl restart maycoffee'"
echo ""
