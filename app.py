from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='', template_folder='templates')

# 配置数据库
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///messages.db'
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB 最大文件大小

# 创建上传文件夹
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

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
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_paths = db.Column(db.Text)  # 改为存储多张图片，用逗号分隔
    video_path = db.Column(db.String(255))
    approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    replies = db.relationship('Reply', backref='message', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        # 将逗号分隔的图片路径转换为列表
        image_list = [img.strip() for img in self.image_paths.split(',') if img.strip()] if self.image_paths else []
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'content': self.content,
            'image_paths': image_list,  # 返回列表而不是字符串
            'image_path': image_list[0] if image_list else None,  # 兼容旧代码
            'video_path': self.video_path,
            'approved': self.approved,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'replies': [reply.to_dict() for reply in self.replies]
        }

# 创建数据库表
with app.app_context():
    db.create_all()

# 允许的文件类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov', 'webm'}

def allowed_file(filename):
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

# 提交新留言
@app.route('/api/messages', methods=['POST'])
def submit_message():
    try:
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        content = request.form.get('content', '').strip()
        
        if not name or not email or not content:
            return jsonify({'error': '请填写所有必填项'}), 400
        
        message = Message(name=name, email=email, content=content)
        
        # 处理多张图片上传
        image_paths = []
        if 'images' in request.files:
            files = request.files.getlist('images')
            for file in files:
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    image_paths.append(f"uploads/{filename}")
        
        # 兼容旧的单图片上传方式
        if 'image' in request.files and not image_paths:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_paths.append(f"uploads/{filename}")
        
        if image_paths:
            message.image_paths = ','.join(image_paths)
        
        # 处理视频上传
        if 'video' in request.files:
            file = request.files['video']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                message.video_path = f"uploads/{filename}"
        
        # 直接批准留言，无需审核
        message.approved = True
        db.session.add(message)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '留言已发布'}), 201
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
            with open('templates/admin_login.html', 'r', encoding='utf-8') as f:
                html = f.read()
            html = html.replace('{% if error %}', '<!-- error shown -->')
            html = html.replace('{{ error }}', '密码错误')
            return html
    return app.send_static_file('templates/admin_login.html')

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
    
    # 删除上传的文件
    if message.image_path and os.path.exists(message.image_path):
        os.remove(message.image_path)
    if message.video_path and os.path.exists(message.video_path):
        os.remove(message.video_path)
    
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
        
        return jsonify({'success': True, 'message': '回复已发布', 'reply': reply.to_dict()}), 201
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
