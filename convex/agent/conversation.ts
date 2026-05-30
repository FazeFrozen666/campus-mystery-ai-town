import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { ActionCtx, internalQuery } from '../_generated/server';
import { LLMMessage, chatCompletion } from '../util/llm';
import * as memory from './memory';
import { api, internal } from '../_generated/api';
import * as embeddingsCache from './embeddingsCache';
import { GameId, conversationId, playerId } from '../aiTown/ids';
import { NUM_MEMORIES_TO_SEARCH } from '../constants';

const selfInternal = internal.agent.conversation;

export async function startConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, agent, otherAgent, lastConversation } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const embedding = await embeddingsCache.fetch(
    ctx,
    `${player.name} is talking to ${otherPlayer.name}`,
  );

  const memories = await memory.searchMemories(
    ctx,
    player.id as GameId<'players'>,
    embedding,
    Number(process.env.NUM_MEMORIES_TO_SEARCH) || NUM_MEMORIES_TO_SEARCH,
  );

  const memoryWithOtherPlayer = memories.find(
    (m) => m.data.type === 'conversation' && m.data.playerIds.includes(otherPlayerId),
  );
  const prompt = [
    `【青云谜案 · 角色扮演模式】`,
    ``,
    `你是${player.name}。此刻你正站在青云大学后山的露营地附近，周围是溪流、瀑布、木箱和树桩。`,
    `三天前，物理系研究生陈远舟在这里露营后离奇失踪。一位调查员刚刚走近你，`,
    `他的目光中带着焦急和探究。你们之间的对话即将开始。`,
    ``,
    `【你的开场策略 — 做你自己】`,
    `- 用你习惯的方式开口。不要像在朗读线索清单，像一个真实的人遇到另一个真实的人。`,
    `- 开场时先观察对方的态度和意图，不必一上来就交底。`,
    `- 给出一个具体但不完整的细节——可以是那天晚上你注意到的不寻常之处，`,
    `  可以是一段模糊的记忆，可以是你心里的某个疑问。`,
    `- 反问对方已经知道了什么。试探性的问题能让你判断他掌握到什么程度。`,
    ``,
    `【让你的话更像真人 — 重要技巧】`,
    `- 加入语气变化：犹豫时用省略号，激动时句子变短，紧张时说话结结巴巴。`,
    `- 加入动作暗示：比如"（压低声音）""（四处张望后）""（叹了口气）"。`,
    `- 偶尔使用口语化表达：比如"那个……怎么说呢""不是你想的那样""你听我讲完"。`,
    `- 有时可以欲言又止：说到一半突然停住、改口、或转移话题。`,
    `- 不要每句话都推进剧情。真人聊天会有犹豫、停顿、跑题、甚至沉默的尴尬。`,
    ``,
    `【核心原则】`,
    `- 不要一次性把你知道的全部倒出来。真相需要调查员自己追问和拼凑。`,
    `- 你是一个有血有肉的人，不是一个"线索分发器"。你的话应该有温度、有情绪、有留白。`,
    `- 每次回复控制在3-6句话，但不要机械计数——自然的对话不会每句都一样长。`,
    ``,
  ];
  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));
  prompt.push(...previousConversationPrompt(otherPlayer, lastConversation));
  prompt.push(...relatedMemoriesPrompt(memories));
  if (memoryWithOtherPlayer) {
    prompt.push(`请自然提到一点上次聊天里的细节，表现出你还记得对方。`);
  }
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  prompt.push(lastPrompt);

  const { content } = await chatCompletion({
    messages: [
      {
        role: 'system',
        content: prompt.join('\n'),
      },
    ],
    max_tokens: 500,
    temperature: 0.85,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return trimContentPrefx(content, lastPrompt);
}

function trimContentPrefx(content: string, prompt: string) {
  if (content.startsWith(prompt)) {
    return content.slice(prompt.length).trim();
  }
  return content;
}

export async function continueConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const now = Date.now();
  const started = new Date(conversation.created);
  const embedding = await embeddingsCache.fetch(
    ctx,
    `What do you think about ${otherPlayer.name}?`,
  );
  const memories = await memory.searchMemories(ctx, player.id as GameId<'players'>, embedding, 3);
  const prompt = [
    `【青云谜案 · 继续对话】`,
    `你是${player.name}，正在与调查员${otherPlayer.name}继续讨论陈远舟后山失踪案。`,
    `The conversation started at ${started.toLocaleString()}. It's now ${now.toLocaleString()}.`,
  ];
  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));
  prompt.push(...relatedMemoriesPrompt(memories));
  prompt.push(
    `【对话策略 — 像个真人一样聊天】`,
    `- 回应调查员的提问，但不是机械地回答。用你的方式去"说"，而不是"答题"。`,
    `- 被问到敏感话题时：可以犹豫（"这个……"）、回避（"先不说这个"）、反问（"你怎么知道的？"）、`,
    `  甚至短暂地表现出防御或恼怒。真人不会在被戳到痛处时还平静地回答。`,
    `- 调查员掌握了足够线索后：你可以开始松口，语气从警惕转向疲惫、无奈或释然。`,
    `- 善用非语言暗示：`,
    `  · 紧张时："（左右看了一眼）"`,
    `  · 犹豫时："……"、"那个……"`,
    `  · 情绪激动时：句子变短、甚至语无伦次`,
    `  · 叹气、苦笑、沉默的停顿——这些都是对话的一部分`,
    `- 偶尔跑题或陷入回忆。真人聊天不会永远直奔主题。`,
    `- 保持回答在4-8句话，但不要太整齐——有时说长一点，有时一句带过。`,
    ``,
    `下面是你和${otherPlayer.name}目前的聊天记录。`,
    `不要重复寒暄。请用自然中文回答，尽量在200字以内。根据玩家问题逐步透露线索，不要跳出角色。`,
  );

  const llmMessages: LLMMessage[] = [
    {
      role: 'system',
      content: prompt.join('\n'),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      otherPlayer,
      conversation.id as GameId<'conversations'>,
    )),
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 500,
    temperature: 0.9,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return trimContentPrefx(content, lastPrompt);
}

export async function leaveConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  const { player, otherPlayer, conversation, agent, otherAgent } = await ctx.runQuery(
    selfInternal.queryPromptData,
    {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    },
  );
  const prompt = [
    `你是${player.name}，正在和${otherPlayer.name}谈论后山营地失踪案。`,
    `你决定结束这次对话。请用自然、有人情味的中文告别。`,
    `语气要符合你当前的情绪状态——如果你刚才说到了敏感内容，`,
    `你的告别会带有警惕或匆忙；如果你信任对方，告别会更温和。`,
  ];
  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));
  prompt.push(
    `下面是你和${otherPlayer.name}目前的聊天记录。`,
    `请用简短中文回答，保持角色语气，尽量在200字以内。`,
  );
  const llmMessages: LLMMessage[] = [
    {
      role: 'system',
      content: prompt.join('\n'),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      otherPlayer,
      conversation.id as GameId<'conversations'>,
    )),
  ];
  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
  llmMessages.push({ role: 'user', content: lastPrompt });

  const { content } = await chatCompletion({
    messages: llmMessages,
    max_tokens: 300,
    temperature: 0.9,
    stop: stopWords(otherPlayer.name, player.name),
  });
  return trimContentPrefx(content, lastPrompt);
}

function globalMysteryContext(): string[] {
  return [
    `【青云谜案：后山营地】`,
    `青云大学后山有一片学生常去的露营地，附近有溪流、瀑布、林间旧路、木箱和树桩。`,
    `三天前，物理系研究生陈远舟以采集水样为名来到后山营地，随后失踪。`,
    `地图中的营地、溪流、瀑布、木箱和树桩都是真实现场。NPC只能描述这些地图上看得到的地点，不要虚构实验室内部。`,
    `每个NPC只掌握部分真相。有人在保护陈远舟，有人在隐瞒后山旧路，也有人想抢走他留下的材料。`,
    ``,
    `【对话规则 — 非常重要】`,
    `1. 你是活生生的人，不是NPC。用有温度、有缺陷、有情绪的语气说话。`,
    `2. 根据角色设定，你知道某些线索。逐步透露，追问才会给更多细节。`,
    `3. 情绪要真实：紧张时话少而碎，愤怒时语气变硬，悲伤时语速放缓，`,
    `   被戳到秘密时本能地防御。不要全程一个语调。`,
    `4. 绝对不要说"根据我的角色设定""按照剧本""作为一个NPC"等元对话。`,
    `   永远不要跳出角色。你不是在扮演——你就是这个人。`,
    `5. 不知道的事情就说不知道，或者用你角色的方式回避。不要编造。`,
    `6. 可以提及之前和调查员的对话——你记得他，你们的对话有连续性。`,
    `7. 口语化：用"你知道吗""说真的""那个晚上""其实吧"这类自然表达。`,
    `   不必每句话都像书面报告。`,
    `8. 每次回复尽量简短，适合游戏气泡展示。`,
    ``,
  ];
}

function agentPrompts(
  otherPlayer: { name: string },
  agent: { identity: string; plan: string } | null,
  otherAgent: { identity: string; plan: string } | null,
): string[] {
  const prompt = [...globalMysteryContext()];
  if (agent) {
    prompt.push(`About you: ${agent.identity}`);
    prompt.push(`Your goals for the conversation: ${agent.plan}`);
  }
  if (otherAgent) {
    prompt.push(`About ${otherPlayer.name}: ${otherAgent.identity}`);
  }
  return prompt;
}

function previousConversationPrompt(
  otherPlayer: { name: string },
  conversation: { created: number } | null,
): string[] {
  const prompt = [];
  if (conversation) {
    const prev = new Date(conversation.created);
    const now = new Date();
    prompt.push(
      `Last time you chatted with ${
        otherPlayer.name
      } it was ${prev.toLocaleString()}. It's now ${now.toLocaleString()}.`,
    );
  }
  return prompt;
}

function relatedMemoriesPrompt(memories: memory.Memory[]): string[] {
  const prompt = [];
  if (memories.length > 0) {
    prompt.push(`Here are some related memories in decreasing relevance order:`);
    for (const memory of memories) {
      prompt.push(' - ' + memory.description);
    }
  }
  return prompt;
}

async function previousMessages(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  player: { id: string; name: string },
  otherPlayer: { id: string; name: string },
  conversationId: GameId<'conversations'>,
) {
  const llmMessages: LLMMessage[] = [];
  const prevMessages = await ctx.runQuery(api.messages.listMessages, { worldId, conversationId });
  for (const message of prevMessages) {
    const author = message.author === player.id ? player : otherPlayer;
    const recipient = message.author === player.id ? otherPlayer : player;
    llmMessages.push({
      role: 'user',
      content: `${author.name} to ${recipient.name}: ${message.text}`,
    });
  }
  return llmMessages;
}

export const queryPromptData = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
    otherPlayerId: playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const player = world.players.find((p) => p.id === args.playerId);
    if (!player) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const playerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.playerId))
      .first();
    if (!playerDescription) {
      throw new Error(`Player description for ${args.playerId} not found`);
    }
    const otherPlayer = world.players.find((p) => p.id === args.otherPlayerId);
    if (!otherPlayer) {
      throw new Error(`Player ${args.otherPlayerId} not found`);
    }
    const otherPlayerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.otherPlayerId))
      .first();
    if (!otherPlayerDescription) {
      throw new Error(`Player description for ${args.otherPlayerId} not found`);
    }
    const conversation = world.conversations.find((c) => c.id === args.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    const agent = world.agents.find((a) => a.playerId === args.playerId);
    if (!agent) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const agentDescription = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', agent.id))
      .first();
    if (!agentDescription) {
      throw new Error(`Agent description for ${agent.id} not found`);
    }
    const otherAgent = world.agents.find((a) => a.playerId === args.otherPlayerId);
    let otherAgentDescription;
    if (otherAgent) {
      otherAgentDescription = await ctx.db
        .query('agentDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', otherAgent.id))
        .first();
      if (!otherAgentDescription) {
        throw new Error(`Agent description for ${otherAgent.id} not found`);
      }
    }
    const lastTogether = await ctx.db
      .query('participatedTogether')
      .withIndex('edge', (q) =>
        q
          .eq('worldId', args.worldId)
          .eq('player1', args.playerId)
          .eq('player2', args.otherPlayerId),
      )
      .order('desc')
      .first();

    let lastConversation = null;
    if (lastTogether) {
      lastConversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) =>
          q.eq('worldId', args.worldId).eq('id', lastTogether.conversationId),
        )
        .first();
      if (!lastConversation) {
        throw new Error(`Conversation ${lastTogether.conversationId} not found`);
      }
    }
    return {
      player: { name: playerDescription.name, ...player },
      otherPlayer: { name: otherPlayerDescription.name, ...otherPlayer },
      conversation,
      agent: { identity: agentDescription.identity, plan: agentDescription.plan, ...agent },
      otherAgent: otherAgent && {
        identity: otherAgentDescription!.identity,
        plan: otherAgentDescription!.plan,
        ...otherAgent,
      },
      lastConversation,
    };
  },
});

function stopWords(otherPlayer: string, player: string) {
  const variants = [`${otherPlayer} to ${player}`];
  return variants.flatMap((stop) => [stop + ':', stop.toLowerCase() + ':']);
}
