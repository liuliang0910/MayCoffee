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
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="no-messages">加载失败，请刷新重试</div>';
        console.error('Error loading messages:', error);
    }
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

// 页面加载时获取留言
loadMessages();

// 每30秒刷新一次留言
setInterval(loadMessages, 30000);
