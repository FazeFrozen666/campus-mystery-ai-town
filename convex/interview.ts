import { v } from 'convex/values';
import { action } from './_generated/server';
import { chatCompletion, LLMMessage } from './util/llm';

export const generateInterviewReply = action({
  args: {
    npcName: v.string(),
    npcDescription: v.string(),
    question: v.string(),
    history: v.array(
      v.object({
        speaker: v.union(v.literal('player'), v.literal('npc')),
        text: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const recentHistory = args.history.slice(-8);
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: [
          `你正在扮演校园悬疑调查游戏里的 NPC：${args.npcName}。`,
          `角色资料：${args.npcDescription}`,
          '',
          '背景：青云大学学生陈远舟在后山营地附近失踪。调查地点只包括营地、溪流、瀑布、木箱、树桩和林间旧路。',
          '回答规则：',
          '1. 只用这个 NPC 的口吻说话，不要跳出角色。',
          '2. 回复要自然，像人在被盘问，不要像任务说明。',
          '3. 可以透露线索，但不要一次把全部真相倒出来。',
          '4. 如果玩家问得太泛，就给一个可行动的方向。',
          '5. 每次回复 2 到 5 句话，中文。',
        ].join('\n'),
      },
      ...recentHistory.map((m): LLMMessage => ({
        role: m.speaker === 'player' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: args.question },
    ];

    try {
      const { content } = await chatCompletion({
        messages,
        max_tokens: 450,
        temperature: 0.82,
      });
      return {
        text: content.trim(),
        fallback: false,
      };
    } catch (error) {
      console.error('Interview reply generation failed:', error);
      return {
        text: fallbackReply(args.npcName),
        fallback: true,
      };
    }
  },
});

function fallbackReply(npcName: string) {
  if (npcName.includes('林')) {
    return '陈远舟那天确实去过后山营地。他不是随便去玩的，他在查一条旧路线，还带走过一支录音笔。你要是想继续查，先别离开溪流和瀑布那一带。';
  }
  if (npcName.includes('陈')) {
    return '我那晚真的看见过一个灰衣人，沿着溪流往瀑布方向跑。那个人鞋底有反光，我不会看错。你别逼我一下子全说完，我也怕惹上麻烦。';
  }
  if (npcName.includes('周')) {
    return '陈远舟之前向我借过旧路线图，他说后山有条很少有人走的小路。营地、木箱、树桩和溪流边的痕迹应该连在一起看，单看任何一个都容易误判。';
  }
  if (npcName.includes('王')) {
    return '我巡逻时闻到木箱附近有烧焦味，还看见碎玻璃和新脚印。后山晚上平时没人往瀑布那边走，那晚肯定有人刻意避开主路。';
  }
  if (npcName.includes('灰')) {
    return '你如果只是来抓一个“可疑的人”，那你会抓错方向。陈远舟留下的东西不是给所有人看的，先把录音笔、旧路线和溪流边的脚印串起来。';
  }
  return '这件事没那么简单。你先去营地、溪流、木箱和树桩附近多看看，再回来问我。';
}
