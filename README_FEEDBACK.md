# 五月咖啡 - 客户留言系统

## 功能介绍

这是一个完整的客户留言系统，包括：

1. **客户留言页面** (`feedback.html`)
   - 客户可以填写名字、邮箱、留言内容
   - 支持上传图片和视频
   - 显示所有已批准的留言

2. **管理后台** (`/admin`)
   - 查看所有留言（已批准和待审核）
   - 批准待审核的留言
   - 删除不合适的留言
   - 统计留言数量

3. **数据库**
   - 使用SQLite存储所有留言
   - 自动保存上传的图片和视频

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行程序

```bash
python app.py
```

程序会在 `http://localhost:5000` 启动

### 3. 访问页面

- **客户留言页面**: http://localhost:5000/feedback.html
- **管理后台登录**: http://localhost:5000/admin/login
  - 默认密码: `admin123`

## 文件说明

| 文件 | 说明 |
|------|------|
| `app.py` | 后端代码（Python Flask） |
| `requirements.txt` | 依赖包列表 |
| `feedback.html` | 客户留言页面 |
| `js/feedback.js` | 留言页面的JavaScript代码 |
| `templates/admin.html` | 管理后台页面 |
| `templates/admin_login.html` | 管理员登录页面 |
| `messages.db` | 数据库文件（自动生成） |
| `uploads/` | 上传的图片和视频文件夹（自动生成） |

## 重要配置

### 修改管理员密码

打开 `app.py`，找到这一行：

```python
if password == 'admin123':
```

改成你想要的密码，例如：

```python
if password == 'your-new-password':
```

### 修改密钥

为了安全，建议修改 `app.py` 中的密钥：

```python
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
```

改成一个随机的字符串。

## 部署到阿里云

### 方法1：使用ECS（推荐）

1. **连接到服务器**
   ```bash
   ssh root@47.107.42.77
   ```

2. **安装Python和依赖**
   ```bash
   apt-get update
   apt-get install python3 python3-pip
   ```

3. **上传项目文件**
   ```bash
   scp -r ./* root@47.107.42.77:/var/www/maycoffee/
   ```

4. **安装Python依赖**
   ```bash
   cd /var/www/maycoffee
   pip install -r requirements.txt
   ```

5. **使用Gunicorn运行**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

6. **配置Nginx反向代理**
   
   编辑 `/etc/nginx/sites-available/default`：
   
   ```nginx
   server {
       listen 80;
       server_name 47.107.42.77;  # 改成你的域名或IP
   
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   
       location /uploads {
           alias /var/www/maycoffee/uploads;
       }
   }
   ```

7. **重启Nginx**
   ```bash
   systemctl restart nginx
   ```

### 方法2：使用PM2保持程序运行

```bash
npm install -g pm2
pm2 start app.py --name "maycoffee"
pm2 startup
pm2 save
```

## 常见问题

### Q: 上传的文件在哪里？
A: 在 `uploads/` 文件夹里。部署到服务器时，记得定期备份这个文件夹。

### Q: 如何备份留言？
A: 备份 `messages.db` 文件即可。这是SQLite数据库文件，包含所有留言。

### Q: 如何修改留言的审核规则？
A: 在 `app.py` 中修改 `approved` 字段的默认值。目前设置为 `False`（需要审核）。

### Q: 支持哪些文件格式？
A: 
- 图片: PNG, JPG, JPEG, GIF
- 视频: MP4, AVI, MOV, WEBM

### Q: 文件大小有限制吗？
A: 有，默认最大100MB。可以在 `app.py` 中修改：
```python
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 改成你想要的大小
```

## 技术栈

- **后端**: Python Flask
- **数据库**: SQLite
- **前端**: HTML5, CSS3, JavaScript
- **服务器**: Nginx + Gunicorn

## 安全建议

1. ✅ 修改默认管理员密码
2. ✅ 修改SECRET_KEY
3. ✅ 定期备份数据库
4. ✅ 定期清理过期的上传文件
5. ✅ 使用HTTPS（部署到服务器时）
6. ✅ 设置文件上传大小限制

## 需要帮助？

如有问题，请检查：
1. Python版本是否为3.6+
2. 所有依赖是否已安装
3. 端口5000是否被占用
4. 文件权限是否正确

祝你使用愉快！🎉
