import { useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import closeImg from '../../assets/close.svg';
import { SelectElement } from './Player';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';

const NPC_LEAD_STORAGE_KEY = 'campus-mystery-spoken-npcs';
const NPC_LEAD_UPDATE_EVENT = 'campus-mystery-npc-leads-updated';

type Testimony = {
  title: string;
  lines: string[];
  clue: string;
  next: string;
};

function recordNpcLead(name?: string) {
  if (!name) return;
  try {
    const raw = localStorage.getItem(NPC_LEAD_STORAGE_KEY);
    const names = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(names) || names.includes(name)) return;
    localStorage.setItem(NPC_LEAD_STORAGE_KEY, JSON.stringify([...names, name]));
    window.dispatchEvent(new CustomEvent(NPC_LEAD_UPDATE_EVENT, { detail: { name } }));
  } catch {
    // Keep the clue flow working if storage is unavailable.
  }
}

function testimonyFor(name?: string): Testimony {
  if (name?.includes('林')) {
    return {
      title: '林教授的证词',
      lines: [
        '陈远舟不是临时起意去后山的。他之前一直在查一条绕开主路的旧路线，还带走过一支录音笔。',
        '我不确定他录到了什么，但他最后一次联系我时，声音很紧张，只说“瀑布那边有人”。',
      ],
      clue: '录音笔可能和旧路线有关，重点检查营地附近能藏小物件的地方。',
      next: '去木箱、树桩附近找找有没有被藏起来的记录设备。',
    };
  }
  if (name?.includes('陈')) {
    return {
      title: '陈同学的证词',
      lines: [
        '凌晨一点左右，我看见一个穿灰色连帽衣的人沿着溪流往瀑布方向跑。',
        '那个人鞋底有反光标记，所以我记得很清楚。可我当时太害怕，没有马上报警。',
      ],
      clue: '灰衣人走过溪流边，留下的新脚印不是普通游客的。',
      next: '沿着溪流和瀑布方向寻找脚印线索。',
    };
  }
  if (name?.includes('周')) {
    return {
      title: '周学姐的证词',
      lines: [
        '陈远舟失踪前向我借过旧路线图。他说后山有一条很少有人走的小路，能避开主路和监控。',
        '那张图上重点标了营地、溪流、树桩和瀑布边的岩壁。',
      ],
      clue: '旧路线图能把营地、溪流和瀑布方向串起来。',
      next: '去帐篷和旧路口附近找路线图残页。',
    };
  }
  if (name?.includes('王')) {
    return {
      title: '王保安的证词',
      lines: [
        '我巡逻时发现木箱旁边有烧焦味，还有几片碎玻璃。那地方平时没人会碰。',
        '溪流边还有一串新脚印，方向是往瀑布那边去的，不像是学生露营留下的。',
      ],
      clue: '木箱附近的碎玻璃和烧焦味说明有人销毁过东西。',
      next: '检查营地木箱和溪流边缘的发光线索。',
    };
  }
  if (name?.includes('灰')) {
    return {
      title: '灰衣人的证词',
      lines: [
        '你们都以为我是凶手，但陈远舟找我是为了把证据交出去。',
        '真正追他的人不在学校里。瀑布后面的旧路才是他最后想去的地方。',
      ],
      clue: '灰衣人不是终点，他指向瀑布后的隐藏路线。',
      next: '收集脚印和旧路线图后，再检查瀑布附近的锁扣。',
    };
  }
  return {
    title: '调查记录',
    lines: ['这个人暂时没有提供新的证词。'],
    clue: '继续走访其他关键人物。',
    next: '先从王保安、周学姐和灰衣人入手。',
  };
}

export default function PlayerDetails({
  worldId,
  game,
  playerId,
  setSelectedElement,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  playerId?: GameId<'players'>;
  setSelectedElement: SelectElement;
  scrollViewRef: React.RefObject<HTMLDivElement>;
}) {
  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId });
  const players = [...game.world.players.values()];
  const humanPlayer = players.find((p) => p.human === humanTokenIdentifier);
  const player = playerId && game.world.players.get(playerId);
  const playerDescription = playerId && game.playerDescriptions.get(playerId);
  const isMe = Boolean(humanPlayer && player && player.id === humanPlayer.id);
  const testimony = useMemo(() => testimonyFor(playerDescription?.name), [playerDescription?.name]);

  useEffect(() => {
    if (humanPlayer && !isMe && playerDescription?.name) {
      recordNpcLead(playerDescription.name);
    }
  }, [humanPlayer, isMe, playerDescription?.name]);

  if (!playerId) {
    return (
      <div className="h-full text-xl flex text-center items-center p-4 font-system">
        点击地图上的角色，可以查看资料和关键证词。
      </div>
    );
  }
  if (!player) {
    return null;
  }

  return (
    <>
      <div className="flex gap-4">
        <div className="box w-3/4 sm:w-full mr-auto">
          <h2 className="bg-brown-700 p-2 font-system text-2xl sm:text-4xl tracking-wider shadow-solid text-center">
            {playerDescription?.name}
          </h2>
        </div>
        <a
          className="button text-white shadow-solid text-2xl cursor-pointer pointer-events-auto"
          onClick={() => setSelectedElement(undefined)}
        >
          <h2 className="h-full bg-clay-700">
            <img className="w-4 h-4 sm:w-5 sm:h-5" src={closeImg} />
          </h2>
        </a>
      </div>

      <div className="desc my-6">
        <p className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm">
          {!isMe && playerDescription?.description}
          {isMe && <i>这是你自己。</i>}
        </p>
      </div>

      {!isMe && !humanPlayer && (
        <div className="box mt-6">
          <p className="bg-brown-700 p-3 text-center font-system">先点击左下角“加入调查”。</p>
        </div>
      )}

      {!isMe && humanPlayer && (
        <div className="mt-6 font-system">
          <div className="box">
            <div className="bg-brown-700 p-3">
              <h3 className="text-xl text-center">{testimony.title}</h3>
              <div className="mt-3 space-y-3">
                {testimony.lines.map((line, index) => (
                  <div key={index} className="bg-brown-200 text-black border border-brown-900 p-2">
                    <p className="leading-snug">{line}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border border-yellow-600 bg-brown-900/40 p-3">
                <div className="text-yellow-200 text-sm mb-1">记录到的线索</div>
                <p className="leading-snug">{testimony.clue}</p>
              </div>
              <div className="mt-3 border border-brown-500 bg-brown-800/50 p-3">
                <div className="text-brown-100 text-sm mb-1">下一步</div>
                <p className="leading-snug">{testimony.next}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
