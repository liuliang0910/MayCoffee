#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
初始化兑换商品数据
运行此脚本会在数据库中添加一些示例兑换商品
"""

from app import app, db, RedemptionItem

# 示例兑换商品数据
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
        'description': '精选单品咖啡豆250克,可选埃塞俄比亚或哥伦比亚',
        'image': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
        'stock': 30
    },
    {
        'name': '五月咖啡马克杯',
        'points_required': 300,
        'description': '五月咖啡定制马克杯,陶瓷材质,精美包装',
        'image': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80',
        'stock': 20
    },
    {
        'name': '咖啡月卡',
        'points_required': 500,
        'description': '30天内每天可免费兑换一杯中杯美式咖啡',
        'image': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
        'stock': 10
    },
    {
        'name': '手冲咖啡体验课',
        'points_required': 800,
        'description': '专业咖啡师一对一手冲咖啡教学,时长2小时',
        'image': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
        'stock': 5
    },
    {
        'name': 'VIP年卡',
        'points_required': 1000,
        'description': '全年8折优惠,赠送精美保温杯一个',
        'image': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
        'stock': 10
    }
]

def init_items():
    """初始化兑换商品数据"""
    with app.app_context():
        # 检查是否已有数据
        existing_count = RedemptionItem.query.count()
        if existing_count > 0:
            print(f"⚠️  数据库中已有 {existing_count} 个兑换商品")
            answer = input("是否要清空并重新添加? (yes/no): ")
            if answer.lower() != 'yes':
                print("❌ 操作已取消")
                return
            
            # 清空现有数据
            RedemptionItem.query.delete()
            db.session.commit()
            print("✅ 已清空现有数据")
        
        # 添加示例数据
        for item_data in sample_items:
            item = RedemptionItem(**item_data)
            db.session.add(item)
        
        db.session.commit()
        print(f"✅ 成功添加 {len(sample_items)} 个兑换商品!")
        
        # 显示添加的商品
        print("\n📦 已添加的商品列表:")
        for item in sample_items:
            print(f"  - {item['name']}: {item['points_required']}积分 (库存:{item['stock']})")

if __name__ == '__main__':
    print("=" * 50)
    print("五月咖啡 - 初始化兑换商品数据")
    print("=" * 50)
    init_items()
    print("\n✨ 完成!")
