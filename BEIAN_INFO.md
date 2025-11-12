# 网站备案信息

## 备案号
**粤ICP备2025493201号-1**

## 备案信息位置
备案号已添加到网站所有页面的页脚中，包括：
- 首页 (index.html)
- 产品菜单 (menu.html)
- 关于我们 (about.html)
- 联系我们 (contact.html)
- 客户留言 (feedback.html)

## 页脚样式
- 备案号显示在版权信息下方
- 字体大小：12px
- 颜色：#999（浅灰色）
- 备案号链接指向工信部备案查询网站：https://beian.miit.gov.cn/

## 修改的文件
1. **css/style.css** - 添加了 `.beian-info` 样式类
2. **index.html** - 添加备案号到页脚
3. **menu.html** - 添加备案号到页脚
4. **about.html** - 添加备案号到页脚
5. **contact.html** - 添加备案号到页脚
6. **feedback.html** - 添加备案号到页脚

## 样式说明
```css
.main-footer .beian-info {
    font-size: 12px;
    color: #999;
    margin-top: 10px;
}

.main-footer .beian-info a {
    color: #999;
    text-decoration: none;
    transition: color 0.3s;
}

.main-footer .beian-info a:hover {
    color: #a37e58;
    text-decoration: underline;
}
```

## 备案查询
用户可以点击页脚的备案号链接，跳转到工信部网站查询备案信息。
