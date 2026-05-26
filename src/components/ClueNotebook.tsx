import { useState, useEffect } from 'react';

const STORAGE_KEY = 'campus-mystery-discovered-clues';

const CLUES: { id: string; icon: string; text: string; source: string }[] = [
  {
    id: 'c1',
    icon: '[1]',
    text: '实验楼三楼走廊有烧焦气味，地上有碎玻璃',
    source: '王保安',
  },
  {
    id: 'c2',
    icon: '[2]',
    text: '凌晨1点，一个黑影从实验室侧门跑出',
    source: '陈同学',
  },
  {
    id: 'c3',
    icon: '[3]',
    text: '张明的备份硬盘不翼而飞',
    source: '林教授',
  },
  {
    id: 'c4',
    icon: '[4]',
    text: '张明有加密文件夹，室友刘洋事发后请假回家',
    source: '周学姐',
  },
  {
    id: 'c5',
    icon: '[5]',
    text: '穿灰色连帽衫的人频繁出现在校门口',
    source: '多人目击',
  },
];

function loadDiscovered(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDiscovered(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

export default function ClueNotebook() {
  const [discovered, setDiscovered] = useState<string[]>(loadDiscovered);

  useEffect(() => {
    saveDiscovered(discovered);
  }, [discovered]);

  const handleDiscover = (clueId: string) => {
    setDiscovered((prev) => {
      if (prev.includes(clueId)) return prev;
      return [...prev, clueId];
    });
  };

  const isDiscovered = (clueId: string) => discovered.includes(clueId);

  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-display text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        线索笔记本
      </h2>

      <div className="bg-brown-800/60 p-1.5 flex flex-col gap-1">
        {CLUES.map((clue, idx) => {
          const found = isDiscovered(clue.id);
          return (
            <div
              key={clue.id}
              className={
                found
                  ? 'flex items-start gap-2 px-2 py-1.5 rounded border border-brown-700/50 bg-brown-700/30'
                  : 'flex items-start gap-2 px-2 py-1.5 rounded border border-brown-700/30 bg-brown-800/40'
              }
            >
              {found ? (
                <>
                  <span className="shrink-0 mt-0.5 w-4 h-4 border-2 border-yellow-600 bg-yellow-900/50 rounded-sm flex items-center justify-center">
                    <span className="text-[9px] text-yellow-400 leading-none">&#10003;</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs sm:text-sm text-brown-100 leading-relaxed">
                      <span className="mr-1.5">{clue.icon}</span>
                      {clue.text}
                    </p>
                    <p className="font-body text-[10px] text-brown-400 mt-0.5">
                      来源：{clue.source}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-[10px] text-brown-500 bg-brown-800 px-1.5 py-0.5 rounded-sm border border-brown-700/50">
                    #{idx + 1}
                  </span>
                </>
              ) : (
                <>
                  <span className="shrink-0 mt-0.5 w-4 h-4 border-2 border-brown-600 bg-brown-800 rounded-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-system text-xs text-brown-500 leading-relaxed">
                      线索尚未发现
                    </p>
                    <p className="font-body text-[10px] text-brown-600 mt-0.5">
                      来源：???
                    </p>
                  </div>
                  <button
                    onClick={() => handleDiscover(clue.id)}
                    className="shrink-0 font-system text-[10px] text-brown-400 hover:text-yellow-300 bg-brown-800 hover:bg-brown-700 px-1.5 py-0.5 rounded-sm border border-brown-700/50 transition-colors"
                  >
                    发现
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-brown-700/80 p-1.5 text-center">
        <p className="font-body text-[10px] text-brown-400">
          点击线索旁的「发现」按钮以解锁已获取的线索
        </p>
      </div>
    </div>
  );
}
