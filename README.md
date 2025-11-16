# 五月咖啡（MayCoffee）网站

一个现代化的咖啡店网站，包含产品展示、关于我们、联系方式和客户留言系统。
2025年11月16日，我做了自动同步，现在看看是否成功

## 功能特性

- 🏠 **首页** - 咖啡店介绍和品牌展示
- ☕ **产品菜单** - 完整的咖啡产品列表
- ℹ️ **关于我们** - 店铺信息和故事
- 📞 **联系我们** - 联系方式和地址
- 💬 **客户留言** - 实时留言板系统
  - 无需审核，直接发布
  - 支持上传图片和视频
  - 显示用户名、时间和留言内容

## 技术栈

- **后端**: Python Flask
- **数据库**: SQLite
- **前端**: HTML5 + CSS3 + JavaScript
- **特性**: RESTful API、文件上传、实时更新

## 快速开始

### 1. 克隆项目
```bash
git clone <你的仓库地址>
cd MayCoffee
```

### 2. 创建虚拟环境
```bash
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# 或
venv\Scripts\activate  # Windows
```

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 运行应用
```bash
python app.py
```

应用将在 `http://localhost:8000` 启动

## 项目结构

```
MayCoffee/
├── app.py                 # Flask 主应用
├── requirements.txt       # Python 依赖
├── index.html            # 首页
├── menu.html             # 产品菜单
├── about.html            # 关于我们
├── contact.html          # 联系我们
├── feedback.html         # 客户留言
├── css/                  # 样式文件
├── js/                   # JavaScript 文件
├── images/               # 图片资源
├── templates/            # Flask 模板
├── uploads/              # 用户上传文件
└── instance/             # Flask 实例文件
```

## 留言系统说明

### 发布留言
1. 点击"✍️ 发帖"按钮
2. 填写名字、邮箱和留言内容
3. 可选：上传图片或视频
4. 点击"提交留言"
5. 留言立即显示在列表中

### 留言显示
- 显示用户名和发布时间
- 显示留言文本内容
- 图片和视频保存但不显示在前端

### 管理后台
访问 `/admin` 可以查看所有留言（需要登录）
- 默认密码：`admin123`（建议修改）

## 部署

### 本地开发
```bash
python app.py
```

### 生产环境（使用 Gunicorn）
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### 使用 Nginx 反向代理
参考 `deploy.sh` 脚本进行完整部署

## 配置说明

### 修改管理员密码
编辑 `app.py` 第 113 行：
```python
if password == 'admin123':  # 改成你的密码
```

### 修改最大文件上传大小
编辑 `app.py` 第 13 行：
```python
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
```

### 支持的文件格式
- **图片**: PNG, JPG, JPEG, GIF
- **视频**: MP4, AVI, MOV, WEBM

## 常见问题

### Q: 如何修改网站标题和内容？
A: 编辑对应的 HTML 文件（index.html, menu.html 等）

### Q: 如何更改咖啡店信息？
A: 编辑 about.html 和 contact.html

### Q: 留言数据存储在哪里？
A: 存储在 SQLite 数据库 `instance/messages.db` 中

### Q: 如何备份留言数据？
A: 复制 `instance/messages.db` 文件即可

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或 Pull Request

---

**最后更新**: 2025年10月28日
