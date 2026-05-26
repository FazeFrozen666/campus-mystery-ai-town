import { useState } from 'react';

const SUSPECTS = [
  { name: '林教授', id: 'lin' },
  { name: '陈晓雨（陈同学）', id: 'chen' },
  { name: '周雨桐（周学姐）', id: 'zhou' },
  { name: '王德发（王保安）', id: 'wang' },
  { name: '灰衣人', id: 'gray' },
] as const;

type Result = 'correct' | 'wrong';

export default function AccusationPanel() {
  const [selected, setSelected] = useState<string>('');
  const [result, setResult] = useState<Result | null>(null);

  const handleSubmit = () => {
    if (!selected) return;
    setResult(selected === 'gray' ? 'correct' : 'wrong');
  };

  const handleReset = () => {
    setSelected('');
    setResult(null);
  };

  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-system text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        提交推理
      </h2>

      <div className="bg-brown-800/60 p-3 space-y-3">
        <p className="font-system text-xs text-brown-300 leading-relaxed">
          根据已掌握的线索，你认为谁最接近张明失踪案的真相？
        </p>

        {result === null ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full p-2 font-system text-sm bg-brown-900 text-brown-100 border border-brown-600 rounded focus:outline-none focus:border-yellow-500"
            >
              <option value="" disabled>
                选择嫌疑人
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
            {result === 'correct' ? (
              <div className="p-3 bg-yellow-900/40 border border-yellow-600 rounded">
                <p className="font-system text-sm text-yellow-200 leading-relaxed">
                  你发现了更大的阴谋。灰衣人不是普通嫌疑人，而是掌握关键证据的知情者。
                </p>
              </div>
            ) : (
              <div className="p-3 bg-red-900/40 border border-red-600 rounded">
                <p className="font-system text-sm text-red-200 leading-relaxed">
                  证据不足，推理还不完整。继续和 NPC 对话，补齐时间线与动机。
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
    </div>
  );
}
