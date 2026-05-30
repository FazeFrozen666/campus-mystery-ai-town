import Button from './Button';
import { toast } from 'react-toastify';
import interactImg from '../../../assets/interact.svg';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ConvexError } from 'convex/values';
import { useServerGame } from '../../hooks/serverGame';

export default function InteractButton() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const humanTokenIdentifier = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const userPlayerId =
    game && [...game.world.players.values()].find((p) => p.human === humanTokenIdentifier)?.id;
  const join = useMutation(api.world.joinWorld);
  const leave = useMutation(api.world.leaveWorld);
  const isPlaying = !!userPlayerId;

  const joinOrLeaveGame = async () => {
    if (!worldId || game === undefined) {
      return;
    }
    try {
      if (isPlaying) {
        await leave({ worldId });
      } else {
        await join({ worldId });
      }
    } catch (e: any) {
      if (e instanceof ConvexError) {
        toast.error(e.data);
        return;
      }
      toast.error(e.message ?? '操作失败');
    }
  };

  return (
    <Button imgUrl={interactImg} onClick={() => void joinOrLeaveGame()}>
      {isPlaying ? '离开调查' : '加入调查'}
    </Button>
  );
}
