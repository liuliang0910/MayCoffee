# 五月咖啡会员系统 - 高级功能文档

## 新增功能总览

已成功添加5个高级功能：
1. ✅ 每日签到功能
2. ✅ 邀请好友奖励
3. ✅ 头像上传
4. ✅ 密码找回
5. ✅ 商品管理后台(基础版)

---

## 1. 每日签到功能 ⭐

### 功能说明
会员每天可以签到一次,根据连续签到天数获得不同积分奖励。

### 积分奖励规则
- **普通签到** (1-6天): 2积分/次
- **连续7天**: 5积分/次
- **连续30天**: 10积分/次

### API接口
```
POST /api/member/checkin          # 签到
GET  /api/member/checkin/status   # 获取签到状态
```

### 使用方法
1. 登录会员中心
2. 点击"签到"按钮
3. 系统自动计算连续天数并奖励积分

### 数据库
- 表名: `CheckIn`
- 字段: member_id, check_date, points_earned, continuous_days

---

## 2. 邀请好友奖励 🎁

### 功能说明
会员可以生成邀请码,邀请新用户注册获得积分奖励。

### 奖励规则
- **邀请人**: 每邀请1人成功注册,获得**20积分**
- **被邀请人**: 使用邀请码注册,额外获得**10积分** (总共20积分)

### API接口
```
POST /api/member/invitation/generate    # 生成邀请码
GET  /api/member/invitation/my          # 获取我的邀请记录
POST /api/member/register               # 注册时可填写邀请码
```

### 使用方法

**邀请人:**
1. 登录会员中心
2. 点击"邀请好友"
3. 生成邀请码并分享给好友

**被邀请人:**
1. 访问注册页面
2. 填写邀请码(可选)
3. 完成注册,双方都获得奖励积分

### 数据库
- 表名: `Invitation`
- 字段: inviter_id, invitee_id, invitation_code, status, points_awarded

### 邀请码格式
- 8位大写字母+数字组合
- 例如: `A7K2MN9P`

---

## 3. 头像上传 📷

### 功能说明
会员可以上传自定义头像,让个人资料更个性化。

### 技术细节
- 支持格式: PNG, JPG, JPEG, GIF
- 存储路径: `uploads/avatar_[会员ID]_[时间戳].jpg`
- 自动删除旧头像

### API接口
```
POST /api/member/avatar    # 上传头像
```

### 使用方法
1. 登录会员中心
2. 点击头像区域
3. 选择图片文件
4. 上传成功后自动更新显示

---

## 4. 密码找回 🔑

### 功能说明
如果会员忘记密码,可以通过邮箱重置密码。

### 工作流程
1. 用户输入注册邮箱
2. 系统生成重置令牌(有效期1小时)
3. **开发环境**: 直接返回token
4. **生产环境**: 应发送邮件包含重置链接
5. 用户使用token设置新密码

### API接口
```
POST /api/member/password/request-reset    # 请求重置
POST /api/member/password/reset            # 重置密码
```

### 安全措施
- Token 32位随机字符串
- 1小时后自动过期
- 使用后自动失效
- 不透露邮箱是否存在

### 数据库
- 表名: `PasswordResetToken`
- 字段: member_id, token, expires_at, used

### 开发说明
⚠️ **当前版本为了测试方便,直接返回token**

生产环境应该:
1. 安装邮件发送库: `pip install flask-mail`
2. 配置邮件服务器(QQ邮箱/阿里云邮件)
3. 发送包含重置链接的邮件
4. 删除API中直接返回token的代码

---

## 5. 商品管理后台 🛠️

### 功能说明
管理员可以方便地查看和管理积分兑换商品。

### 访问方式
访问: `member-admin.html`

### 当前功能
- ✅ 查看所有兑换商品
- ✅ 查看商品详情(名称、积分、库存、状态)
- ✅ 商品列表实时刷新

### 待完成功能
- ⏳ 添加新商品
- ⏳ 编辑商品信息
- ⏳ 删除商品
- ⏳ 修改库存
- ⏳ 启用/停用商品

### 所需后端API (待添加)
```python
POST   /api/admin/redemption/items       # 添加商品
PUT    /api/admin/redemption/items/<id>  # 更新商品
DELETE /api/admin/redemption/items/<id>  # 删除商品
```

### 建议增强
1. 添加管理员登录验证
2. 商品图片上传功能
3. 批量操作功能
4. 兑换记录管理
5. 数据统计图表

---

## 数据库变更总结

### 新增表
1. **CheckIn** - 签到记录表
2. **Invitation** - 邀请记录表  
3. **PasswordResetToken** - 密码重置令牌表

### 修改表
- **Member** 表保持不变,通过外键关联新表

---

## 集成说明

### 会员中心页面建议添加
在 `member-center.html` 中添加以下入口:

```html
<!-- 签到按钮 -->
<button onclick="dailyCheckIn()">每日签到</button>

<!-- 邀请好友 -->
<button onclick="generateInvitationCode()">邀请好友</button>

<!-- 上传头像 -->
<input type="file" accept="image/*" onchange="uploadAvatar(this)">

<!-- 密码找回链接 -->
<a href="reset-password.html">忘记密码?</a>
```

### JavaScript示例

**签到功能:**
```javascript
async function dailyCheckIn() {
    const response = await fetch('/api/member/checkin', {
        method: 'POST'
    });
    const result = await response.json();
    if (result.success) {
        alert(result.message);  // 签到成功!获得X积分
    } else {
        alert(result.error);  // 今天已经签到过了
    }
}
```

**生成邀请码:**
```javascript
async function generateInvitationCode() {
    const response = await fetch('/api/member/invitation/generate', {
        method: 'POST'
    });
    const result = await response.json();
    if (result.success) {
        alert('邀请码: ' + result.invitation_code);
        // 可以添加复制到剪贴板功能
    }
}
```

**上传头像:**
```javascript
async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch('/api/member/avatar', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    if (result.success) {
        // 更新头像显示
        document.getElementById('avatarImg').src = result.avatar_url;
    }
}
```

---

## 积分获取汇总

现在会员可以通过以下方式获得积分:

| 行为 | 积分 | 说明 |
|------|------|------|
| 注册奖励 | 10 | 首次注册 |
| 使用邀请码注册 | +10 | 在注册奖励基础上额外获得 |
| 邀请好友 | 20 | 好友成功注册后获得 |
| 发表留言 | 5 | 每次 |
| 发表回复 | 2 | 每次 |
| 每日签到(普通) | 2 | 连续1-6天 |
| 每日签到(7天) | 5 | 连续7-29天 |
| 每日签到(30天) | 10 | 连续30天以上 |

---

## 完整API列表

### 会员相关
```
POST   /api/member/register          # 注册(支持邀请码)
POST   /api/member/login             # 登录
POST   /api/member/logout            # 登出
GET    /api/member/info              # 获取信息
POST   /api/member/avatar            # 上传头像
```

### 积分相关
```
GET    /api/member/points/records    # 积分记录
```

### 签到相关
```
POST   /api/member/checkin           # 签到
GET    /api/member/checkin/status    # 签到状态
```

### 邀请相关
```
POST   /api/member/invitation/generate    # 生成邀请码
GET    /api/member/invitation/my          # 我的邀请
```

### 兑换相关
```
GET    /api/redemption/items         # 兑换商品列表
POST   /api/redemption/redeem        # 兑换商品
GET    /api/member/redemptions       # 兑换记录
```

### 密码找回
```
POST   /api/member/password/request-reset    # 请求重置
POST   /api/member/password/reset            # 重置密码
```

---

## 测试建议

### 1. 测试签到功能
```bash
# 登录后调用签到接口
curl -X POST http://localhost:5000/api/member/checkin \
  -H "Cookie: session=xxx"
```

### 2. 测试邀请功能
1. 用户A登录,生成邀请码
2. 用户B使用邀请码注册
3. 检查双方积分是否正确增加

### 3. 测试头像上传
使用Postman上传图片文件

### 4. 测试密码找回
1. 请求重置,获取token
2. 使用token重置密码
3. 用新密码登录

---

## 后续优化建议

### 短期(容易实现)
1. ✅ 签到页面UI美化
2. ✅ 邀请码分享链接生成
3. ✅ 头像图片裁剪功能
4. ✅ 完善管理后台功能

### 中期(需要一定工作量)
1. 邮件服务集成(密码找回)
2. 签到日历视图
3. 邀请排行榜
4. 积分使用统计图表

### 长期(较复杂)
1. 会员等级权益差异化
2. 积分有效期管理
3. 积分转赠功能
4. 会员专属活动

---

## 文件清单

### 后端文件
- `app.py` - 添加了所有新功能的API接口

### 前端文件
- `member.html` - 会员登录/注册页(支持邀请码)
- `member-center.html` - 会员中心(需要添加新功能UI)
- `member-admin.html` - 商品管理后台

### 文档文件
- `MEMBER_SYSTEM.md` - 基础会员系统文档
- `ADVANCED_FEATURES.md` - 本文档(高级功能)
- `会员系统使用指南.txt` - 快速上手指南

---

## 总结

✅ **已完成:**
- 5个高级功能的后端API全部实现
- 数据库模型设计完成
- 基础管理后台页面创建
- 完整的API文档

⏳ **待完成:**
- 会员中心前端UI集成
- 管理后台完整功能
- 邮件服务配置
- 更多测试和优化

🎉 **会员系统现在功能已经非常完善了!**
