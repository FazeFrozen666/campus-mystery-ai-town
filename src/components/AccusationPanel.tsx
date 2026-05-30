import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const STORAGE_KEY = 'campus-mystery-discovered-clues';
const MIN_CLUES = 3;
const TOTAL_CLUES = 5;

const SUSPECTS = [
  { name: '林教授', id: 'lin' },
  { name: '陈同学', id: 'chen' },
  { name: '周学姐', id: 'zhou' },
  { name: '王保安', id: 'wang' },
  { name: '灰衣人', id: 'gray' },
] as const;

type Result = 'correct' | 'wrong' | 'insufficient';

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

export default function AccusationPanel() {
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<Result | null>(null);
  const [showEnding, setShowEnding] = useState(false);
  const [aiEnding, setAiEnding] = useState<string | null>(null);
  const [endingLoading, setEndingLoading] = useState(false);
  const [endingError, setEndingError] = useState(false);

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const generateEnding = useAction(api.world.generateAccusationEnding);

  const handleSubmit = () => {
    if (!selected) return;
    const count = getDiscoveredCount();
    if (count < MIN_CLUES) {
      setResult('insufficient');
      return;
    }
    const isCorrect = selected === 'gray';
    setResult(isCorrect ? 'correct' : 'wrong');

    // 尝试调用 AI 结局生成
    if (worldId) {
      setShowEnding(true);
      setEndingLoading(true);
      setEndingError(false);
      setAiEnding(null);

      generateEnding({ worldId, accusedSuspectId: selected })
        .then((data) => {
          setAiEnding(data.ending);
          setEndingLoading(false);
        })
        .catch((err) => {
          console.error('AI ending generation failed:', err);
          setEndingError(true);
          setEndingLoading(false);
        });
    } else {
      // 没有 worldId，直接显示结果（兜底）
      if (isCorrect) {
        setShowEnding(true);
        setEndingError(true);
      }
    }
  };

  const handleReset = () => {
    setSelected('');
    setResult(null);
    setShowEnding(false);
    setAiEnding(null);
    setEndingLoading(false);
    setEndingError(false);
  };

  const suspectName = SUSPECTS.find((s) => s.id === selected)?.name ?? '';

  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-system text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        提交推理
      </h2>

      <div className="bg-brown-800/60 p-3 space-y-3">
        <p className="font-system text-xs text-brown-300 leading-relaxed">
          根据已掌握的线索，你认为谁最接近陈远舟失踪案背后的真相？
        </p>

        {result === null ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full p-2 font-system text-sm bg-brown-900 text-brown-100 border border-brown-600 rounded focus:outline-none focus:border-yellow-500"
            >
              <option value="" disabled>
                选择关键人物
              </option>
              {SUSPECTS.map((suspect) => (
                <option key={suspect.id} value={suspect.id}>
                  {suspect.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="w-full p-2 font-system text-sm font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-600 hover:bg-yellow-500 text-brown-900"
            >
              确认指认
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {result === 'insufficient' ? (
              <div className="p-3 bg-orange-900/40 border border-orange-600 rounded">
                <p className="font-system text-sm text-orange-200 leading-relaxed">
                  线索不足。你需要至少发现 {MIN_CLUES}/{TOTAL_CLUES} 条线索，才能提交推理。
                  继续走访角色，把时间线补完整。
                </p>
              </div>
            ) : result === 'correct' ? (
              <div className="p-3 bg-yellow-900/40 border border-yellow-600 rounded">
                <p className="font-system text-sm text-yellow-200 leading-relaxed">
                  推理提交成功。你的指控指向了灰衣人——正在生成案件结论...
                </p>
              </div>
            ) : (
              <div className="p-3 bg-red-900/40 border border-red-600 rounded">
                <p className="font-system text-sm text-red-200 leading-relaxed">
                  你的推理指向了{suspectName}。正在分析这个结论...
                </p>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full p-2 font-system text-xs text-brown-400 hover:text-brown-200 transition-colors"
            >
              重新选择
            </button>
          </div>
        )}
      </div>

      {showEnding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-brown-800 border-4 border-yellow-600 rounded-lg max-w-lg w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="bg-yellow-900/50 p-4 text-center border-b border-yellow-600">
              <h2 className="font-system text-xl font-bold text-yellow-200 tracking-wider">
                {result === 'correct' ? '案件结论' : '推理反馈'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {endingLoading ? (
                /* Loading 状态 */
                <div className="flex flex-col items-center py-8 space-y-3">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="font-system text-sm text-yellow-300">
                    正在分析案件线索，生成结论...
                  </p>
                </div>
              ) : endingError || !aiEnding ? (
                /* 失败兜底：显示静态结局 */
                <>
                  {result === 'correct' ? (
                    <>
                      <p className="font-system text-sm text-brown-100 leading-relaxed">
                        你顺着灰衣人的线索一路追查，完成了第一阶段调查：陈远舟不是凭空失踪，
                        他最后经过营地、溪流和瀑布下方的隐藏通道，像是在主动避开某些人。
                      </p>
                      <p className="font-system text-sm text-brown-200 leading-relaxed">
                        灰衣人并非凶手。他是陈远舟留下证据的接应者。录音笔、旧路线图和岩壁锁扣说明，
                        陈远舟查到的东西指向后山旧案，也牵出了一个校外团队的影子。
                      </p>
                      <p className="font-system text-sm text-brown-300 leading-relaxed">
                        后续章节预告：第二幕追查瀑布后的隐藏通道，第三幕还原旧案时间线，最终幕揭开
                        校外团队想夺走后山证据的真正目的。
                      </p>
                      <p className="font-system text-xs text-yellow-400 text-center leading-relaxed">
                        本次演示到这里形成闭环；你仍然可以回到地图继续找线索、追问角色。
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-system text-sm text-brown-100 leading-relaxed">
                        {suspectName}身上确实藏着秘密，但你的推理还差最后一块拼图。
                      </p>
                      <p className="font-system text-sm text-brown-200 leading-relaxed">
                        回顾你收集到的线索——旧路线图上标出的隐蔽小路、溪流边不属于营地人员的脚印、
                        以及那个多次出现在不同证词中的灰色身影。真相的核心不在这里，而在营地边缘。
                      </p>
                      <p className="font-system text-sm text-brown-300 leading-relaxed">
                        建议：回到地图，找到那个穿灰色连帽衫的人。他才是通往陈远舟失踪真相的钥匙。
                      </p>
                      <p className="font-system text-xs text-yellow-400 text-center leading-relaxed">
                        你可以回到地图继续调查，重新提交推理。
                      </p>
                    </>
                  )}
                </>
              ) : (
                /* AI 生成的结局 */
                <>
                  {aiEnding.split('\n').filter(Boolean).map((paragraph, i) => (
                    <p key={i} className="font-system text-sm text-brown-100 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </>
              )}
            </div>
            <div className="p-3 border-t border-brown-700 flex justify-center">
              <button
                onClick={() => setShowEnding(false)}
                className="px-6 py-2 font-system text-sm font-bold bg-yellow-600 hover:bg-yellow-500 text-brown-900 rounded transition-colors"
              >
                回到地图
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
