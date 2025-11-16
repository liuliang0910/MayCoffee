# 数据库部署方案 - 最佳实践

## 📋 方案说明

采用 **混合方案**：
- ✅ GitHub保存 **初始化模板** (database_template.db)
- ✅ 服务器使用 **生产数据库** (messages.db)
- ✅ 本地使用 **测试数据库** (messages.db，不上传)

---

## 🎯 为什么这样做？

### GitHub保存模板的好处：
1. **快速部署** - 新服务器直接复制模板即可
2. **标准化** - 所有环境都用同样的初始结构
3. **安全** - 模板中没有用户数据，只有商品信息
4. **轻量** - 只有几KB大小，不会让仓库膨胀

### 不保存生产数据的原因：
1. **数据安全** - 用户信息、会员数据不会泄露
2. **避免冲突** - 不会有数据库版本冲突
3. **仓库轻量** - Git仓库不会因数据增长而膨胀

---

## 📁 文件说明

```
项目目录/
├── database_template.db         # 初始化模板（提交到GitHub）
├── messages.db                  # 生产/测试数据库（被gitignore）
├── create_database_template.py  # 创建模板的脚本
└── .gitignore                   # 配置忽略规则
```

---

## 🚀 使用流程

### 1. 创建数据库模板（仅需一次）

在本地运行：
```bash
python3 create_database_template.py
```

这会生成 `database_template.db`，包含：
- ✅ 完整的数据库结构（所有表）
- ✅ 8个示例兑换商品
- ❌ 没有用户数据、留言数据

### 2. 提交模板到GitHub

```bash
git add database_template.db
git add create_database_template.py
git add .gitignore
git commit -m "添加数据库初始化模板"
git push
```

### 3. 在服务器上初始化数据库

**首次部署时：**
```bash
# SSH连接服务器
ssh root@47.107.42.77

# 进入项目目录
cd /var/www/maycoffee

# 拉取最新代码
git pull

# 使用模板初始化数据库
cp database_template.db messages.db

# 重启服务
sudo systemctl restart maycoffee
```

**或者让代码自动创建：**
```bash
# 如果没有messages.db，Flask会自动创建空结构
# 然后运行初始化脚本添加商品
python3 init_redemption_items.py
```

---

## 🔄 日常工作流程

### 本地开发
```bash
# 1. 修改代码
vim app.py

# 2. 本地测试（使用本地messages.db）
python3 app.py

# 3. 提交代码（不包含messages.db）
git add app.py
git commit -m "更新功能"
git push
```

### 服务器自动同步
```bash
# Webhook自动触发：
# 1. git pull 拉取代码
# 2. systemctl restart maycoffee
# 3. messages.db保持不变（用户数据不丢失）
```

---

## 🆕 新服务器部署

如果要换服务器或新建环境：

```bash
# 1. 克隆项目
git clone https://github.com/liuliang0910/MayCoffee.git
cd MayCoffee

# 2. 使用模板初始化数据库
cp database_template.db messages.db

# 3. 安装依赖
pip3 install -r requirements.txt

# 4. 启动服务
python3 app.py

# 完成！数据库结构和商品都有了
```

---

## 🔧 数据库结构更新

如果修改了数据库模型（如添加新表），需要：

### 1. 更新模板
```bash
# 本地运行
python3 create_database_template.py

# 提交新模板
git add database_template.db
git commit -m "更新数据库结构：添加XXX表"
git push
```

### 2. 更新服务器数据库

**方法A：重建（会丢失数据，测试环境用）**
```bash
rm messages.db
cp database_template.db messages.db
```

**方法B：手动迁移（生产环境）**
```bash
# 先备份
cp messages.db messages_backup_$(date +%Y%m%d).db

# 手动执行SQL添加新表/字段
# 或使用Flask-Migrate工具
```

---

## 💾 数据库备份策略

### 自动备份脚本
```bash
# 在服务器创建备份脚本
cat > /var/www/maycoffee/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/maycoffee/backups"
mkdir -p $BACKUP_DIR

# 每日备份
cp /var/www/maycoffee/messages.db \
   $BACKUP_DIR/messages_$(date +%Y%m%d).db

# 只保留最近30天
find $BACKUP_DIR -name "messages_*.db" -mtime +30 -delete

echo "✅ 数据库备份完成: $(date)"
EOF

chmod +x /var/www/maycoffee/backup_db.sh
```

### 设置定时任务
```bash
# 每天凌晨3点自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/maycoffee/backup_db.sh >> /var/www/maycoffee/backup.log 2>&1") | crontab -
```

### 下载备份到本地
```bash
# 定期下载到本地保存
scp root@47.107.42.77:/var/www/maycoffee/backups/messages_*.db ~/backups/
```

---

## 📊 当前数据库表结构

模板中包含的表：

| 表名 | 说明 | 初始数据 |
|------|------|----------|
| Message | 留言表 | 空 |
| Reply | 回复表 | 空 |
| Member | 会员表 | 空 |
| PointRecord | 积分记录表 | 空 |
| RedemptionItem | 兑换商品表 | 8个商品 |
| Redemption | 兑换记录表 | 空 |
| CheckIn | 签到记录表 | 空 |
| Invitation | 邀请记录表 | 空 |
| PasswordResetToken | 密码重置令牌表 | 空 |

---

## ⚠️ 重要提醒

### ✅ 要做的
1. **定期备份** 服务器数据库
2. **测试环境** 使用独立数据库
3. **代码和数据分离** 不要混在一起
4. **更新模板** 当数据库结构变化时

### ❌ 不要做
1. **不要提交** messages.db 到GitHub
2. **不要在生产数据库上** 随意测试
3. **不要删除** 服务器的messages.db
4. **不要跳过** 数据库备份

---

## 🎉 总结

这个方案的优势：

| 特性 | 说明 |
|------|------|
| 🚀 快速部署 | 有模板，新环境秒级初始化 |
| 🔒 数据安全 | 用户数据不上传GitHub |
| 💾 易于备份 | 独立的备份策略 |
| 🔄 便于更新 | 代码和数据独立更新 |
| 📦 仓库轻量 | Git仓库不会膨胀 |
| 🛠️ 易于维护 | 清晰的文件职责 |

**你现在拥有最佳的数据库管理方案！** ✨
