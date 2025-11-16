from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import requests
import json

app = Flask(__name__, static_folder='.', static_url_path='', template_folder='templates')

# 配置数据库
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///messages.db'
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB 最大文件大小

# ========== Server酱微信通知配置 ==========
# 获取方法：访问 https://sct.ftqq.com/ 用微信扫码登录，复制你的 SCKEY
SERVERCHAN_CONFIG = {
    'sckey': 'SCT301624TZDqlL8mmujOqH7Q7jnJK52kU'  # 替换为你的 Server酱 SCKEY
}

# 创建上传文件夹
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# ========== Server酱微信通知函数 ==========
def send_wechat_notification(message_type, customer_name, content_preview):
    """
    通过 Server酱 发送微信通知
    message_type: 'message' 表示新留言，'reply' 表示新回复
    customer_name: 客户名字
    content_preview: 内容预览（前100个字符）
    """
    try:
        # 检查配置是否完整
        if SERVERCHAN_CONFIG['sckey'] == 'YOUR_SCKEY':
            print("⚠️  Server酱配置未完成，跳过发送微信通知")
            return False
        
        # 准备通知内容
        if message_type == 'message':
            title = f"🔔 新留言 - {customer_name}"
            desp = f"**客户名字**: {customer_name}\n\n**内容**: {content_preview}"
        else:
            title = f"💬 新回复 - {customer_name}"
            desp = f"**回复人**: {customer_name}\n\n**内容**: {content_preview}"
        
        # Server酱 API 地址
        url = f"https://sct.ftqq.com/{SERVERCHAN_CONFIG['sckey']}.send"
        
        # 发送请求
        data = {
            'text': title,
            'desp': desp
        }
        
        response = requests.post(url, data=data, timeout=10)
        print(f"📤 Server酱响应状态码: {response.status_code}")
        print(f"📤 Server酱响应内容: {response.text}")
        
        try:
            result = response.json()
            if result.get('errno') == 0:
                print(f"✅ 微信通知已发送: {title}")
                return True
            else:
                print(f"❌ 微信通知发送失败: {result.get('errmsg', '未知错误')}")
                return False
        except Exception as json_error:
            print(f"❌ 解析 Server酱 响应失败: {str(json_error)}")
            print(f"❌ 原始响应: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ 微信通知发送异常: {str(e)}")
        return False

# 定义回复模型
class Reply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('reply.id'), nullable=True)  # 用于嵌套回复
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255))
    video_path = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    children = db.relationship('Reply', remote_side=[id], backref='parent')

    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'parent_id': self.parent_id,
            'name': self.name,
            'email': self.email,
            'content': self.content,
            'image_path': self.image_path,
            'video_path': self.video_path,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'children': [child.to_dict() for child in (self.children or [])]
        }

# 定义留言模型
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)  # 新字段：留言主题
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(255))  # 保留旧字段用于兼容
    image_paths = db.Column(db.Text)  # 新字段：存储多张图片，用逗号分隔
    video_path = db.Column(db.String(255))
    file_paths = db.Column(db.Text)  # 新字段：存储多个文件，用逗号分隔
    approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    replies = db.relationship('Reply', backref='message', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        # 优先使用 image_paths，如果没有则使用旧的 image_path
        image_list = []
        if self.image_paths:
            image_list = [img.strip() for img in self.image_paths.split(',') if img.strip()]
        elif self.image_path:
            # 兼容旧数据
            image_list = [self.image_path]
        
        # 处理文件列表
        file_list = []
        if self.file_paths:
            file_list = [f.strip() for f in self.file_paths.split(',') if f.strip()]
        
        return {
            'id': self.id,
            'title': self.title,  # 返回主题
            'name': self.name,
            'email': self.email,
            'content': self.content,
            'image_paths': image_list,  # 返回列表
            'image_path': image_list[0] if image_list else None,  # 兼容旧代码
            'video_path': self.video_path,
            'file_paths': file_list,  # 返回文件列表
            'approved': self.approved,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'replies': [reply.to_dict() for reply in self.replies]
        }

# 会员模型
class Member(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)  # 用户名
    email = db.Column(db.String(100), unique=True, nullable=False)  # 邮箱
    password = db.Column(db.String(200), nullable=False)  # 密码(加密)
    phone = db.Column(db.String(20))  # 手机号
    points = db.Column(db.Integer, default=0)  # 积分
    level = db.Column(db.String(20), default='普通会员')  # 会员等级
    avatar = db.Column(db.String(255), default='images/default-avatar.png')  # 头像
    created_at = db.Column(db.DateTime, default=datetime.now)  # 注册时间
    last_login = db.Column(db.DateTime)  # 最后登录时间
    
    # 关联积分记录
    point_records = db.relationship('PointRecord', backref='member', lazy=True)
    # 关联兑换记录
    redemptions = db.relationship('Redemption', backref='member', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'points': self.points,
            'level': self.level,
            'avatar': self.avatar,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'last_login': self.last_login.strftime('%Y-%m-%d %H:%M:%S') if self.last_login else None
        }

# 积分记录模型
class PointRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    points = db.Column(db.Integer, nullable=False)  # 积分变化(正数为增加,负数为减少)
    reason = db.Column(db.String(200), nullable=False)  # 积分变化原因
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'points': self.points,
            'reason': self.reason,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# 兑换商品模型
class RedemptionItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # 商品名称
    points_required = db.Column(db.Integer, nullable=False)  # 所需积分
    description = db.Column(db.Text)  # 商品描述
    image = db.Column(db.String(255))  # 商品图片
    stock = db.Column(db.Integer, default=999)  # 库存
    is_active = db.Column(db.Boolean, default=True)  # 是否启用
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'points_required': self.points_required,
            'description': self.description,
            'image': self.image,
            'stock': self.stock,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# 兑换记录模型
class Redemption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('redemption_item.id'), nullable=False)
    points_spent = db.Column(db.Integer, nullable=False)  # 消耗积分
    status = db.Column(db.String(20), default='待领取')  # 状态:待领取/已领取/已取消
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # 关联兑换商品
    item = db.relationship('RedemptionItem', backref='redemptions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'item': self.item.to_dict() if self.item else None,
            'points_spent': self.points_spent,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# 签到记录模型
class CheckIn(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    check_date = db.Column(db.Date, nullable=False)  # 签到日期
    points_earned = db.Column(db.Integer, default=1)  # 获得积分
    continuous_days = db.Column(db.Integer, default=1)  # 连续签到天数
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'check_date': self.check_date.strftime('%Y-%m-%d'),
            'points_earned': self.points_earned,
            'continuous_days': self.continuous_days,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

# 邀请记录模型
class Invitation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    inviter_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)  # 邀请人ID
    invitee_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=True)  # 被邀请人ID(注册后填写)
    invitation_code = db.Column(db.String(20), unique=True, nullable=False)  # 邀请码
    status = db.Column(db.String(20), default='未使用')  # 状态:未使用/已使用
    points_awarded = db.Column(db.Integer, default=0)  # 已奖励积分
    created_at = db.Column(db.DateTime, default=datetime.now)
    used_at = db.Column(db.DateTime)  # 使用时间
    
    # 关联邀请人
    inviter = db.relationship('Member', foreign_keys=[inviter_id], backref='sent_invitations')
    # 关联被邀请人
    invitee = db.relationship('Member', foreign_keys=[invitee_id], backref='received_invitation')
    
    def to_dict(self):
        return {
            'id': self.id,
            'inviter_id': self.inviter_id,
            'invitee_id': self.invitee_id,
            'invitation_code': self.invitation_code,
            'status': self.status,
            'points_awarded': self.points_awarded,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'used_at': self.used_at.strftime('%Y-%m-%d %H:%M:%S') if self.used_at else None
        }

# 密码重置令牌模型
class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)  # 重置令牌
    expires_at = db.Column(db.DateTime, nullable=False)  # 过期时间
    used = db.Column(db.Boolean, default=False)  # 是否已使用
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    member = db.relationship('Member', backref='reset_tokens')

# 创建数据库表
with app.app_context():
    db.create_all()

# 允许的文件类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov', 'webm'}

def allowed_file(filename):
    # 允许所有文件类型
    return '.' in filename

def allowed_upload_file(filename):
    # 用于媒体文件的检查
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 首页路由
@app.route('/')
def index():
    return app.send_static_file('index.html')

# 获取所有已批准的留言
@app.route('/api/messages', methods=['GET'])
def get_messages():
    messages = Message.query.filter_by(approved=True).order_by(Message.created_at.desc()).all()
    return jsonify([msg.to_dict() for msg in messages])

# 编辑留言
@app.route('/api/messages/<int:msg_id>', methods=['PUT'])
def update_message(msg_id):
    try:
        message = Message.query.get(msg_id)
        if not message:
            return jsonify({'error': '留言不存在'}), 404
        
        data = request.get_json()
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        
        if not title or not content:
            return jsonify({'error': '主题和内容不能为空'}), 400
        
        message.title = title
        message.content = content
        db.session.commit()
        
        return jsonify({'success': True, 'message': '留言已更新'}), 200
    except Exception as e:
        print(f"❌ 编辑留言出错: {str(e)}")
        return jsonify({'error': '编辑失败'}), 500

# 删除留言
@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def delete_message_api(msg_id):
    try:
        message = Message.query.get(msg_id)
        if not message:
            return jsonify({'error': '留言不存在'}), 404
        
        # 删除上传的文件
        if message.image_paths:
            file_list = [f.strip() for f in message.image_paths.split(',') if f.strip()]
            for file_path in file_list:
                if os.path.exists(file_path):
                    os.remove(file_path)
        
        if message.video_path and os.path.exists(message.video_path):
            os.remove(message.video_path)
        
        if message.file_paths:
            file_list = [f.strip() for f in message.file_paths.split(',') if f.strip()]
            for file_path in file_list:
                if os.path.exists(file_path):
                    os.remove(file_path)
        
        db.session.delete(message)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '留言已删除'}), 200
    except Exception as e:
        print(f"❌ 删除留言出错: {str(e)}")
        return jsonify({'error': '删除失败'}), 500

# 提交新留言
@app.route('/api/messages', methods=['POST'])
def submit_message():
    try:
        title = request.form.get('title', '').strip()
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        content = request.form.get('content', '').strip()
        
        if not title or not name or not email or not content:
            return jsonify({'error': '请填写所有必填项'}), 400
        
        message = Message(title=title, name=name, email=email, content=content)
        
        # 处理多张图片上传
        image_paths = []
        if 'images' in request.files:
            files = request.files.getlist('images')
            for file in files:
                if file and file.filename and allowed_upload_file(file.filename):
                    filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    image_paths.append(f"uploads/{filename}")
        
        # 兼容旧的单图片上传方式
        if 'image' in request.files and not image_paths:
            file = request.files['image']
            if file and file.filename and allowed_upload_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_paths.append(f"uploads/{filename}")
        
        if image_paths:
            message.image_paths = ','.join(image_paths)
        
        # 处理视频上传
        if 'video' in request.files:
            file = request.files['video']
            if file and file.filename and allowed_upload_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                message.video_path = f"uploads/{filename}"
        
        # 处理多个文件上传
        file_paths = []
        if 'files' in request.files:
            files = request.files.getlist('files')
            for file in files:
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    file_paths.append(f"uploads/{filename}")
        
        if file_paths:
            message.file_paths = ','.join(file_paths)
        
        # 直接批准留言，无需审核
        message.approved = True
        db.session.add(message)
        db.session.commit()
        
        # 发送微信通知
        content_preview = content[:100] if len(content) > 100 else content
        send_wechat_notification('message', name, content_preview)
        
        # 如果是会员登录状态,自动增加5积分
        member_id = session.get('member_id')
        points_earned = 0
        if member_id:
            add_points(member_id, 5, '发表留言')
            points_earned = 5
        
        response_message = '留言已发布'
        if points_earned > 0:
            response_message += f'!恭喜获得{points_earned}积分'
        
        return jsonify({'success': True, 'message': response_message}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 管理后台 - 查看待审核留言
@app.route('/admin')
def admin():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    return app.send_static_file('templates/admin.html')

# 管理后台 - 登录
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        # 改成你的管理员密码
        if password == 'admin123':
            session['admin_logged_in'] = True
            return redirect(url_for('admin'))
        else:
            # 返回登录页面并显示错误信息
            return render_template('admin_login.html', error='密码错误')
    return render_template('admin_login.html')

# 管理后台 - 获取所有留言
@app.route('/api/admin/messages', methods=['GET'])
def get_all_messages():
    if 'admin_logged_in' not in session:
        return jsonify({'error': '未授权'}), 401
    
    messages = Message.query.order_by(Message.created_at.desc()).all()
    return jsonify([msg.to_dict() for msg in messages])

# 管理后台 - 批准留言
@app.route('/api/admin/messages/<int:msg_id>/approve', methods=['POST'])
def approve_message(msg_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': '未授权'}), 401
    
    message = Message.query.get(msg_id)
    if not message:
        return jsonify({'error': '留言不存在'}), 404
    
    message.approved = True
    db.session.commit()
    return jsonify({'success': True})

# 管理后台 - 删除留言
@app.route('/api/admin/messages/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': '未授权'}), 401
    
    message = Message.query.get(msg_id)
    if not message:
        return jsonify({'error': '留言不存在'}), 404
    
    # 删除上传的文件 - 支持多张图片
    if message.image_paths:
        image_list = [img.strip() for img in message.image_paths.split(',') if img.strip()]
        for img_path in image_list:
            if os.path.exists(img_path):
                os.remove(img_path)
    elif message.image_path and os.path.exists(message.image_path):
        # 兼容旧数据
        os.remove(message.image_path)
    
    if message.video_path and os.path.exists(message.video_path):
        os.remove(message.video_path)
    
    # 删除上传的文件
    if message.file_paths:
        file_list = [f.strip() for f in message.file_paths.split(',') if f.strip()]
        for file_path in file_list:
            if os.path.exists(file_path):
                os.remove(file_path)
    
    # 删除所有回复及其文件
    for reply in message.replies:
        if reply.image_path and os.path.exists(reply.image_path):
            os.remove(reply.image_path)
        if reply.video_path and os.path.exists(reply.video_path):
            os.remove(reply.video_path)
    
    db.session.delete(message)
    db.session.commit()
    return jsonify({'success': True})

# 管理后台 - 登出
@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

# 提交回复
@app.route('/api/messages/<int:msg_id>/replies', methods=['POST'])
def submit_reply(msg_id):
    try:
        message = Message.query.get(msg_id)
        if not message:
            return jsonify({'error': '留言不存在'}), 404
        
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        content = request.form.get('content', '').strip()
        parent_id = request.form.get('parent_id', None)
        
        if not name or not email or not content:
            return jsonify({'error': '请填写所有必填项'}), 400
        
        # 如果有 parent_id，验证它是否存在
        if parent_id:
            parent_reply = Reply.query.get(parent_id)
            if not parent_reply or parent_reply.message_id != msg_id:
                return jsonify({'error': '父回复不存在'}), 404
        
        reply = Reply(message_id=msg_id, parent_id=parent_id if parent_id else None, name=name, email=email, content=content)
        
        # 处理图片上传
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                reply.image_path = f"uploads/{filename}"
        
        # 处理视频上传
        if 'video' in request.files:
            file = request.files['video']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                reply.video_path = f"uploads/{filename}"
        
        db.session.add(reply)
        db.session.commit()
        
        # 发送微信通知
        content_preview = content[:100] if len(content) > 100 else content
        send_wechat_notification('reply', name, content_preview)
        
        # 如果是会员登录状态,自动增加2积分
        member_id = session.get('member_id')
        points_earned = 0
        if member_id:
            add_points(member_id, 2, '发表回复')
            points_earned = 2
        
        response_message = '回复已发布'
        if points_earned > 0:
            response_message += f'!恭喜获得{points_earned}积分'
        
        return jsonify({'success': True, 'message': response_message, 'reply': reply.to_dict()}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 获取留言的所有回复（树形结构）
@app.route('/api/messages/<int:msg_id>/replies', methods=['GET'])
def get_replies(msg_id):
    try:
        message = Message.query.get(msg_id)
        if not message:
            return jsonify({'error': '留言不存在'}), 404
        
        # 获取所有顶级回复（parent_id 为 None）
        top_replies = Reply.query.filter_by(message_id=msg_id, parent_id=None).order_by(Reply.created_at.asc()).all()
        return jsonify([reply.to_dict() for reply in top_replies])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== 会员系统 API ==========

# 会员注册
@app.route('/api/member/register', methods=['POST'])
def member_register():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        phone = data.get('phone', '').strip()
        invitation_code = data.get('invitation_code', '').strip()  # 邀请码(可选)
        
        if not username or not email or not password:
            return jsonify({'error': '用户名、邮箱和密码不能为空'}), 400
        
        # 检查用户名是否已存在
        if Member.query.filter_by(username=username).first():
            return jsonify({'error': '用户名已存在'}), 400
        
        # 检查邮箱是否已存在
        if Member.query.filter_by(email=email).first():
            return jsonify({'error': '邮箱已被注册'}), 400
        
        # 验证邀请码(如果提供)
        invitation = None
        if invitation_code:
            invitation = Invitation.query.filter_by(
                invitation_code=invitation_code,
                status='未使用'
            ).first()
            
            if not invitation:
                return jsonify({'error': '邀请码无效或已被使用'}), 400
        
        # 创建新会员(密码简单加密:实际生产环境应使用bcrypt等)
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        member = Member(
            username=username,
            email=email,
            password=password_hash,
            phone=phone,
            points=10  # 注册赠送10积分
        )
        
        db.session.add(member)
        db.session.commit()
        
        # 添加积分记录
        point_record = PointRecord(
            member_id=member.id,
            points=10,
            reason='新用户注册奖励'
        )
        db.session.add(point_record)
        
        # 处理邀请码奖励
        if invitation:
            # 标记邀请码为已使用
            invitation.status = '已使用'
            invitation.invitee_id = member.id
            invitation.used_at = datetime.now()
            invitation.points_awarded = 20  # 邀请人获得20积分
            
            # 给邀请人加积分
            add_points(invitation.inviter_id, 20, f'邀请好友 {username}')
            
            # 给新用户额外奖励
            member.points += 10  # 被邀请人额外获得10积分
            extra_point_record = PointRecord(
                member_id=member.id,
                points=10,
                reason='使用邀请码注册奖励'
            )
            db.session.add(extra_point_record)
        
        db.session.commit()
        
        message = '注册成功!赠送10积分'
        if invitation:
            message = '注册成功!赠送20积分(含邀请码奖励10积分)'
        
        return jsonify({
            'success': True,
            'message': message,
            'member': member.to_dict()
        }), 201
    except Exception as e:
        print(f"❌ 注册失败: {str(e)}")
        return jsonify({'error': '注册失败'}), 500

# 会员登录
@app.route('/api/member/login', methods=['POST'])
def member_login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        # 查找会员
        member = Member.query.filter_by(username=username).first()
        if not member:
            return jsonify({'error': '用户名或密码错误'}), 401
        
        # 验证密码
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if member.password != password_hash:
            return jsonify({'error': '用户名或密码错误'}), 401
        
        # 更新最后登录时间
        member.last_login = datetime.now()
        db.session.commit()
        
        # 保存登录状态到session
        session['member_id'] = member.id
        session['member_username'] = member.username
        
        return jsonify({
            'success': True,
            'message': '登录成功',
            'member': member.to_dict()
        }), 200
    except Exception as e:
        print(f"❌ 登录失败: {str(e)}")
        return jsonify({'error': '登录失败'}), 500

# 会员登出
@app.route('/api/member/logout', methods=['POST'])
def member_logout():
    session.pop('member_id', None)
    session.pop('member_username', None)
    return jsonify({'success': True, 'message': '已退出登录'}), 200

# 获取当前会员信息
@app.route('/api/member/info', methods=['GET'])
def get_member_info():
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '未登录'}), 401
        
        member = Member.query.get(member_id)
        if not member:
            return jsonify({'error': '会员不存在'}), 404
        
        return jsonify({
            'success': True,
            'member': member.to_dict()
        }), 200
    except Exception as e:
        print(f"❌ 获取会员信息失败: {str(e)}")
        return jsonify({'error': '获取信息失败'}), 500

# 获取积分记录
@app.route('/api/member/points/records', methods=['GET'])
def get_point_records():
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '未登录'}), 401
        
        records = PointRecord.query.filter_by(member_id=member_id).order_by(PointRecord.created_at.desc()).all()
        return jsonify({
            'success': True,
            'records': [record.to_dict() for record in records]
        }), 200
    except Exception as e:
        print(f"❌ 获取积分记录失败: {str(e)}")
        return jsonify({'error': '获取记录失败'}), 500

# 获取兑换商品列表
@app.route('/api/redemption/items', methods=['GET'])
def get_redemption_items():
    try:
        items = RedemptionItem.query.filter_by(is_active=True).order_by(RedemptionItem.points_required.asc()).all()
        return jsonify({
            'success': True,
            'items': [item.to_dict() for item in items]
        }), 200
    except Exception as e:
        print(f"❌ 获取兑换商品失败: {str(e)}")
        return jsonify({'error': '获取商品失败'}), 500

# 兑换商品
@app.route('/api/redemption/redeem', methods=['POST'])
def redeem_item():
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '请先登录'}), 401
        
        data = request.get_json()
        item_id = data.get('item_id')
        
        member = Member.query.get(member_id)
        item = RedemptionItem.query.get(item_id)
        
        if not item or not item.is_active:
            return jsonify({'error': '商品不存在或已下架'}), 404
        
        if item.stock <= 0:
            return jsonify({'error': '商品库存不足'}), 400
        
        if member.points < item.points_required:
            return jsonify({'error': f'积分不足,需要{item.points_required}积分,当前{member.points}积分'}), 400
        
        # 扣除积分
        member.points -= item.points_required
        
        # 减少库存
        item.stock -= 1
        
        # 创建兑换记录
        redemption = Redemption(
            member_id=member_id,
            item_id=item_id,
            points_spent=item.points_required
        )
        
        # 添加积分记录
        point_record = PointRecord(
            member_id=member_id,
            points=-item.points_required,
            reason=f'兑换商品:{item.name}'
        )
        
        db.session.add(redemption)
        db.session.add(point_record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'兑换成功!已兑换{item.name},请到店领取',
            'redemption': redemption.to_dict(),
            'remaining_points': member.points
        }), 200
    except Exception as e:
        print(f"❌ 兑换失败: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '兑换失败'}), 500

# 获取兑换记录
@app.route('/api/member/redemptions', methods=['GET'])
def get_member_redemptions():
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '未登录'}), 401
        
        redemptions = Redemption.query.filter_by(member_id=member_id).order_by(Redemption.created_at.desc()).all()
        return jsonify({
            'success': True,
            'redemptions': [r.to_dict() for r in redemptions]
        }), 200
    except Exception as e:
        print(f"❌ 获取兑换记录失败: {str(e)}")
        return jsonify({'error': '获取记录失败'}), 500

# 添加积分(内部函数)
def add_points(member_id, points, reason):
    try:
        member = Member.query.get(member_id)
        if member:
            member.points += points
            
            # 更新会员等级
            if member.points >= 1000:
                member.level = '钻石会员'
            elif member.points >= 500:
                member.level = '黄金会员'
            elif member.points >= 200:
                member.level = '白银会员'
            else:
                member.level = '普通会员'
            
            # 添加积分记录
            point_record = PointRecord(
                member_id=member_id,
                points=points,
                reason=reason
            )
            db.session.add(point_record)
            db.session.commit()
            return True
    except Exception as e:
        print(f"❌ 添加积分失败: {str(e)}")
        return False

# ========== 每日签到功能 ==========

@app.route('/api/member/checkin', methods=['POST'])
def check_in():
    """每日签到"""
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '请先登录'}), 401
        
        today = datetime.now().date()
        
        # 检查今天是否已签到
        today_checkin = CheckIn.query.filter_by(
            member_id=member_id,
            check_date=today
        ).first()
        
        if today_checkin:
            return jsonify({'error': '今天已经签到过了'}), 400
        
        # 查询昨天的签到记录
        from datetime import timedelta
        yesterday = today - timedelta(days=1)
        yesterday_checkin = CheckIn.query.filter_by(
            member_id=member_id,
            check_date=yesterday
        ).first()
        
        # 计算连续签到天数和奖励积分
        if yesterday_checkin:
            continuous_days = yesterday_checkin.continuous_days + 1
        else:
            continuous_days = 1
        
        # 签到奖励规则:连续签到天数越多,积分越多
        if continuous_days >= 30:
            points_earned = 10  # 连续30天: 10积分
        elif continuous_days >= 7:
            points_earned = 5   # 连续7天: 5积分
        else:
            points_earned = 2   # 普通签到: 2积分
        
        # 创建签到记录
        checkin = CheckIn(
            member_id=member_id,
            check_date=today,
            points_earned=points_earned,
            continuous_days=continuous_days
        )
        
        db.session.add(checkin)
        db.session.commit()
        
        # 添加积分
        add_points(member_id, points_earned, f'每日签到(连续{continuous_days}天)')
        
        return jsonify({
            'success': True,
            'message': f'签到成功!获得{points_earned}积分',
            'points_earned': points_earned,
            'continuous_days': continuous_days
        }), 200
        
    except Exception as e:
        print(f"❌ 签到失败: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '签到失败'}), 500

@app.route('/api/member/checkin/status', methods=['GET'])
def checkin_status():
    """获取今日签到状态"""
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '未登录'}), 401
        
        today = datetime.now().date()
        today_checkin = CheckIn.query.filter_by(
            member_id=member_id,
            check_date=today
        ).first()
        
        # 获取最近7天的签到记录
        from datetime import timedelta
        seven_days_ago = today - timedelta(days=6)
        recent_checkins = CheckIn.query.filter(
            CheckIn.member_id == member_id,
            CheckIn.check_date >= seven_days_ago,
            CheckIn.check_date <= today
        ).order_by(CheckIn.check_date.asc()).all()
        
        return jsonify({
            'success': True,
            'checked_today': today_checkin is not None,
            'continuous_days': today_checkin.continuous_days if today_checkin else 0,
            'recent_checkins': [c.to_dict() for c in recent_checkins]
        }), 200
        
    except Exception as e:
        print(f"❌ 获取签到状态失败: {str(e)}")
        return jsonify({'error': '获取状态失败'}), 500

# ========== 邀请好友功能 ==========

@app.route('/api/member/invitation/generate', methods=['POST'])
def generate_invitation():
    """生成邀请码"""
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '请先登录'}), 401
        
        # 生成唯一邀请码
        import random
        import string
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            existing = Invitation.query.filter_by(invitation_code=code).first()
            if not existing:
                break
        
        # 创建邀请记录
        invitation = Invitation(
            inviter_id=member_id,
            invitation_code=code
        )
        
        db.session.add(invitation)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'invitation_code': code,
            'message': '邀请码生成成功'
        }), 201
        
    except Exception as e:
        print(f"❌ 生成邀请码失败: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '生成失败'}), 500

@app.route('/api/member/invitation/my', methods=['GET'])
def get_my_invitations():
    """获取我的邀请记录"""
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '未登录'}), 401
        
        invitations = Invitation.query.filter_by(inviter_id=member_id).order_by(Invitation.created_at.desc()).all()
        
        # 统计信息
        total_invitations = len(invitations)
        used_invitations = len([inv for inv in invitations if inv.status == '已使用'])
        total_points = sum([inv.points_awarded for inv in invitations])
        
        return jsonify({
            'success': True,
            'invitations': [inv.to_dict() for inv in invitations],
            'stats': {
                'total': total_invitations,
                'used': used_invitations,
                'points_earned': total_points
            }
        }), 200
        
    except Exception as e:
        print(f"❌ 获取邀请记录失败: {str(e)}")
        return jsonify({'error': '获取记录失败'}), 500

# ========== 头像上传功能 ==========

@app.route('/api/member/avatar', methods=['POST'])
def upload_avatar():
    """上传头像"""
    try:
        member_id = session.get('member_id')
        if not member_id:
            return jsonify({'error': '请先登录'}), 401
        
        if 'avatar' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        # 检查文件类型
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            return jsonify({'error': '只支持图片格式(png, jpg, jpeg, gif)'}), 400
        
        # 保存文件
        filename = secure_filename(f"avatar_{member_id}_{datetime.now().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # 更新会员头像
        member = Member.query.get(member_id)
        # 删除旧头像
        if member.avatar and member.avatar != 'images/default-avatar.png' and os.path.exists(member.avatar):
            os.remove(member.avatar)
        
        member.avatar = f"uploads/{filename}"
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '头像上传成功',
            'avatar_url': f"uploads/{filename}"
        }), 200
        
    except Exception as e:
        print(f"❌ 上传头像失败: {str(e)}")
        return jsonify({'error': '上传失败'}), 500

# ========== 密码找回功能 ==========

@app.route('/api/member/password/request-reset', methods=['POST'])
def request_password_reset():
    """请求重置密码(发送验证码到邮箱)"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        
        if not email:
            return jsonify({'error': '请输入邮箱'}), 400
        
        # 查找会员
        member = Member.query.filter_by(email=email).first()
        if not member:
            # 为了安全,不透露邮箱是否存在
            return jsonify({'success': True, 'message': '如果邮箱存在,重置链接已发送'}), 200
        
        # 生成重置令牌
        import secrets
        token = secrets.token_urlsafe(32)
        from datetime import timedelta
        expires_at = datetime.now() + timedelta(hours=1)  # 1小时后过期
        
        # 删除该用户之前未使用的令牌
        PasswordResetToken.query.filter_by(member_id=member.id, used=False).delete()
        
        # 创建新令牌
        reset_token = PasswordResetToken(
            member_id=member.id,
            token=token,
            expires_at=expires_at
        )
        
        db.session.add(reset_token)
        db.session.commit()
        
        # 这里简化处理,实际应该发送邮件
        # 开发环境下直接返回token(生产环境删除这部分)
        print(f"🔑 密码重置令牌: {token}")
        print(f"🔗 重置链接: http://localhost:5000/reset-password?token={token}")
        
        return jsonify({
            'success': True,
            'message': '重置链接已生成',
            'token': token,  # 生产环境删除此行
            'note': '生产环境应发送邮件,这里为了测试直接返回token'
        }), 200
        
    except Exception as e:
        print(f"❌ 请求重置密码失败: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '请求失败'}), 500

@app.route('/api/member/password/reset', methods=['POST'])
def reset_password():
    """重置密码"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        new_password = data.get('new_password', '').strip()
        
        if not token or not new_password:
            return jsonify({'error': '令牌和新密码不能为空'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': '密码至少6位'}), 400
        
        # 查找令牌
        reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
        
        if not reset_token:
            return jsonify({'error': '令牌无效或已使用'}), 400
        
        # 检查是否过期
        if datetime.now() > reset_token.expires_at:
            return jsonify({'error': '令牌已过期,请重新申请'}), 400
        
        # 重置密码
        import hashlib
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()
        
        member = Member.query.get(reset_token.member_id)
        member.password = password_hash
        
        # 标记令牌已使用
        reset_token.used = True
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '密码重置成功,请使用新密码登录'
        }), 200
        
    except Exception as e:
        print(f"❌ 重置密码失败: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '重置失败'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
