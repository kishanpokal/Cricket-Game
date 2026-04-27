import { create } from 'zustand';
import type { UserProfile, MatchState, BallAction } from '../types/cricket';

interface GameState {
  user: UserProfile | null;
  matchState: MatchState | null;
  myAction: BallAction | null;
  opponentAction: BallAction | null;

  setUser: (user: UserProfile | null) => void;
  setMatchState: (state: MatchState | null) => void;
  setMyAction: (action: BallAction | null) => void;
  setOpponentAction: (action: BallAction | null) => void;
  resetMatch: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  matchState: null,
  myAction: null,
  opponentAction: null,

  setUser: (user) => set({ user }),
  setMatchState: (matchState) => set({ matchState }),
  setMyAction: (myAction) => set({ myAction }),
  setOpponentAction: (opponentAction) => set({ opponentAction }),
  resetMatch: () => set({
    matchState: null,
    myAction: null,
    opponentAction: null,
  }),
}));
