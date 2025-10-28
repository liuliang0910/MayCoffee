// 获取模态框元素
const modal = document.getElementById('feedbackModal');
const postBtn = document.getElementById('postBtn');
const closeBtn = document.getElementById('closeBtn');

// 打开模态框
postBtn.addEventListener('click', function() {
    modal.classList.add('show');
});

// 关闭模态框
closeBtn.addEventListener('click', function() {
    modal.classList.remove('show');
});

// 点击模态框外部关闭
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        modal.classList.remove('show');
    }
});

// 处理文件选择
document.getElementById('image').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '';
    document.getElementById('imageName').textContent = fileName ? `已选择: ${fileName}` : '';
});

document.getElementById('video').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '';
    document.getElementById('videoName').textContent = fileName ? `已选择: ${fileName}` : '';
});

// 处理表单提交
document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('.submit-btn');
    const alertDiv = document.getElementById('alert');

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            alertDiv.className = 'alert success';
            alertDiv.textContent = data.message || '留言已提交，感谢您的反馈！';
            this.reset();
            document.getElementById('imageName').textContent = '';
            document.getElementById('videoName').textContent = '';
            
            // 2秒后关闭模态框并刷新留言列表
            setTimeout(() => {
                modal.classList.remove('show');
                alertDiv.className = 'alert';
                loadMessages();
            }, 2000);
        } else {
            alertDiv.className = 'alert error';
            alertDiv.textContent = data.error || '提交失败，请重试';
        }
    } catch (error) {
        alertDiv.className = 'alert error';
        alertDiv.textContent = '网络错误，请检查连接后重试';
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交留言';
    }
});

// 加载并显示所有留言
async function loadMessages() {
    const container = document.getElementById('messagesContainer');
    
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();

        if (messages.length === 0) {
            container.innerHTML = '<div class="no-messages">暂无留言，成为第一个留言的人吧！</div>';
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="message-item">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(msg.name)}</span>
                    <span class="message-time">${msg.created_at}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
                <button class="reply-btn" onclick="openReplyModal(${msg.id})">💬 回复</button>
                <div class="replies-container" id="replies-${msg.id}"></div>
            </div>
        `).join('');
        
        // 加载每条留言的回复
        messages.forEach(msg => {
            loadReplies(msg.id);
        });
    } catch (error) {
        container.innerHTML = '<div class="no-messages">加载失败，请刷新重试</div>';
        console.error('Error loading messages:', error);
    }
}

// 加载回复
async function loadReplies(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}/replies`);
        const replies = await response.json();
        
        const container = document.getElementById(`replies-${messageId}`);
        if (replies.length === 0) return;
        
        container.innerHTML = `
            <div class="replies-list">
                ${replies.map(reply => `
                    <div class="reply-item">
                        <div class="reply-header">
                            <span class="reply-name">${escapeHtml(reply.name)}</span>
                            <span class="reply-time">${reply.created_at}</span>
                        </div>
                        <div class="reply-content">${escapeHtml(reply.content).replace(/\n/g, '<br>')}</div>
                        ${reply.image_path ? `<div class="message-media"><img src="${reply.image_path}" alt="回复图片"></div>` : ''}
                        ${reply.video_path ? `<div class="message-media"><video controls><source src="${reply.video_path}" type="video/mp4"></video></div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

// 打开回复模态框
function openReplyModal(messageId) {
    const modal = document.getElementById('replyModal');
    document.getElementById('replyMessageId').value = messageId;
    document.getElementById('replyForm').reset();
    document.getElementById('replyImageName').textContent = '';
    document.getElementById('replyVideoName').textContent = '';
    modal.classList.add('show');
}

// 关闭回复模态框
function closeReplyModal() {
    const modal = document.getElementById('replyModal');
    modal.classList.remove('show');
}

// 防止XSS攻击的HTML转义函数
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 处理回复表单提交
document.addEventListener('DOMContentLoaded', function() {
    // 处理回复表单中的文件选择
    document.getElementById('replyImage').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || '';
        document.getElementById('replyImageName').textContent = fileName ? `已选择: ${fileName}` : '';
    });

    document.getElementById('replyVideo').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || '';
        document.getElementById('replyVideoName').textContent = fileName ? `已选择: ${fileName}` : '';
    });

    const replyForm = document.getElementById('replyForm');
    if (replyForm) {
        replyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const messageId = document.getElementById('replyMessageId').value;
            const name = document.getElementById('replyName').value.trim();
            const email = document.getElementById('replyEmail').value.trim();
            const content = document.getElementById('replyContent').value.trim();
            
            if (!name || !email || !content) {
                alert('请填写所有必填项');
                return;
            }
            
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('content', content);
            
            // 添加图片和视频文件
            const imageFile = document.getElementById('replyImage').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            const videoFile = document.getElementById('replyVideo').files[0];
            if (videoFile) {
                formData.append('video', videoFile);
            }
            
            const submitBtn = this.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = '发布中...';
            
            try {
                const response = await fetch(`/api/messages/${messageId}/replies`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('回复已发布');
                    closeReplyModal();
                    loadReplies(messageId);
                } else {
                    alert(data.error || '回复失败');
                }
            } catch (error) {
                alert('网络错误，请重试');
                console.error('Error:', error);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '发布回复';
            }
        });
    }
});

// 页面加载时获取留言
loadMessages();

// 每30秒刷新一次留言
setInterval(loadMessages, 30000);
