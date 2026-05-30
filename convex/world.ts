import { ConvexError, v } from 'convex/values';
import { action, internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { characters } from '../data/characters';
import {
  DEFAULT_NAME,
  ENGINE_ACTION_DURATION,
  IDLE_WORLD_TIMEOUT,
  WORLD_HEARTBEAT_INTERVAL,
} from './constants';
import { allocGameId, playerId } from './aiTown/ids';
import { kickEngine, startEngine, stopEngine } from './aiTown/main';
import { engineInsertInput } from './engine/abstractGame';

export const defaultWorldStatus = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
  },
});

export const heartbeatWorld = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldStatus) throw new Error(`Invalid world ID: ${args.worldId}`);

    const now = Date.now();
    if (!worldStatus.lastViewed || worldStatus.lastViewed < now - WORLD_HEARTBEAT_INTERVAL / 2) {
      await ctx.db.patch(worldStatus._id, {
        lastViewed: Math.max(worldStatus.lastViewed ?? now, now),
      });
    }
    if (worldStatus.status === 'inactive') {
      await ctx.db.patch(worldStatus._id, { status: 'running' });
      await startEngine(ctx, worldStatus.worldId);
    }
  },
});

export const stopInactiveWorlds = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - IDLE_WORLD_TIMEOUT;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (cutoff < worldStatus.lastViewed || worldStatus.status !== 'running') continue;
      await ctx.db.patch(worldStatus._id, { status: 'inactive' });
      await stopEngine(ctx, worldStatus.worldId);
    }
  },
});

export const restartDeadWorlds = internalMutation({
  handler: async (ctx) => {
    const engineTimeout = Date.now() - ENGINE_ACTION_DURATION * 2;
    const worlds = await ctx.db.query('worldStatus').collect();
    for (const worldStatus of worlds) {
      if (worldStatus.status !== 'running') continue;
      const engine = await ctx.db.get(worldStatus.engineId);
      if (!engine) throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
      if (engine.currentTime && engine.currentTime < engineTimeout) {
        await kickEngine(ctx, worldStatus.worldId);
      }
    }
  },
});

export const userStatus = query({
  args: { worldId: v.id('worlds') },
  handler: async () => DEFAULT_NAME,
});

export const joinWorld = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) throw new ConvexError(`Invalid world ID: ${args.worldId}`);

    await removeHumanPlayer(ctx, world);
    const freshWorld = (await ctx.db.get(args.worldId)) ?? world;
    const investigatorCharacter = characters.find((c) => c.name === 'f5') ?? characters[0];
    const newPlayerId = allocGameId('players', freshWorld.nextId);

    const joinPatch: any = {
      nextId: freshWorld.nextId + 1,
      conversations: [],
      players: [
        ...freshWorld.players,
        {
          id: newPlayerId,
          human: DEFAULT_NAME,
          lastInput: Date.now(),
          position: { x: 14, y: 18 },
          facing: { dx: 0, dy: 1 },
          speed: 0,
        },
      ],
    };
    if (freshWorld.historicalLocations) {
      joinPatch.historicalLocations = freshWorld.historicalLocations.filter(
        (location) => location.playerId !== newPlayerId,
      );
    }
    await ctx.db.patch(freshWorld._id, joinPatch);

    await ctx.db.insert('playerDescriptions', {
      worldId: freshWorld._id,
      playerId: newPlayerId,
      name: DEFAULT_NAME,
      character: investigatorCharacter.name,
      description:
        'Campus investigator looking into Chen Yuanzhou disappearance near the back-hill camp.',
    });

    return newPlayerId;
  },
});

export const leaveWorld = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) throw new Error(`Invalid world ID: ${args.worldId}`);
    await removeHumanPlayer(ctx, world);
    return null;
  },
});

async function removeHumanPlayer(ctx: MutationCtx, world: any) {
  const humanPlayerIds = world.players
    .filter((player: any) => player.human === DEFAULT_NAME)
    .map((player: any) => player.id);
  if (humanPlayerIds.length === 0) return;

  const leavePatch: any = {
    players: world.players.filter((player: any) => !humanPlayerIds.includes(player.id)),
    conversations: world.conversations.filter((conversation: any) =>
      conversation.participants.every(
        (participant: any) => !humanPlayerIds.includes(participant.playerId),
      ),
    ),
  };
  if (world.historicalLocations) {
    leavePatch.historicalLocations = world.historicalLocations.filter(
      (location: any) => !humanPlayerIds.includes(location.playerId),
    );
  }
  await ctx.db.patch(world._id, leavePatch);

  for (const id of humanPlayerIds) {
    const descriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', world._id).eq('playerId', id))
      .collect();
    for (const description of descriptions) {
      await ctx.db.delete(description._id);
    }
  }
}

export const sendWorldInput = mutation({
  args: {
    engineId: v.id('engines'),
    name: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    return await engineInsertInput(ctx, args.engineId, args.name as any, args.args);
  },
});

export const worldState = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) throw new Error(`Invalid world ID: ${args.worldId}`);

    const worldStatus = await ctx.db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', world._id))
      .unique();
    if (!worldStatus) throw new Error(`Invalid world status ID: ${world._id}`);

    const engine = await ctx.db.get(worldStatus.engineId);
    if (!engine) throw new Error(`Invalid engine ID: ${worldStatus.engineId}`);
    return { world, engine };
  },
});

export const gameDescriptions = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const playerDescriptions = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const agentDescriptions = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .collect();
    const worldMap = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId))
      .first();
    if (!worldMap) throw new Error(`No map for world: ${args.worldId}`);
    return { worldMap, playerDescriptions, agentDescriptions };
  },
});

export const previousConversation = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async () => null,
});

export const generateAccusationEnding = action({
  args: {
    worldId: v.id('worlds'),
    accusedSuspectId: v.string(),
  },
  handler: async (_ctx, args) => {
    const suspectNames: Record<string, string> = {
      lin: '林教授',
      chen: '陈同学',
      zhou: '周学姐',
      wang: '王保安',
      gray: '灰衣人',
    };
    const suspectName = suspectNames[args.accusedSuspectId] ?? '未知人物';
    const isCorrect = args.accusedSuspectId === 'gray';
    const ending = isCorrect
      ? '灰衣人是第一阶段最关键的突破口。他不是案件终点，而是陈远舟留下证据的接应者。录音笔、旧路线图、溪流脚印和瀑布方向终于串成一条线：陈远舟发现的东西，被校外的人盯上了。第一阶段调查完成，但更深的真相还藏在瀑布后的旧路里。'
      : `${suspectName}身上确实有疑点，但现在指认还太早。现有证据会把你重新带回灰衣人、溪流脚印和旧路线图。回到地图继续收集线索，再重新提交推理。`;
    return { ending, isCorrect, suspectName, fallback: true };
  },
});
