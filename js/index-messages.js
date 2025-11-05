// 分页配置
const ITEMS_PER_PAGE = 10;
let allMessages = [];
let filteredMessages = [];
let currentPage = 1;
let currentSort = 'newest';

// 加载留言
async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        allMessages = await response.json();
        filteredMessages = allMessages;
        updateStats();
        currentPage = 1;
        renderMessages();
    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<div class="no-messages">加载失败，请刷新重试</div>';
    }
}

// 更新统计信息
function updateStats() {
    document.getElementById('totalCount').textContent = allMessages.length;
    document.getElementById('resultCount').textContent = filteredMessages.length;
}

// 排序留言
function sortMessages(messages) {
    const sorted = [...messages];
    if (currentSort === 'newest') {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return sorted;
}

// 获取当前页的留言
function getPaginatedMessages() {
    const sorted = sortMessages(filteredMessages);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sorted.slice(start, end);
}

// 获取总页数
function getTotalPages() {
    return Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
}

// 渲染留言列表
function renderMessages() {
    const container = document.getElementById('messagesContainer');
    const messages = getPaginatedMessages();
    
    if (filteredMessages.length === 0) {
        container.innerHTML = '<div class="no-messages">暂无留言</div>';
        renderPagination();
        return;
    }

    container.innerHTML = messages.map(msg => {
        // 处理多张图片（新格式）或单张图片（旧格式）
        let imagesHtml = '';
        if (msg.image_paths && msg.image_paths.length > 0) {
            imagesHtml = msg.image_paths.map(imgPath => 
                `<div class="message-media"><img src="${imgPath}" alt="用户上传的图片"></div>`
            ).join('');
        } else if (msg.image_path) {
            imagesHtml = `<div class="message-media"><img src="${msg.image_path}" alt="用户上传的图片"></div>`;
        }
        
        const videoHtml = msg.video_path ? `<div class="message-media"><video controls style="max-width: 100%; max-height: 400px;"><source src="${msg.video_path}" type="video/mp4"></video></div>` : '';
        
        // 获取用户名首字母作为头像
        const userInitial = msg.name ? msg.name.charAt(0).toUpperCase() : '用';
        
        // 获取所有图片的HTML
        let allImagesHtml = '';
        if (msg.image_paths && msg.image_paths.length > 0) {
            allImagesHtml = msg.image_paths.map(imgPath => 
                `<div style="margin: 15px 0; border-radius: 8px; overflow: hidden;"><img src="${imgPath}" alt="留言配图" style="width: 100%; max-height: 400px; object-fit: cover;"></div>`
            ).join('');
        }
        
        return `
            <div class="message-item" onclick="openMessageDetail(${msg.id})" style="cursor: pointer; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 25px; margin-bottom: 20px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <!-- 头部：用户头像、名字和时间 -->
                <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
                    <!-- 用户头像 -->
                    <div style="flex-shrink: 0;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #8B6F47 0%, #A0826D 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${userInitial}</div>
                    </div>
                    
                    <!-- 用户信息 -->
                    <div style="flex: 1;">
                        <div style="color: #333; font-weight: bold; font-size: 15px; margin-bottom: 4px;">${escapeHtml(msg.name)}</div>
                        <div style="color: #999; font-size: 12px;">${msg.created_at}</div>
                    </div>
                </div>
                
                <!-- 标题 -->
                <h3 style="margin: 0 0 15px 0; color: #0066cc; font-size: 18px; font-weight: bold; word-break: break-word; line-height: 1.4;">${escapeHtml(msg.title || msg.name)}</h3>
                
                <!-- 内容 -->
                <div style="color: #555; font-size: 14px; line-height: 1.8; word-break: break-word; margin-bottom: 15px;">${escapeHtml(msg.content).substring(0, 200).replace(/\n/g, ' ')}${msg.content.length > 200 ? '...' : ''}</div>
                
                <!-- 图片缩略图 -->
                ${msg.image_paths && msg.image_paths.length > 0 ? `
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                        ${msg.image_paths.slice(0, 3).map(imgPath => 
                            `<div style="width: 80px; height: 80px; border-radius: 4px; overflow: hidden; background: #f5f5f5;">
                                <img src="${imgPath}" alt="留言配图" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>`
                        ).join('')}
                        ${msg.image_paths.length > 3 ? `<div style="width: 80px; height: 80px; border-radius: 4px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">+${msg.image_paths.length - 3}</div>` : ''}
                    </div>
                ` : ''}
                
                <!-- 底部：互动信息 -->
                <div style="display: flex; gap: 20px; padding-top: 12px; border-top: 1px solid #f0f0f0; color: #8B6F47; font-size: 13px; font-weight: bold;">
                    <span style="cursor: pointer;">💬 点击查看详情</span>
                    <span style="color: #999;">${msg.image_paths ? msg.image_paths.length + ' 张图片' : ''}</span>
                </div>
            </div>
        `;
    }).join('');
    
    renderPagination();
}

// 渲染分页控件
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const totalPages = getTotalPages();
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    
    // 上一页按钮
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})">← 上一页</button>`;
    }
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="pagination-btn active">${i}</button>`;
        } else if (i <= 3 || i > totalPages - 3 || Math.abs(i - currentPage) <= 1) {
            html += `<button class="pagination-btn" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === 4 || i === totalPages - 3) {
            html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})">下一页 →</button>`;
    }
    
    html += `<span class="pagination-info">第 ${currentPage} / ${totalPages} 页</span>`;
    html += '</div>';
    
    container.innerHTML = html;
}

// 跳转到指定页
function goToPage(page) {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderMessages();
        // 滚动到留言区
        document.querySelector('.messages-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// 搜索功能
function searchMessages() {
    const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchText) {
        filteredMessages = allMessages;
    } else {
        filteredMessages = allMessages.filter(msg => {
            const name = msg.name.toLowerCase();
            const content = msg.content.toLowerCase();
            const email = msg.email.toLowerCase();
            
            return name.includes(searchText) || content.includes(searchText) || email.includes(searchText);
        });
    }
    
    currentPage = 1;
    updateStats();
    renderMessages();
}

// 清空搜索
function clearSearch() {
    document.getElementById('searchInput').value = '';
    filteredMessages = allMessages;
    currentPage = 1;
    updateStats();
    renderMessages();
}

// 改变排序
function changeSortOrder() {
    currentSort = document.getElementById('sortSelect').value;
    currentPage = 1;
    renderMessages();
}

// 防止XSS的HTML转义函数
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

// 打开留言详情
function openMessageDetail(messageId) {
    // 保存消息ID到 sessionStorage，然后跳转到 feedback.html
    sessionStorage.setItem('viewMessageId', messageId);
    window.location.href = 'feedback.html';
}

// 事件监听
document.getElementById('searchBtn').addEventListener('click', searchMessages);
document.getElementById('clearBtn').addEventListener('click', clearSearch);
document.getElementById('sortSelect').addEventListener('change', changeSortOrder);

// 回车搜索
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMessages();
    }
});

// 页面加载时获取留言
loadMessages();

// 每30秒自动刷新一次
setInterval(loadMessages, 30000);
