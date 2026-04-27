import { create } from 'zustand';
import type { UserProfile, MatchState, BallAction } from '../types/cricket';

interface GameState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  matchId: string | null;
  setMatchId: (id: string | null) => void;

  matchState: MatchState | null;
  setMatchState: (state: MatchState | null) => void;

  myAction: BallAction | null;
  setMyAction: (action: BallAction | null) => void;

  opponentAction: BallAction | null;
  setOpponentAction: (action: BallAction | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  matchId: null,
  setMatchId: (matchId) => set({ matchId }),

  matchState: null,
  setMatchState: (matchState) => set({ matchState }),

  myAction: null,
  setMyAction: (myAction) => set({ myAction }),

  opponentAction: null,
  setOpponentAction: (opponentAction) => set({ opponentAction }),
}));
