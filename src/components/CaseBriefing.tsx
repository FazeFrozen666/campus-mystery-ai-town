import { useState, useEffect } from 'react';

const STORAGE_KEY = 'campus-mystery-discovered-clues';
const CLUE_UPDATE_EVENT = 'campus-mystery-clues-updated';
const TOTAL_CLUES = 5;

function getDiscoveredCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const ids: string[] = JSON.parse(raw);
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

export default function CaseBriefing() {
  const [discoveredCount, setDiscoveredCount] = useState(getDiscoveredCount);

  useEffect(() => {
    const handleClueUpdate = () => setDiscoveredCount(getDiscoveredCount());
    window.addEventListener('storage', handleClueUpdate);
    window.addEventListener(CLUE_UPDATE_EVENT, handleClueUpdate);
    return () => {
      window.removeEventListener('storage', handleClueUpdate);
      window.removeEventListener(CLUE_UPDATE_EVENT, handleClueUpdate);
    };
  }, []);

  const pct = Math.round((discoveredCount / TOTAL_CLUES) * 100);

  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-system text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        案件简报
      </h2>

      <div className="bg-brown-800/60 p-3 space-y-3">
        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            第一幕：消失的人
          </h3>
          <p className="font-system text-sm text-brown-100 leading-relaxed">
            三天前，青云大学物理系研究生
            <strong className="text-yellow-200">陈远舟</strong>
            在后山露营调查时失踪。最后的现场就在这张后山地图里：营地、溪流、瀑布和林间旧路都留下了可查的痕迹。
          </p>
        </div>

        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            地点说明
          </h3>
          <p className="font-system text-xs sm:text-sm text-brown-200 leading-relaxed">
            本Demo不再使用单独的室内平面图。所有可发现线索都放回原地图：先和关键人物对话获得方向，
            再靠近发光物件点击收集。不是所有发光物都是真线索。
          </p>
        </div>

        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            调查目标
          </h3>
          <ul className="font-system text-xs sm:text-sm text-brown-200 space-y-1">
            <li className="flex items-start gap-1.5">
              <span className="text-brown-400 shrink-0">1.</span>
              <span>
                走访后山区域的 <strong className="text-brown-100">5位关键人物</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brown-400 shrink-0">2.</span>
              <span>
                通过对话和地图探索 <strong className="text-brown-100">收集线索</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brown-400 shrink-0">3.</span>
              <span>指认最接近真相的人，触发阶段性结局并解锁后续伏笔</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            操作
          </h3>
          <p className="font-system text-xs text-brown-300 leading-relaxed">
            按住WASD或方向键自由行走；加入调查后先问人，再靠近地图上的发光物件点击收集证据。
          </p>
        </div>

        <div className="pt-1 border-t border-brown-700/50">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider">
              调查进度
            </h3>
            <span className="font-system text-xs text-brown-300">
              已发现 {discoveredCount}/{TOTAL_CLUES} 条线索
            </span>
          </div>
          <div className="w-full h-2 bg-brown-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
