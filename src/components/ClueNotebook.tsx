import { useState, useEffect } from 'react';

const STORAGE_KEY = 'campus-mystery-discovered-clues';
const CLUE_UPDATE_EVENT = 'campus-mystery-clues-updated';

const CLUES: { id: string; icon: string; text: string; source: string; hint: string }[] = [
  {
    id: 'c1',
    icon: '[1]',
    text: '营地木箱旁有碎玻璃和烧焦味，像是有人匆忙处理过器材。',
    source: '王保安',
    hint: '加入调查后，去营地木箱附近找发光线索。',
  },
  {
    id: 'c2',
    icon: '[2]',
    text: '溪流边有一串湿脚印，方向从营地通向瀑布下游。',
    source: '陈同学',
    hint: '先和陈同学对话，再沿着溪流边缘搜查脚印。',
  },
  {
    id: 'c3',
    icon: '[3]',
    text: '旧木箱夹层里藏着一个损坏的录音笔，里面只剩几段断续环境音。',
    source: '林教授',
    hint: '先问王保安营地异常，再检查木箱或杂物。',
  },
  {
    id: 'c4',
    icon: '[4]',
    text: '树桩下面压着一张旧路线图，标出了从营地到瀑布背后的隐蔽小路。',
    source: '周学姐',
    hint: '先和周学姐聊路线，再检查林间树桩和旧路。',
  },
  {
    id: 'c5',
    icon: '[5]',
    text: '瀑布岩壁旁有旧锁扣和新刮痕，说明有人最近打开过隐藏通道。',
    source: '多人目击',
    hint: '先找到溪流脚印和旧路线图，再追问灰衣人。',
  },
];

function loadDiscovered(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export default function ClueNotebook() {
  const [discovered, setDiscovered] = useState<string[]>(loadDiscovered);

  useEffect(() => {
    const handleClueUpdate = () => setDiscovered(loadDiscovered());
    window.addEventListener(CLUE_UPDATE_EVENT, handleClueUpdate);
    window.addEventListener('storage', handleClueUpdate);
    return () => {
      window.removeEventListener(CLUE_UPDATE_EVENT, handleClueUpdate);
      window.removeEventListener('storage', handleClueUpdate);
    };
  }, []);

  const isDiscovered = (clueId: string) => discovered.includes(clueId);

  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-system text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
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
                    <span className="text-[9px] text-yellow-400 leading-none">✓</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-system text-xs sm:text-sm text-brown-100 leading-relaxed">
                      <span className="mr-1.5">{clue.icon}</span>
                      {clue.text}
                    </p>
                    <p className="font-system text-[10px] text-brown-400 mt-0.5">
                      来源：{clue.source}
                    </p>
                  </div>
                  <span className="shrink-0 font-system text-[10px] text-brown-500 bg-brown-800 px-1.5 py-0.5 rounded-sm border border-brown-700/50">
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
                    <p className="font-system text-[10px] text-brown-600 mt-0.5">
                      提示：{clue.hint}
                    </p>
                  </div>
                  <span className="shrink-0 font-system text-[10px] text-brown-600 bg-brown-800 px-1.5 py-0.5 rounded-sm border border-brown-700/50">
                    未知
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-brown-700/80 p-1.5 text-center">
        <p className="font-system text-[10px] text-brown-400">
          部分线索需要先和关键人物对话才会出现在地图上；有些发光物也可能只是干扰项。
        </p>
      </div>
    </div>
  );
}
