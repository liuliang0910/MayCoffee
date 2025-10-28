#!/bin/bash

# 自动同步脚本 - 每分钟检查一次文件变化，自动提交和推送到 GitHub

PROJECT_DIR="/Users/liuliang/Library/Mobile Documents/com~apple~CloudDocs/222 - Web | 网页/20250919，测试"
LOG_FILE="$PROJECT_DIR/auto_sync.log"

# 进入项目目录
cd "$PROJECT_DIR"

# 无限循环
while true; do
    # 检查是否有文件变化
    if ! git diff-index --quiet HEAD --; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 检测到文件变化，开始同步..." >> "$LOG_FILE"
        
        # 添加所有变化
        git add .
        
        # 提交变化
        COMMIT_MSG="自动同步 - $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
        
        # 推送到 GitHub
        git push >> "$LOG_FILE" 2>&1
        
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 同步完成" >> "$LOG_FILE"
    fi
    
    # 等待 60 秒后再检查
    sleep 60
done
