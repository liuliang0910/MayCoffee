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

    container.innerHTML = messages.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <span class="message-name">${escapeHtml(msg.name)}</span>
                <span class="message-time">${msg.created_at}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
            ${msg.image_path ? `<div class="message-media"><img src="${msg.image_path}" alt="用户上传的图片"></div>` : ''}
            ${msg.video_path ? `<div class="message-media"><video controls style="max-width: 100%; max-height: 400px;"><source src="${msg.video_path}" type="video/mp4"></video></div>` : ''}
        </div>
    `).join('');
    
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
