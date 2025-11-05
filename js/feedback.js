// ========== 全局变量 ==========
let currentMessageId = null;
let selectedFiles = { image: null, video: null, files: [] };
let postFiles = { images: [], video: null, files: [] };  // 发帖文件，支持多张图片和多个文件
let currentUser = { name: '', email: '' };

// ========== 用户信息管理 ==========
function loadUserInfo() {
    const saved = localStorage.getItem('userInfo');
    if (saved) {
        currentUser = JSON.parse(saved);
    }
}

function saveUserInfo(name, email) {
    currentUser = { name, email };
    localStorage.setItem('userInfo', JSON.stringify(currentUser));
}

function getUserInitial() {
    return currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '用';
}

// ========== 发帖相关函数 ==========
function insertPostImage() {
    document.getElementById('postImageInput').click();
}

function insertPostVideo() {
    document.getElementById('postVideoInput').click();
}

function insertPostFile() {
    document.getElementById('postFileInput').click();
}

function insertPostEmoji() {
    alert('表情功能开发中...');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('postImageInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // 支持多张图片，添加到数组
            postFiles.images = Array.from(e.target.files);
            showPostMediaPreview();
        }
    });

    document.getElementById('postVideoInput').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            postFiles.video = e.target.files[0];
            showPostMediaPreview();
        }
    });

    document.getElementById('postFileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            postFiles.files = Array.from(e.target.files);
            showPostMediaPreview();
        }
    });
});

function showPostMediaPreview() {
    const preview = document.getElementById('postMediaPreview');
    preview.innerHTML = '';
    
    // 显示所有图片
    if (postFiles.images && postFiles.images.length > 0) {
        postFiles.images.forEach((image, index) => {
            const url = URL.createObjectURL(image);
            preview.innerHTML += `
                <div class="media-item">
                    <img src="${url}" alt="预览">
                    <button class="media-remove" onclick="removePostImage(${index})">×</button>
                </div>
            `;
        });
    }
    
    if (postFiles.video) {
        const url = URL.createObjectURL(postFiles.video);
        preview.innerHTML += `
            <div class="media-item">
                <video style="max-width: 150px; max-height: 150px;"><source src="${url}"></video>
                <button class="media-remove" onclick="removePostVideo()">×</button>
            </div>
        `;
    }
    
    // 显示所有文件
    if (postFiles.files && postFiles.files.length > 0) {
        postFiles.files.forEach((file, index) => {
            preview.innerHTML += `
                <div class="media-item" style="background: #f0f0f0; padding: 8px; border-radius: 4px;">
                    <div style="font-size: 12px; color: #666; word-break: break-all;">
                        📄 ${file.name}
                    </div>
                    <button class="media-remove" onclick="removePostFile(${index})">×</button>
                </div>
            `;
        });
    }
}

function removePostImage(index) {
    // 删除指定索引的图片
    postFiles.images.splice(index, 1);
    // 如果没有图片了，清空输入框
    if (postFiles.images.length === 0) {
        document.getElementById('postImageInput').value = '';
    }
    showPostMediaPreview();
}

function removePostVideo() {
    postFiles.video = null;
    document.getElementById('postVideoInput').value = '';
    showPostMediaPreview();
}

function removePostFile(index) {
    postFiles.files.splice(index, 1);
    if (postFiles.files.length === 0) {
        document.getElementById('postFileInput').value = '';
    }
    showPostMediaPreview();
}

function clearPostForm() {
    document.getElementById('postContent').value = '';
    postFiles = { images: [], video: null, files: [] };
    document.getElementById('postImageInput').value = '';
    document.getElementById('postVideoInput').value = '';
    document.getElementById('postFileInput').value = '';
    document.getElementById('postMediaPreview').innerHTML = '';
}

async function submitPost() {
    const content = document.getElementById('postContent').value.trim();
    
    if (!content) {
        alert('请输入留言内容');
        return;
    }
    
    if (!currentUser.name || !currentUser.email) {
        alert('请先设置用户信息');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', currentUser.name);
    formData.append('email', currentUser.email);
    formData.append('content', content);
    
    // 支持多张图片
    if (postFiles.images && postFiles.images.length > 0) {
        postFiles.images.forEach((image) => {
            formData.append('images', image);
        });
    }
    
    if (postFiles.video) {
        formData.append('video', postFiles.video);
    }
    
    // 添加多个文件
    if (postFiles.files && postFiles.files.length > 0) {
        postFiles.files.forEach((file) => {
            formData.append('files', file);
        });
    }
    
    const submitBtn = document.getElementById('postSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '发帖中...';
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearPostForm();
            loadMessages();
        } else {
            alert(data.error || '发帖失败');
        }
    } catch (error) {
        alert('网络错误，请重试');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发帖';
    }
}


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
        // 支持多张图片
        let imagesHtml = '';
        if (message.image_paths && message.image_paths.length > 0) {
            imagesHtml = '<div class="message-detail-media">' + 
                message.image_paths.map(img => `<img src="${img}" alt="留言图片">`).join('') + 
                '</div>';
        } else if (message.image_path) {
            // 兼容旧数据
            imagesHtml = `<div class="message-detail-media"><img src="${message.image_path}" alt="留言图片"></div>`;
        }
        
        // 处理文件列表
        let filesHtml = '';
        if (message.file_paths && message.file_paths.length > 0) {
            filesHtml = '<div style="margin-top: 15px; padding: 12px; background: #f9f9f9; border-radius: 4px;">' +
                '<div style="font-weight: bold; margin-bottom: 8px; color: #333;">📎 附件：</div>' +
                message.file_paths.map(file => {
                    const filename = file.split('/').pop();
                    return `<div style="margin-bottom: 6px;"><a href="${file}" download style="color: #8B6F47; text-decoration: none; word-break: break-all;">📥 ${filename}</a></div>`;
                }).join('') +
                '</div>';
        }
        
        const detailHtml = `
            <div class="message-detail-card">
                <div class="message-detail-header">
                    <span class="message-detail-name">${escapeHtml(message.name)}</span>
                    <span class="message-detail-time">${message.created_at}</span>
                </div>
                <div class="message-detail-content">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
                ${imagesHtml}
                ${message.video_path ? `<div class="message-detail-media"><video controls><source src="${message.video_path}" type="video/mp4"></video></div>` : ''}
                ${filesHtml}
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

// ========== 嵌套回复相关变量 ==========
let replyingToId = null;  // 当前正在回复的回复 ID

// ========== 简化评论框相关函数 ==========
function insertImage() {
    document.getElementById('quickImageInput').click();
}

function insertVideo() {
    document.getElementById('quickVideoInput').click();
}

function insertEmoji() {
    alert('表情功能开发中...');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('quickImageInput').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            selectedFiles.image = e.target.files[0];
            showMediaPreview();
        }
    });

    document.getElementById('quickVideoInput').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            selectedFiles.video = e.target.files[0];
            showMediaPreview();
        }
    });
});

function showMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    preview.innerHTML = '';
    
    if (selectedFiles.image) {
        const url = URL.createObjectURL(selectedFiles.image);
        preview.innerHTML += `
            <div class="media-item">
                <img src="${url}" alt="预览">
                <button class="media-remove" onclick="removeImage()">×</button>
            </div>
        `;
    }
    
    if (selectedFiles.video) {
        const url = URL.createObjectURL(selectedFiles.video);
        preview.innerHTML += `
            <div class="media-item">
                <video style="max-width: 150px; max-height: 150px;"><source src="${url}"></video>
                <button class="media-remove" onclick="removeVideo()">×</button>
            </div>
        `;
    }
}

function removeImage() {
    selectedFiles.image = null;
    document.getElementById('quickImageInput').value = '';
    showMediaPreview();
}

function removeVideo() {
    selectedFiles.video = null;
    document.getElementById('quickVideoInput').value = '';
    showMediaPreview();
}

function clearReplyForm() {
    document.getElementById('quickReplyContent').value = '';
    selectedFiles = { image: null, video: null };
    document.getElementById('quickImageInput').value = '';
    document.getElementById('quickVideoInput').value = '';
    document.getElementById('mediaPreview').innerHTML = '';
    replyingToId = null;
}

async function submitQuickReply() {
    const content = document.getElementById('quickReplyContent').value.trim();
    
    if (!content) {
        alert('请输入回复内容');
        return;
    }
    
    if (!currentUser.name || !currentUser.email) {
        alert('请先设置用户信息');
        return;
    }
    
    const formData = new FormData();
    formData.append('name', currentUser.name);
    formData.append('email', currentUser.email);
    formData.append('content', content);
    
    // 如果是回复某个回复，添加 parent_id
    if (replyingToId) {
        formData.append('parent_id', replyingToId);
    }
    
    if (selectedFiles.image) {
        formData.append('image', selectedFiles.image);
    }
    
    if (selectedFiles.video) {
        formData.append('video', selectedFiles.video);
    }
    
    const submitBtn = document.getElementById('quickSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '发送中...';
    
    try {
        const response = await fetch(`/api/messages/${currentMessageId}/replies`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearReplyForm();
            await loadDetailReplies(currentMessageId);
        } else {
            alert(data.error || '回复失败');
        }
    } catch (error) {
        alert('网络错误，请重试');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发送';
    }
}

// 回复某个回复
function replyToReply(replyId, replyName) {
    replyingToId = replyId;
    document.getElementById('quickReplyContent').focus();
    document.getElementById('quickReplyContent').placeholder = `回复 @${replyName}`;
}

// ========== 递归渲染嵌套回复 ==========
function renderReplyTree(reply, depth = 0) {
    const marginLeft = depth * 30;  // 每层缩进 30px
    let html = `
        <div class="reply-item-detail" style="margin-left: ${marginLeft}px; margin-top: 15px;">
            <div class="reply-header-detail">
                <span class="reply-name-detail">${escapeHtml(reply.name)}</span>
                <span class="reply-time-detail">${reply.created_at}</span>
            </div>
            <div class="reply-content-detail">${escapeHtml(reply.content).replace(/\n/g, '<br>')}</div>
            ${reply.image_path ? `<div class="reply-media-detail"><img src="${reply.image_path}" alt="回复图片"></div>` : ''}
            ${reply.video_path ? `<div class="reply-media-detail"><video controls><source src="${reply.video_path}" type="video/mp4"></video></div>` : ''}
            <div style="margin-top: 10px;">
                <button class="toolbar-btn" onclick="replyToReply(${reply.id}, '${escapeHtml(reply.name)}')">💬 回复</button>
            </div>
    `;
    
    // 递归渲染子回复
    if (reply.children && reply.children.length > 0) {
        html += '<div style="margin-top: 10px;">';
        reply.children.forEach(child => {
            html += renderReplyTree(child, depth + 1);
        });
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// ========== 详情页面加载回复 ==========
async function loadDetailReplies(messageId) {
    try {
        const response = await fetch(`/api/messages/${messageId}/replies`);
        const replies = await response.json();
        
        // 更新用户信息显示
        const userInfoHtml = currentUser.name 
            ? `你好，<strong>${escapeHtml(currentUser.name)}</strong> | <a onclick="editUserInfo()">修改</a>`
            : `<a onclick="editUserInfo()">点击设置用户信息</a>`;
        document.getElementById('userInfoSection').innerHTML = userInfoHtml;
        document.getElementById('userAvatar').textContent = getUserInitial();
        
        // 清空表单
        clearReplyForm();
        
        // 渲染回复列表
        let repliesHtml = '';
        
        if (replies.length === 0) {
            repliesHtml = '<div class="no-replies">暂无回复，成为第一个回复的人吧！</div>';
        } else {
            repliesHtml = '<div style="margin-top: 30px;">';
            replies.forEach(reply => {
                repliesHtml += renderReplyTree(reply);
            });
            repliesHtml += '</div>';
        }
        
        document.getElementById('repliesSection').innerHTML = repliesHtml;
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

function editUserInfo() {
    const name = prompt('请输入你的名字:', currentUser.name || '');
    if (name === null) return;
    
    const email = prompt('请输入你的邮箱:', currentUser.email || '');
    if (email === null) return;
    
    if (name.trim() && email.trim()) {
        saveUserInfo(name.trim(), email.trim());
        loadDetailReplies(currentMessageId);
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

// ========== 页面初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    // 加载用户信息
    loadUserInfo();
    
    // 更新发帖框的用户信息
    updatePostUserInfo();
    
    // 加载留言
    loadMessages();
});

function updatePostUserInfo() {
    const userInfoHtml = currentUser.name 
        ? `你好，<strong>${escapeHtml(currentUser.name)}</strong> | <a onclick="editPostUserInfo()">修改</a>`
        : `<a onclick="editPostUserInfo()">点击设置用户信息</a>`;
    document.getElementById('postUserInfoSection').innerHTML = userInfoHtml;
    document.getElementById('postUserAvatar').textContent = getUserInitial();
}

function editPostUserInfo() {
    const name = prompt('请输入你的名字:', currentUser.name || '');
    if (name === null) return;
    
    const email = prompt('请输入你的邮箱:', currentUser.email || '');
    if (email === null) return;
    
    if (name.trim() && email.trim()) {
        saveUserInfo(name.trim(), email.trim());
        updatePostUserInfo();
    }
}

// 每30秒刷新一次留言
setInterval(loadMessages, 30000);
