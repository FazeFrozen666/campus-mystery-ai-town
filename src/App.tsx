import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
import a16zImg from '../assets/a16z.png';
import convexImg from '../assets/convex.svg';
import helpImg from '../assets/help.svg';
import { useEffect, useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import MusicButton from './components/buttons/MusicButton.tsx';
import Button from './components/buttons/Button.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import PoweredByConvex from './components/PoweredByConvex.tsx';

const CLUE_STORAGE_KEY = 'campus-mystery-discovered-clues';
const CLUE_UPDATE_EVENT = 'campus-mystery-clues-updated';
const NPC_LEAD_STORAGE_KEY = 'campus-mystery-spoken-npcs';
const NPC_LEAD_UPDATE_EVENT = 'campus-mystery-npc-leads-updated';

export default function Home() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const leaveWorld = useMutation(api.world.leaveWorld);
  const clearedInitialPlayer = useRef(false);

  useEffect(() => {
    localStorage.removeItem(CLUE_STORAGE_KEY);
    localStorage.removeItem(NPC_LEAD_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CLUE_UPDATE_EVENT));
    window.dispatchEvent(new CustomEvent(NPC_LEAD_UPDATE_EVENT));
  }, []);

  useEffect(() => {
    if (!worldStatus?.worldId) {
      return;
    }
    if (clearedInitialPlayer.current) {
      return;
    }
    clearedInitialPlayer.current = true;
    void leaveWorld({ worldId: worldStatus.worldId });
  }, [leaveWorld, worldStatus?.worldId]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">
      <PoweredByConvex />

      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="帮助"
        ariaHideApp={false}
      >
        <div className="font-system">
          <h1 className="text-center text-5xl font-bold font-system game-title">游戏帮助</h1>
          <p className="mt-4">
            你是一名校园调查员，需要走访后山营地里的关键人物，收集线索，追查陈远舟失踪案。
          </p>
          <h2 className="text-3xl mt-4">操作</h2>
          <p className="mt-2">
            点击“加入调查”进入现场。使用 WASD 或方向键移动，靠近地图上的发光物件点击收集证据。
          </p>
          <p className="mt-2">
            点击角色可以查看他的证词。证词会提示你下一步该去营地、溪流、木箱、树桩或瀑布附近找什么。
          </p>
        </div>
      </ReactModal>

      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start">
        <h1 className="mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-system leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          青云谜案
        </h1>

        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl text-white leading-tight shadow-solid font-system">
          青云大学研究生陈远舟在后山营地离奇失踪。走访关键人物，收集线索，追查溪流与瀑布背后的隐藏路线。
        </div>

        <Game />

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <MusicButton />
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              帮助
            </Button>
          </div>
          <a href="https://a16z.com">
            <img className="w-8 h-8 pointer-events-auto" src={a16zImg} alt="a16z" />
          </a>
          <a href="https://convex.dev/c/ai-town">
            <img className="w-20 h-8 pointer-events-auto" src={convexImg} alt="Convex" />
          </a>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgb(0, 0, 0, 75%)',
    zIndex: 12,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '50%',
    border: '10px solid rgb(23, 20, 33)',
    borderRadius: '0',
    background: 'rgb(35, 38, 58)',
    color: 'white',
    fontFamily: 'system-ui, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif',
  },
};
