export type MatchFormat = 'T20' | 'ODI' | 'custom';

export type UserProfile = {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  stats: {
    matches: number;
    wins: number;
    losses: number;
    runs: number;
    wickets: number;
    highScore: number;
    bestBowling: string;
  };
};

export type PlayerRole = 'bat' | 'bowl';

export type PlayerContext = {
  uid: string;
  displayName: string;
  photoURL: string;
  role: PlayerRole;
};

export type TossDecision = 'bat' | 'bowl';
export type TossCall = 'heads' | 'tails';

export type TossState = {
  calledBy: string;
  call: TossCall;
  result: TossCall;
  winner: string;
  decision: TossDecision;
};

export type ShotType = 'Defensive' | 'Drive' | 'Cut' | 'Pull' | 'Sweep' | 'Slog' | 'Loft';
export type BowlType = 'Pace' | 'Spin' | 'Swing';
export type Line = 'Outside Off' | 'Off Stump' | 'Middle' | 'Leg' | 'Wide';
export type Length = 'Full' | 'Good Length' | 'Short' | 'Yorker' | 'Bouncer';

export type BallAction = {
  shotType?: ShotType;
  power?: number; // 0-100
  bowlType?: BowlType;
  line?: Line;
  length?: Length;
};

export type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | null;

export type BallOutcome = {
  runs: number; // 0-6
  wicket: boolean;
  dismissalType: DismissalType;
  commentary: string;
  special: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | null;
  timestamp: number;
};

export type InningsState = {
  battingTeam: string;
  score: number;
  wickets: number;
  overs: number;
  balls: number;
  ballLog: Array<BallOutcome & BallAction>;
  currentBall: BallAction;
};

export type PitchType = 'Green' | 'Dusty' | 'Dead' | 'Hard';
export type Weather = 'Sunny' | 'Overcast' | 'Rainy' | 'Humid';

export type MatchStatus = 'waiting' | 'toss' | 'batting' | 'innings_break' | 'finished';

export type MatchState = {
  status: MatchStatus;
  format: MatchFormat;
  customOvers: number;
  stadium: string;
  pitch: PitchType;
  weather: Weather;
  player1: PlayerContext;
  player2?: PlayerContext;
  toss?: TossState;
  innings1?: InningsState;
  innings2?: InningsState;
  currentTurn?: string;
  lastUpdated: number;
  abandonedBy?: string;   // uid of player who left/disconnected
  winner?: string;        // uid of the match winner
};
