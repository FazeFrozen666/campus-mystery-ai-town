import * as PIXI from 'pixi.js';
import { useApp } from '@pixi/react';
import { Container, Graphics } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PixiStaticMap } from './PixiStaticMap.tsx';
import PixiViewport from './PixiViewport.tsx';
import { Viewport } from 'pixi-viewport';
import { Id } from '../../convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { toast } from 'react-toastify';
import { DebugPath } from './DebugPath.tsx';
import { PositionIndicator } from './PositionIndicator.tsx';
import { SHOW_DEBUG_UI } from './Game.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
import type { Location } from '../../convex/aiTown/location.ts';

const CLUE_STORAGE_KEY = 'campus-mystery-discovered-clues';
const CLUE_UPDATE_EVENT = 'campus-mystery-clues-updated';
const NPC_LEAD_STORAGE_KEY = 'campus-mystery-spoken-npcs';
const NPC_LEAD_UPDATE_EVENT = 'campus-mystery-npc-leads-updated';
const LOCAL_MOVE_SPEED = 3.2;
const KEYBOARD_SYNC_MS = 300;
const COLLISION_PADDING = 0.35;
const PLAYER_COLLISION_RADIUS = 0.18;
const CLUE_PICKUP_DISTANCE = 1.6;

type ClueObject = {
  id: string;
  clueId?: string;
  tileX: number;
  tileY: number;
  kind: 'glass' | 'footprints' | 'drive' | 'map' | 'lock';
  requiredNpc?: string;
  requiredClues?: string[];
  decoyText?: string;
};

const CLUE_OBJECTS: ClueObject[] = [
  { id: 'c1', clueId: 'c1', tileX: 15, tileY: 14, kind: 'glass' },
  { id: 'c2', clueId: 'c2', tileX: 27, tileY: 25, kind: 'footprints', requiredNpc: '陈同学' },
  { id: 'c3', clueId: 'c3', tileX: 13, tileY: 19, kind: 'drive', requiredNpc: '王保安' },
  { id: 'c4', clueId: 'c4', tileX: 10, tileY: 24, kind: 'map', requiredNpc: '周学姐' },
  {
    id: 'c5',
    clueId: 'c5',
    tileX: 31,
    tileY: 19,
    kind: 'lock',
    requiredNpc: '灰衣人',
    requiredClues: ['c2', 'c4'],
  },
  { id: 'd1', tileX: 18, tileY: 16, kind: 'drive', decoyText: '这是社团备用电池，和失踪案关系不大。' },
  { id: 'd2', tileX: 23, tileY: 22, kind: 'map', decoyText: '这只是普通露营路线牌，没有新的案件信息。' },
  { id: 'd3', tileX: 30, tileY: 28, kind: 'glass', decoyText: '这里有些旧石块反光，但不是碎玻璃。' },
];

function getDiscoveredClueIds(): string[] {
  try {
    const raw = localStorage.getItem(CLUE_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function getNpcLeads(): string[] {
  try {
    const raw = localStorage.getItem(NPC_LEAD_STORAGE_KEY);
    const names = raw ? JSON.parse(raw) : [];
    return Array.isArray(names) ? names : [];
  } catch {
    return [];
  }
}

function discoverClue(clueId: string) {
  const ids = getDiscoveredClueIds();
  if (ids.includes(clueId)) return;
  const next = [...ids, clueId];
  localStorage.setItem(CLUE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CLUE_UPDATE_EVENT, { detail: { clueId } }));
}

function isTextInputTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function directionFromKeys(keys: Set<string>) {
  const left = keys.has('a') || keys.has('arrowleft');
  const right = keys.has('d') || keys.has('arrowright');
  const up = keys.has('w') || keys.has('arrowup');
  const down = keys.has('s') || keys.has('arrowdown');
  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    return { x: dx / length, y: dy / length };
  }
  return { x: dx, y: dy };
}

function isLocalPositionBlocked(
  x: number,
  y: number,
  game: ServerGame,
  humanPlayerId: string,
) {
  if (
    x < COLLISION_PADDING ||
    y < COLLISION_PADDING ||
    x >= game.worldMap.width - COLLISION_PADDING ||
    y >= game.worldMap.height - COLLISION_PADDING
  ) {
    return true;
  }
  const samples = [
    { x, y },
    { x: x - PLAYER_COLLISION_RADIUS, y: y - PLAYER_COLLISION_RADIUS },
    { x: x + PLAYER_COLLISION_RADIUS, y: y - PLAYER_COLLISION_RADIUS },
    { x: x - PLAYER_COLLISION_RADIUS, y: y + PLAYER_COLLISION_RADIUS },
    { x: x + PLAYER_COLLISION_RADIUS, y: y + PLAYER_COLLISION_RADIUS },
  ];
  for (const sample of samples) {
    const tileX = Math.floor(sample.x);
    const tileY = Math.floor(sample.y);
    for (const layer of game.worldMap.objectTiles) {
      if (layer[tileX]?.[tileY] !== -1) {
        return true;
      }
    }
  }
  // NPCs can stand very close to the investigator during conversations.
  // Do not let local keyboard movement trap the player inside another sprite.
  return false;
}

function roundedDestination(location: Location, game: ServerGame) {
  return {
    x: Math.max(0, Math.min(game.worldMap.width - 1, Math.round(location.x))),
    y: Math.max(0, Math.min(game.worldMap.height - 1, Math.round(location.y))),
  };
}

export const PixiGame = (props: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  historicalTime: number | undefined;
  width: number;
  height: number;
  setSelectedElement: SelectElement;
}) => {
  const pixiApp = useApp();
  const viewportRef = useRef<Viewport | undefined>();
  const sendWorldInput = useMutation(api.world.sendWorldInput);

  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId: props.worldId }) ?? null;
  const humanPlayerId = [...props.game.world.players.values()].find(
    (p) => p.human === humanTokenIdentifier,
  )?.id;

  const moveTo = useSendInput(props.engineId, 'moveTo');

  const dragStart = useRef<{ screenX: number; screenY: number } | null>(null);
  const pressedKeys = useRef(new Set<string>());
  const animationFrame = useRef<number>();
  const lastFrameTime = useRef<number>();
  const lastKeyboardSync = useRef(0);
  const predictedLocationRef = useRef<Location | undefined>();
  const gameRef = useRef(props.game);
  const humanPlayerIdRef = useRef(humanPlayerId);
  const centeredPlayerIdRef = useRef<string | undefined>();
  const cameraFrameRef = useRef<number>();

  const [lastDestination, setLastDestination] = useState<{
    x: number;
    y: number;
    t: number;
  } | null>(null);
  const [discoveredClues, setDiscoveredClues] = useState<Set<string>>(
    () => new Set(getDiscoveredClueIds()),
  );
  const [npcLeads, setNpcLeads] = useState<Set<string>>(() => new Set(getNpcLeads()));
  const [predictedLocation, setPredictedLocation] = useState<Location | undefined>();

  useEffect(() => {
    gameRef.current = props.game;
    humanPlayerIdRef.current = humanPlayerId;
  }, [humanPlayerId, props.game]);

  const syncKeyboardLocation = useCallback(
    (location: Location) => {
      const playerId = humanPlayerIdRef.current;
      if (!playerId) return;
      const destination = roundedDestination(location, gameRef.current);
      void sendWorldInput({
        engineId: props.engineId,
        name: 'moveTo',
        args: { playerId, destination },
      }).catch((error) => console.error('Keyboard sync failed', error));
    },
    [props.engineId, sendWorldInput],
  );

  const updatePredictedLocation = useCallback(
    (next: Location) => {
      predictedLocationRef.current = next;
      setPredictedLocation(next);
      const now = Date.now();
      if (now - lastKeyboardSync.current > KEYBOARD_SYNC_MS) {
        lastKeyboardSync.current = now;
        syncKeyboardLocation(next);
      }
    },
    [syncKeyboardLocation],
  );

  const stopKeyboardMovement = useCallback(() => {
    if (animationFrame.current !== undefined) {
      window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }
    lastFrameTime.current = undefined;
    const current = predictedLocationRef.current;
    if (current) {
      const stopped = { ...current, speed: 0 };
      predictedLocationRef.current = stopped;
      setPredictedLocation(stopped);
      syncKeyboardLocation(stopped);
    }
  }, [syncKeyboardLocation]);

  const stepKeyboardMovement = useCallback(
    (timestamp: number) => {
      const playerId = humanPlayerIdRef.current;
      if (!playerId) return;

      const direction = directionFromKeys(pressedKeys.current);
      if (direction.x === 0 && direction.y === 0) {
        stopKeyboardMovement();
        return;
      }

      const game = gameRef.current;
      const serverPlayer = game.world.players.get(playerId);
      if (!serverPlayer) return;

      const dt = Math.min(
        0.05,
        lastFrameTime.current === undefined ? 0 : (timestamp - lastFrameTime.current) / 1000,
      );
      lastFrameTime.current = timestamp;

      const base =
        predictedLocationRef.current ?? {
          x: serverPlayer.position.x,
          y: serverPlayer.position.y,
          dx: serverPlayer.facing.dx,
          dy: serverPlayer.facing.dy,
          speed: 0,
        };

      const nextX = base.x + direction.x * LOCAL_MOVE_SPEED * dt;
      const nextY = base.y + direction.y * LOCAL_MOVE_SPEED * dt;
      let x = base.x;
      let y = base.y;

      if (!isLocalPositionBlocked(nextX, nextY, game, playerId)) {
        x = nextX;
        y = nextY;
      } else {
        if (!isLocalPositionBlocked(nextX, base.y, game, playerId)) x = nextX;
        if (!isLocalPositionBlocked(base.x, nextY, game, playerId)) y = nextY;
      }

      updatePredictedLocation({
        x,
        y,
        dx: direction.x,
        dy: direction.y,
        speed: LOCAL_MOVE_SPEED,
      });
      animationFrame.current = window.requestAnimationFrame(stepKeyboardMovement);
    },
    [stopKeyboardMovement, updatePredictedLocation],
  );

  const startKeyboardMovement = useCallback(() => {
    if (animationFrame.current !== undefined) return;
    lastFrameTime.current = undefined;
    animationFrame.current = window.requestAnimationFrame(stepKeyboardMovement);
  }, [stepKeyboardMovement]);

  const onMapPointerDown = (e: any) => {
    dragStart.current = { screenX: e.screenX, screenY: e.screenY };
  };

  const onMapPointerUp = async (e: any) => {
    if (dragStart.current) {
      const { screenX, screenY } = dragStart.current;
      dragStart.current = null;
      const [dx, dy] = [screenX - e.screenX, screenY - e.screenY];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        console.log(`Skipping navigation on drag event (${dist}px)`);
        return;
      }
    }
    if (!humanPlayerId) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    predictedLocationRef.current = undefined;
    setPredictedLocation(undefined);
    const gameSpacePx = viewport.toWorld(e.screenX, e.screenY);
    const tileDim = props.game.worldMap.tileDim;
    const gameSpaceTiles = {
      x: gameSpacePx.x / tileDim,
      y: gameSpacePx.y / tileDim,
    };
    setLastDestination({ t: Date.now(), ...gameSpaceTiles });
    const roundedTiles = {
      x: Math.floor(gameSpaceTiles.x),
      y: Math.floor(gameSpaceTiles.y),
    };
    console.log(`Moving to ${JSON.stringify(roundedTiles)}`);
    await toastOnError(moveTo({ playerId: humanPlayerId, destination: roundedTiles }));
  };

  const { width, height, tileDim } = props.game.worldMap;
  const players = [...props.game.world.players.values()];

  useEffect(() => {
    const movementKeys = new Set([
      'w',
      'a',
      's',
      'd',
      'arrowup',
      'arrowleft',
      'arrowdown',
      'arrowright',
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key) || isTextInputTarget(event.target)) return;
      event.preventDefault();
      pressedKeys.current.add(key);
      startKeyboardMovement();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key)) return;
      event.preventDefault();
      pressedKeys.current.delete(key);
      if (directionFromKeys(pressedKeys.current).x === 0 && directionFromKeys(pressedKeys.current).y === 0) {
        stopKeyboardMovement();
      }
    };

    const handleBlur = () => {
      if (pressedKeys.current.size > 0) {
        pressedKeys.current.clear();
        stopKeyboardMovement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      if (animationFrame.current !== undefined) {
        window.cancelAnimationFrame(animationFrame.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [startKeyboardMovement, stopKeyboardMovement]);

  useEffect(() => {
    const syncClues = () => setDiscoveredClues(new Set(getDiscoveredClueIds()));
    window.addEventListener(CLUE_UPDATE_EVENT, syncClues);
    window.addEventListener('storage', syncClues);
    return () => {
      window.removeEventListener(CLUE_UPDATE_EVENT, syncClues);
      window.removeEventListener('storage', syncClues);
    };
  }, []);

  useEffect(() => {
    const syncLeads = () => setNpcLeads(new Set(getNpcLeads()));
    window.addEventListener(NPC_LEAD_UPDATE_EVENT, syncLeads);
    window.addEventListener('storage', syncLeads);
    return () => {
      window.removeEventListener(NPC_LEAD_UPDATE_EVENT, syncLeads);
      window.removeEventListener('storage', syncLeads);
    };
  }, []);

  useEffect(() => {
    if (!viewportRef.current) return;
    if (humanPlayerId === undefined) {
      centeredPlayerIdRef.current = undefined;
      if (cameraFrameRef.current !== undefined) {
        window.cancelAnimationFrame(cameraFrameRef.current);
        cameraFrameRef.current = undefined;
      }
      return;
    }

    const followPlayer = () => {
      const viewport = viewportRef.current;
      const playerId = humanPlayerIdRef.current;
      if (!viewport || !playerId) return;

      const humanPlayer = gameRef.current.world.players.get(playerId);
      const location = predictedLocationRef.current ?? humanPlayer?.position;
      if (location) {
        viewport.moveCenter(location.x * tileDim, location.y * tileDim);
      }
      cameraFrameRef.current = window.requestAnimationFrame(followPlayer);
    };

    if (centeredPlayerIdRef.current !== humanPlayerId) {
      const humanPlayer = props.game.world.players.get(humanPlayerId);
      if (humanPlayer) {
        centeredPlayerIdRef.current = humanPlayerId;
        viewportRef.current.animate({
          position: new PIXI.Point(humanPlayer.position.x * tileDim, humanPlayer.position.y * tileDim),
          time: 350,
        });
      }
    }

    if (cameraFrameRef.current === undefined) {
      cameraFrameRef.current = window.requestAnimationFrame(followPlayer);
    }
    return () => {
      if (cameraFrameRef.current !== undefined) {
        window.cancelAnimationFrame(cameraFrameRef.current);
        cameraFrameRef.current = undefined;
      }
    };
  }, [humanPlayerId, props.game.world.players, tileDim]);

  const handleClueClick = (clue: ClueObject) => {
    const playerId = humanPlayerIdRef.current;
    if (!playerId) {
      toast.info('先点击“加入调查”，再靠近线索进行收集。');
      return;
    }
    const humanPlayer = gameRef.current.world.players.get(playerId);
    if (!humanPlayer) {
      toast.info('调查员尚未进入现场。');
      return;
    }
    const playerLocation = predictedLocationRef.current ?? humanPlayer.position;
    const clueLocation = { x: clue.tileX + 0.5, y: clue.tileY + 0.5 };
    const dx = playerLocation.x - clueLocation.x;
    const dy = playerLocation.y - clueLocation.y;
    if (Math.sqrt(dx * dx + dy * dy) > CLUE_PICKUP_DISTANCE) {
      toast.info('离线索太远了，靠近发光物件后再收集。');
      return;
    }
    if (clue.decoyText) {
      toast.info(clue.decoyText);
      return;
    }
    if (!clue.clueId) {
      return;
    }
    discoverClue(clue.clueId);
    setDiscoveredClues(new Set(getDiscoveredClueIds()));
  };

  return (
    <PixiViewport
      app={pixiApp}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={width * tileDim}
      worldHeight={height * tileDim}
      viewportRef={viewportRef}
    >
      <PixiStaticMap
        map={props.game.worldMap}
        onpointerup={onMapPointerUp}
        onpointerdown={onMapPointerDown}
      />
      {CLUE_OBJECTS.filter((clue) => {
        if (clue.requiredNpc && !npcLeads.has(clue.requiredNpc)) return false;
        if (clue.requiredClues?.some((clueId) => !discoveredClues.has(clueId))) return false;
        return true;
      }).map((clue) => (
        <MapClueObject
          key={clue.id}
          clue={clue}
          tileDim={tileDim}
          discovered={clue.clueId ? discoveredClues.has(clue.clueId) : false}
          onDiscover={handleClueClick}
        />
      ))}
      {players.map(
        (p) =>
          SHOW_DEBUG_UI && (
            <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
          ),
      )}
      {SHOW_DEBUG_UI && lastDestination && (
        <PositionIndicator destination={lastDestination} tileDim={tileDim} />
      )}
      {players.map((p) => (
        <Player
          key={`player-${p.id}`}
          game={props.game}
          player={p}
          isViewer={p.id === humanPlayerId}
          onClick={props.setSelectedElement}
          historicalTime={props.historicalTime}
          locationOverride={p.id === humanPlayerId ? predictedLocation : undefined}
        />
      ))}
    </PixiViewport>
  );
};

function MapClueObject({
  clue,
  tileDim,
  discovered,
  onDiscover,
}: {
  clue: ClueObject;
  tileDim: number;
  discovered: boolean;
  onDiscover: (clue: ClueObject) => void;
}) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.alpha = 1;
      drawClueGlow(g, discovered);
      if (discovered) {
        g.alpha = 0.55;
      }
      switch (clue.kind) {
        case 'glass':
          drawGlass(g);
          break;
        case 'footprints':
          drawFootprints(g);
          break;
        case 'drive':
          drawDrive(g);
          break;
        case 'map':
          drawMap(g);
          break;
        case 'lock':
          drawLock(g);
          break;
      }
    },
    [clue.kind, discovered],
  );

  return (
    <Container
      x={clue.tileX * tileDim + tileDim / 2}
      y={clue.tileY * tileDim + tileDim / 2}
      interactive={!discovered}
      cursor={discovered ? 'default' : 'pointer'}
      pointerdown={(e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        if (!discovered) {
          onDiscover(clue);
        }
      }}
    >
      <Graphics draw={draw} />
    </Container>
  );
}

function drawClueGlow(g: PIXI.Graphics, discovered: boolean) {
  if (discovered) {
    g.lineStyle(2, 0x4b5563, 0.8);
    g.beginFill(0x1f2937, 0.35);
    g.drawRect(-11, -11, 22, 22);
    g.endFill();
    return;
  }
  g.lineStyle(2, 0xf2c94c, 0.95);
  g.beginFill(0x1f1303, 0.28);
  g.drawRect(-12, -12, 24, 24);
  g.endFill();
  g.lineStyle(1, 0xfff1a8, 0.8);
  g.drawRect(-8, -8, 16, 16);
}

function drawGlass(g: PIXI.Graphics) {
  g.lineStyle(1.5, 0xbef7ff, 0.95);
  g.beginFill(0xd8fbff, 0.82);
  g.drawPolygon([-11, 6, -4, -10, 1, 1]);
  g.drawPolygon([2, -8, 12, -3, 5, 7]);
  g.drawPolygon([-2, 4, 8, 10, -8, 12]);
  g.endFill();
  g.lineStyle(1, 0xffffff, 0.75);
  g.moveTo(-8, 5);
  g.lineTo(8, -6);
  g.moveTo(-4, 10);
  g.lineTo(12, 2);
}

function drawFootprints(g: PIXI.Graphics) {
  g.beginFill(0x2d2118, 0.92);
  g.drawEllipse(-6, -4, 4, 8);
  g.drawEllipse(6, 6, 4, 8);
  g.endFill();
  g.beginFill(0x57402b, 0.9);
  g.drawCircle(-8, -12, 2);
  g.drawCircle(-5, -14, 2);
  g.drawCircle(-2, -12, 2);
  g.drawCircle(4, -2, 2);
  g.drawCircle(7, -4, 2);
  g.drawCircle(10, -2, 2);
  g.endFill();
}

function drawDrive(g: PIXI.Graphics) {
  g.lineStyle(2, 0x1f2937, 1);
  g.beginFill(0x5b6472, 1);
  g.drawRoundedRect(-12, -9, 24, 18, 3);
  g.endFill();
  g.beginFill(0x9ca3af, 1);
  g.drawRoundedRect(-8, -5, 16, 7, 2);
  g.endFill();
  g.beginFill(0x22c55e, 1);
  g.drawCircle(7, 6, 2);
  g.endFill();
}

function drawMap(g: PIXI.Graphics) {
  g.lineStyle(1.5, 0x7c4a21, 1);
  g.beginFill(0xf0d49a, 1);
  g.drawRoundedRect(-13, -10, 26, 20, 3);
  g.endFill();
  g.lineStyle(1, 0xb7793a, 0.9);
  g.moveTo(-5, -10);
  g.lineTo(-3, 10);
  g.moveTo(5, -10);
  g.lineTo(3, 10);
  g.moveTo(-10, -2);
  g.bezierCurveTo(-3, -7, 3, 5, 10, -2);
  g.lineStyle(2, 0xb91c1c, 1);
  g.moveTo(4, 2);
  g.lineTo(10, 8);
  g.moveTo(10, 2);
  g.lineTo(4, 8);
}

function drawLock(g: PIXI.Graphics) {
  g.lineStyle(3, 0xd4a83f, 1);
  g.arc(0, -4, 8, Math.PI, 0);
  g.lineStyle(1.5, 0x5b3a13, 1);
  g.beginFill(0xd9a441, 1);
  g.drawRoundedRect(-12, -2, 24, 18, 3);
  g.endFill();
  g.beginFill(0x5b3a13, 1);
  g.drawCircle(0, 6, 3);
  g.drawRect(-1, 7, 2, 5);
  g.endFill();
}

export default PixiGame;
