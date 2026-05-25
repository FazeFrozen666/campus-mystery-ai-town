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

export default function ClueNotebook() {
  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-display text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        线索笔记本
      </h2>

      <div className="bg-brown-800/60 p-1.5 flex flex-col gap-1">
        {CLUES.map((clue, idx) => (
          <div
            key={clue.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded border border-brown-700/50 bg-brown-700/30"
          >
            <span className="shrink-0 mt-0.5 w-4 h-4 border-2 border-brown-500 bg-brown-800 rounded-sm" />
            <div className="min-w-0 flex-1">
              <p className="font-body text-xs sm:text-sm text-brown-100 leading-relaxed">
                <span className="mr-1.5">{clue.icon}</span>
                {clue.text}
              </p>
              <p className="font-body text-[10px] text-brown-400 mt-0.5">来源：{clue.source}</p>
            </div>
            <span className="shrink-0 font-display text-[10px] text-brown-500 bg-brown-800 px-1.5 py-0.5 rounded-sm border border-brown-700/50">
              #{idx + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-brown-700/80 p-1.5 text-center">
        <p className="font-body text-[10px] text-brown-400">
          与 NPC 深入对话以发现更多线索
        </p>
      </div>
    </div>
  );
}
