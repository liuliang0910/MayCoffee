// 全局变量
let currentMessageId = null;

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
            <div class="message-item" onclick="viewMessageDetail(${msg.id})" style="cursor: pointer;">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(msg.name)}</span>
                    <span class="message-time">${msg.created_at}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
                <div style="margin-top: 10px; color: #8B6F47; font-size: 14px;">点击查看详情和回复 →</div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="no-messages">加载失败，请刷新重试</div>';
        console.error('Error loading messages:', error);
    }
}

// 查看留言详情
async function viewMessageDetail(messageId) {
    currentMessageId = messageId;
    
    try {
        // 获取留言详情
        const response = await fetch('/api/messages');
        const messages = await response.json();
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            alert('留言不存在');
            return;
        }
        
        // 显示详情页面
        document.getElementById('listPageContainer').style.display = 'none';
        document.getElementById('detailPageContainer').style.display = 'block';
        
        // 渲染留言详情
        const detailHtml = `
            <div class="message-detail-card">
                <div class="message-detail-header">
                    <span class="message-detail-name">${escapeHtml(message.name)}</span>
                    <span class="message-detail-time">${message.created_at}</span>
                </div>
                <div class="message-detail-content">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
                ${message.image_path ? `<div class="message-detail-media"><img src="${message.image_path}" alt="留言图片"></div>` : ''}
                ${message.video_path ? `<div class="message-detail-media"><video controls><source src="${message.video_path}" type="video/mp4"></video></div>` : ''}
            </div>
        `;
        
        document.getElementById('messageDetail').innerHTML = detailHtml;
        
        // 加载回复
        await loadDetailReplies(messageId);
        
        // 滚动到顶部
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading message detail:', error);
        alert('加载失败，请重试');
    }
}

// 详情页面加载回复
async function loadDetailReplies(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}/replies`);
        const replies = await response.json();
        
        let repliesHtml = `
            <div class="replies-detail-section">
                <h3>💬 回复 (${replies.length})</h3>
                
                <div class="reply-form-section">
                    <h4>写下你的回复</h4>
                    <form id="detailReplyForm">
                        <div class="form-group">
                            <label for="detailReplyName">您的名字 *</label>
                            <input type="text" id="detailReplyName" name="name" required placeholder="请输入您的名字">
                        </div>

                        <div class="form-group">
                            <label for="detailReplyEmail">邮箱 *</label>
                            <input type="email" id="detailReplyEmail" name="email" required placeholder="请输入您的邮箱">
                        </div>

                        <div class="form-group">
                            <label for="detailReplyContent">回复内容 *</label>
                            <textarea id="detailReplyContent" name="content" required placeholder="请输入您的回复..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="detailReplyImage">上传图片 (可选)</label>
                            <div class="file-input-wrapper">
                                <input type="file" id="detailReplyImage" name="image" accept="image/*">
                                <label for="detailReplyImage" class="file-input-label">
                                    📷 点击选择图片或拖拽上传
                                </label>
                                <div class="file-name" id="detailReplyImageName"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="detailReplyVideo">上传视频 (可选)</label>
                            <div class="file-input-wrapper">
                                <input type="file" id="detailReplyVideo" name="video" accept="video/*">
                                <label for="detailReplyVideo" class="file-input-label">
                                    🎥 点击选择视频或拖拽上传
                                </label>
                                <div class="file-name" id="detailReplyVideoName"></div>
                            </div>
                        </div>

                        <button type="submit" class="submit-btn">发布回复</button>
                    </form>
                </div>
        `;
        
        if (replies.length === 0) {
            repliesHtml += '<div class="no-replies">暂无回复，成为第一个回复的人吧！</div>';
        } else {
            repliesHtml += `
                <div class="replies-list-detail">
                    ${replies.map(reply => `
                        <div class="reply-item-detail">
                            <div class="reply-header-detail">
                                <span class="reply-name-detail">${escapeHtml(reply.name)}</span>
                                <span class="reply-time-detail">${reply.created_at}</span>
                            </div>
                            <div class="reply-content-detail">${escapeHtml(reply.content).replace(/\n/g, '<br>')}</div>
                            ${reply.image_path ? `<div class="reply-media-detail"><img src="${reply.image_path}" alt="回复图片"></div>` : ''}
                            ${reply.video_path ? `<div class="reply-media-detail"><video controls><source src="${reply.video_path}" type="video/mp4"></video></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        repliesHtml += '</div>';
        document.getElementById('repliesSection').innerHTML = repliesHtml;
        
        // 绑定详情页面回复表单提交事件
        const detailReplyForm = document.getElementById('detailReplyForm');
        if (detailReplyForm) {
            detailReplyForm.addEventListener('submit', submitDetailReply);
        }
        
        // 绑定文件选择事件
        document.getElementById('detailReplyImage').addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || '';
            document.getElementById('detailReplyImageName').textContent = fileName ? `已选择: ${fileName}` : '';
        });

        document.getElementById('detailReplyVideo').addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || '';
            document.getElementById('detailReplyVideoName').textContent = fileName ? `已选择: ${fileName}` : '';
        });
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

// 提交详情页面的回复
async function submitDetailReply(e) {
    e.preventDefault();
    
    const messageId = currentMessageId;
    const name = document.getElementById('detailReplyName').value.trim();
    const email = document.getElementById('detailReplyEmail').value.trim();
    const content = document.getElementById('detailReplyContent').value.trim();
    
    if (!name || !email || !content) {
        alert('请填写所有必填项');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('content', content);
    
    // 添加图片和视频文件
    const imageFile = document.getElementById('detailReplyImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const videoFile = document.getElementById('detailReplyVideo').files[0];
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
            // 重新加载回复列表
            await loadDetailReplies(messageId);
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

// 返回留言列表
function backToList() {
    document.getElementById('detailPageContainer').style.display = 'none';
    document.getElementById('listPageContainer').style.display = 'block';
    currentMessageId = null;
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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 处理主表单中的文件选择
    document.getElementById('image').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || '';
        document.getElementById('imageName').textContent = fileName ? `已选择: ${fileName}` : '';
    });

    document.getElementById('video').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || '';
        document.getElementById('videoName').textContent = fileName ? `已选择: ${fileName}` : '';
    });
});

// 页面加载时获取留言
loadMessages();

// 每30秒刷新一次留言
setInterval(loadMessages, 30000);
