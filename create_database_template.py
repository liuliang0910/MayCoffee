#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建数据库模板
这个脚本会创建一个干净的数据库结构，包含示例兑换商品，但不包含用户数据
可以提交到GitHub作为初始化模板
"""

import os
from app import app, db, RedemptionItem

def create_template():
    """创建数据库模板"""
    
    # 删除旧模板
    template_path = 'database_template.db'
    if os.path.exists(template_path):
        os.remove(template_path)
        print(f"✅ 已删除旧模板")
    
    # 临时修改数据库路径
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{template_path}'
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        print("✅ 数据库结构创建成功")
        
        # 添加示例兑换商品
        sample_items = [
            {
                'name': '美式咖啡券',
                'points_required': 50,
                'description': '可兑换一杯中杯美式咖啡',
                'image': 'https://images.unsplash.com/photo-1494314671902-399b18174975?w=400&q=80',
                'stock': 100
            },
            {
                'name': '拿铁咖啡券',
                'points_required': 80,
                'description': '可兑换一杯中杯拿铁咖啡',
                'image': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
                'stock': 100
            },
            {
                'name': '手工曲奇饼干',
                'points_required': 100,
                'description': '店内自制手工曲奇一份(6块)',
                'image': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80',
                'stock': 50
            },
            {
                'name': '精品咖啡豆(250g)',
                'points_required': 200,
                'description': '精选单品咖啡豆250克',
                'image': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
                'stock': 30
            },
            {
                'name': '五月咖啡马克杯',
                'points_required': 300,
                'description': '五月咖啡定制马克杯',
                'image': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80',
                'stock': 20
            },
            {
                'name': '咖啡月卡',
                'points_required': 500,
                'description': '30天内每天免费兑换一杯美式咖啡',
                'image': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
                'stock': 10
            },
            {
                'name': '手冲咖啡体验课',
                'points_required': 800,
                'description': '专业咖啡师一对一手冲咖啡教学',
                'image': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
                'stock': 5
            },
            {
                'name': 'VIP年卡',
                'points_required': 1000,
                'description': '全年8折优惠,赠送精美保温杯',
                'image': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
                'stock': 10
            }
        ]
        
        for item_data in sample_items:
            item = RedemptionItem(**item_data)
            db.session.add(item)
        
        db.session.commit()
        print(f"✅ 成功添加 {len(sample_items)} 个示例兑换商品")
    
    # 显示文件大小
    size = os.path.getsize(template_path)
    print(f"\n📦 模板数据库: {template_path}")
    print(f"📊 文件大小: {size / 1024:.2f} KB")
    print("\n✨ 模板创建完成!")
    print("💡 这个文件可以提交到GitHub,用于初始化新环境")

if __name__ == '__main__':
    print("=" * 60)
    print("创建数据库模板")
    print("=" * 60)
    create_template()
