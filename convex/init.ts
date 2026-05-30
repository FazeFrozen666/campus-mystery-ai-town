import { v } from 'convex/values';
import { internal } from './_generated/api';
import { DatabaseReader, MutationCtx, mutation } from './_generated/server';
import { Descriptions } from '../data/characters';
import * as map from '../data/gentle';
import { insertInput } from './aiTown/insertInput';
import { Id } from './_generated/dataModel';
import { createEngine } from './aiTown/main';
import { ENGINE_ACTION_DURATION } from './constants';
import { detectMismatchedLLMProvider } from './util/llm';

const FIXED_AGENT_POSITIONS = [
  { x: 13, y: 17 },
  { x: 16, y: 17 },
  { x: 13, y: 20 },
  { x: 16, y: 20 },
  { x: 18, y: 18 },
];

const init = mutation({
  args: {
    numAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    detectMismatchedLLMProvider();
    const { worldStatus, engineId } = await getOrCreateDefaultWorld(ctx);
    if (worldStatus.status !== 'running') {
      console.warn(
        `Engine ${engineId} is not active! Run "npx convex run testing:resume" to restart it.`,
      );
      return;
    }
    await syncExistingAgentDescriptions(ctx, worldStatus.worldId);
    const existingOrPendingAgents = await countExistingOrPendingAgents(
      ctx.db,
      worldStatus.worldId,
      worldStatus.engineId,
    );
    const toCreate = args.numAgents !== undefined ? args.numAgents : Descriptions.length;
    if (existingOrPendingAgents < toCreate) {
      for (let i = existingOrPendingAgents; i < toCreate; i++) {
        await insertInput(ctx, worldStatus.worldId, 'createAgent', {
          descriptionIndex: i % Descriptions.length,
        });
      }
    }
  },
});
export default init;

async function getOrCreateDefaultWorld(ctx: MutationCtx) {
  const now = Date.now();

  let worldStatus = await ctx.db
    .query('worldStatus')
    .filter((q) => q.eq(q.field('isDefault'), true))
    .unique();
  if (worldStatus) {
    return { worldStatus, engineId: worldStatus.engineId };
  }

  const engineId = await createEngine(ctx);
  const engine = (await ctx.db.get(engineId))!;
  const worldId = await ctx.db.insert('worlds', {
    nextId: 0,
    agents: [],
    conversations: [],
    players: [],
  });
  const worldStatusId = await ctx.db.insert('worldStatus', {
    engineId: engineId,
    isDefault: true,
    lastViewed: now,
    status: 'running',
    worldId: worldId,
  });
  worldStatus = (await ctx.db.get(worldStatusId))!;
  await ctx.db.insert('maps', {
    worldId,
    width: map.mapwidth,
    height: map.mapheight,
    tileSetUrl: map.tilesetpath,
    tileSetDimX: map.tilesetpxw,
    tileSetDimY: map.tilesetpxh,
    tileDim: map.tiledim,
    bgTiles: map.bgtiles,
    objectTiles: map.objmap,
    animatedSprites: map.animatedsprites,
  });
  await ctx.scheduler.runAfter(0, internal.aiTown.main.runStep, {
    worldId,
    generationNumber: engine.generationNumber,
    maxDuration: ENGINE_ACTION_DURATION,
  });
  return { worldStatus, engineId };
}

async function countExistingOrPendingAgents(
  db: DatabaseReader,
  worldId: Id<'worlds'>,
  engineId: Id<'engines'>,
) {
  const world = await db.get(worldId);
  if (!world) {
    throw new Error(`Invalid world ID: ${worldId}`);
  }
  const unactionedJoinInputs = await db
    .query('inputs')
    .withIndex('byInputNumber', (q) => q.eq('engineId', engineId))
    .order('asc')
    .filter((q) => q.eq(q.field('name'), 'createAgent'))
    .filter((q) => q.eq(q.field('returnValue'), undefined))
    .collect();
  return world.agents.length + unactionedJoinInputs.length;
}

async function syncExistingAgentDescriptions(ctx: MutationCtx, worldId: Id<'worlds'>) {
  const world = await ctx.db.get(worldId);
  if (!world) {
    return;
  }
  for (let i = 0; i < world.agents.length; i++) {
    const agent = world.agents[i];
    const description = Descriptions[i % Descriptions.length];
    const playerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('playerId', agent.playerId))
      .first();
    if (playerDescription) {
      await ctx.db.patch(playerDescription._id, {
        name: description.name,
        character: description.character,
        description: description.identity,
      });
    }
    const agentDescription = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('agentId', agent.id))
      .first();
    if (agentDescription) {
      await ctx.db.patch(agentDescription._id, {
        identity: description.identity,
        plan: description.plan,
      });
    }
  }
  const fixedPlayers = world.players.map((player) => {
    const agentIndex = world.agents.findIndex((agent) => agent.playerId === player.id);
    if (agentIndex === -1) {
      return player;
    }
    const position = FIXED_AGENT_POSITIONS[agentIndex % FIXED_AGENT_POSITIONS.length];
    const { pathfinding: _pathfinding, activity: _activity, ...rest } = player;
    return {
      ...rest,
      position,
      facing: { dx: 0, dy: 1 },
      speed: 0,
    };
  });
  await ctx.db.patch(worldId, {
    players: fixedPlayers,
    conversations: [],
  });
}
