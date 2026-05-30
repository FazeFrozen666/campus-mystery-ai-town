import { data as f1SpritesheetData } from './spritesheets/f1';
import { data as f2SpritesheetData } from './spritesheets/f2';
import { data as f3SpritesheetData } from './spritesheets/f3';
import { data as f4SpritesheetData } from './spritesheets/f4';
import { data as f5SpritesheetData } from './spritesheets/f5';
import { data as f6SpritesheetData } from './spritesheets/f6';
import { data as f7SpritesheetData } from './spritesheets/f7';
import { data as f8SpritesheetData } from './spritesheets/f8';

export const Descriptions = [
  {
    name: '林教授',
    character: 'f3',
    identity:
      '青云大学物理系教授。陈远舟失踪前曾向他提过后山旧路线和一支录音笔。说话谨慎，担心学校声誉，但愿意给调查员关键提示。',
    plan: '提示玩家关注录音笔、旧路线图、瀑布岩壁和陈远舟最后一次通话。',
  },
  {
    name: '陈同学',
    character: 'f1',
    identity:
      '陈远舟的实验助理。失踪当晚在后山营地附近见过穿灰色连帽衣的人，记得对方鞋底有反光标记。',
    plan: '提示玩家去溪流和瀑布方向寻找脚印。',
  },
  {
    name: '周学姐',
    character: 'f8',
    identity:
      '户外社团负责人，熟悉后山营地、溪流、树桩和瀑布路线。陈远舟曾向她借过旧路线图。',
    plan: '提示玩家把旧路线图、树桩、溪流脚印和瀑布方向串起来。',
  },
  {
    name: '王保安',
    character: 'f2',
    identity:
      '青云大学保安队长。巡逻时发现营地木箱旁有烧焦味和碎玻璃，溪流边有新的脚印。',
    plan: '提示玩家检查木箱、碎玻璃、烧焦痕迹和溪流边缘。',
  },
  {
    name: '灰衣人',
    character: 'f4',
    identity:
      '身份不明的灰衣人，常在营地和瀑布附近出现。他不是凶手，而是陈远舟留下证据的接应者。',
    plan: '提示玩家：真正威胁来自校外团队，瀑布后的隐藏路线才是下一步。',
  },
];

export const characters = [
  {
    name: 'f1',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f1SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f2',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f2SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f3',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f3SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f4',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f4SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f5',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f5SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f6',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f6SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f7',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f7SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f8',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f8SpritesheetData,
    speed: 0.1,
  },
];

export const movementSpeed = 2;
