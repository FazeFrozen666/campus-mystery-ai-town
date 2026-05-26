export default function CaseBriefing() {
  return (
    <div className="box mb-4">
      <h2 className="bg-brown-700 p-2 font-system text-lg sm:text-xl tracking-wider shadow-solid text-center text-brown-100">
        案件简报
      </h2>

      <div className="bg-brown-800/60 p-3 space-y-3">
        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            案件
          </h3>
          <p className="font-system text-sm text-brown-100 leading-relaxed">
            三天前，青云大学物理系研究生
            <strong className="text-yellow-200">张明</strong>
            在实验楼离奇失踪。现场留下烧焦气味、碎玻璃和许多疑点。
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
                走访校园中的 <strong className="text-brown-100">5 位关键人物</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brown-400 shrink-0">2.</span>
              <span>
                通过对话 <strong className="text-brown-100">收集线索</strong>，拼出真相
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-brown-400 shrink-0">3.</span>
              <span>
                在线索笔记本中 <strong className="text-brown-100">追踪证据</strong>
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-system text-xs text-brown-400 uppercase tracking-wider mb-1">
            操作
          </h3>
          <p className="font-system text-xs text-brown-300 leading-relaxed">
            使用 WASD 或方向键移动，点击角色即可开始调查对话。
          </p>
        </div>
      </div>
    </div>
  );
}
