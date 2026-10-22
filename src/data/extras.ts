// 补充内容：从旧版（原高级版）保留、新版站点没有的玩法
import type { GameMode } from '../types'

const GIFTS = [
  'VR眼镜', '一副墨镜', '一款香水', '仿真手枪', '公仔', '内衣迷你洗衣机', '剃须刀', '包包', '口红', '吹风机',
  '多功能小夜灯', '头部按摩爪', '女生披肩', '手表', '手链项链', '打火机', '拍立得照相机', '按摩枕', '斜挎包', '旅行箱',
  '服饰', '望远镜', '气垫', '洗护用品', '电动牙刷', '电竞椅', '男士护颈仪', '私人订制（手绘、DIY礼盒…）', '精华（化妆品）',
  '美容（洗脸仪、脱毛仪、按摩仪）', '耳机', '蓝牙音箱', '跑车模型', '遮阳伞', '鞋子', '香薰蜡烛', '驱蚊小空调',
]

export const extraModes: GameMode[] = [
  {
    id: 'wheel-gift',
    game: 'wheel',
    title: '七夕礼物转盘',
    free: true,
    series: 'legacy',
    price: 0,
    cards: GIFTS.map((g) => ({ type: 'text' as const, text: g })),
  },
]
