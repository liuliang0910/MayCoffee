# 五月咖啡网站 - 阿里云部署指南

## 部署架构

```
客户端浏览器
    ↓
Nginx (反向代理, 端口 80)
    ↓
Gunicorn (Flask 应用服务器, 端口 8000)
    ↓
Python Flask 应用
    ↓
SQLite 数据库
```

## 前置准备

### 1. 服务器信息
- **IP 地址**: 47.107.42.77
- **用户**: root
- **操作系统**: Linux (Ubuntu 或 CentOS)

### 2. 本地需要安装
- Git
- SSH 客户端（Mac/Linux 自带，Windows 用 PuTTY 或 Git Bash）

## 部署步骤

### 第一步：连接到服务器

```bash
ssh root@47.107.42.77
```

### 第二步：安装依赖

```bash
# 更新系统
apt update && apt upgrade -y  # Ubuntu
# 或
yum update -y  # CentOS

# 安装 Python 和 pip
apt install python3 python3-pip -y  # Ubuntu
# 或
yum install python3 python3-pip -y  # CentOS

# 安装 Nginx
apt install nginx -y  # Ubuntu
# 或
yum install nginx -y  # CentOS

# 安装 Git
apt install git -y  # Ubuntu
# 或
yum install git -y  # CentOS
```

### 第三步：克隆项目

```bash
# 创建应用目录
mkdir -p /var/www/maycoffee
cd /var/www/maycoffee

# 克隆项目
git clone https://github.com/liuliang0910/MayCoffee.git .
```

### 第四步：安装 Python 依赖

```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 安装 Gunicorn
pip install gunicorn
```

### 第五步：配置 Nginx

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/maycoffee
```

粘贴以下内容：

```nginx
server {
    listen 80;
    server_name 47.107.42.77;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/maycoffee/;
    }
}
```

启用配置：

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/maycoffee /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 第六步：运行 Flask 应用

```bash
cd /var/www/maycoffee

# 激活虚拟环境
source venv/bin/activate

# 运行 Gunicorn
gunicorn -w 4 -b 127.0.0.1:8000 app:app
```

### 第七步：配置后台运行（使用 Systemd）

创建 systemd 服务文件：

```bash
sudo nano /etc/systemd/system/maycoffee.service
```

粘贴以下内容：

```ini
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

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start maycoffee

# 设置开机自启
sudo systemctl enable maycoffee

# 查看服务状态
sudo systemctl status maycoffee
```

## 验证部署

1. **访问网站**：在浏览器中打开 `http://47.107.42.77`

2. **检查日志**：
```bash
# 查看应用日志
sudo journalctl -u maycoffee -f

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

3. **测试留言功能**：
   - 点击"✍️ 发帖"按钮
   - 填写信息并提交
   - 确认留言显示在列表中

## 常见问题

### Q: 访问网站显示 502 Bad Gateway
**A**: 检查 Gunicorn 是否运行
```bash
sudo systemctl status maycoffee
sudo journalctl -u maycoffee -f
```

### Q: 上传文件失败
**A**: 检查文件夹权限
```bash
chmod -R 755 /var/www/maycoffee/uploads
```

### Q: 数据库错误
**A**: 检查数据库文件权限
```bash
chmod 666 /var/www/maycoffee/instance/messages.db
chmod 755 /var/www/maycoffee/instance
```

### Q: 如何更新代码
**A**: 在服务器上执行
```bash
cd /var/www/maycoffee
git pull origin main
sudo systemctl restart maycoffee
```

## 安全建议

1. **修改管理员密码**
   - 编辑 `app.py` 第 113 行
   - 修改 `admin123` 为强密码
   - 重启应用

2. **设置 SSL 证书**（使用 Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 47.107.42.77
```

3. **定期备份数据库**
```bash
# 创建备份脚本
cp /var/www/maycoffee/instance/messages.db /backup/messages.db.$(date +%Y%m%d)
```

## 监控和维护

### 查看应用状态
```bash
sudo systemctl status maycoffee
```

### 重启应用
```bash
sudo systemctl restart maycoffee
```

### 查看实时日志
```bash
sudo journalctl -u maycoffee -f
```

### 查看 Nginx 状态
```bash
sudo systemctl status nginx
```

## 域名配置（可选）

如果你有自己的域名，可以在 Nginx 配置中修改：

```nginx
server_name yourdomain.com www.yourdomain.com;
```

然后在域名提供商的 DNS 设置中，将 A 记录指向 `47.107.42.77`。

---

**部署完成后，你的网站就可以通过 http://47.107.42.77 访问了！**
