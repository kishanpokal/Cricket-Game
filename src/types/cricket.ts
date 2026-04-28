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
    /** Batting strike rate: (runs / ballsFaced) * 100 */
    strikeRate?: number;
    /** Bowling economy rate: runs conceded per over */
    economyRate?: number;
    /** Total balls faced as batter */
    totalBalls?: number;
    /** Total balls bowled */
    totalBallsBowled?: number;
    /** Current consecutive win streak */
    winStreak?: number;
    /** Longest ever win streak */
    longestWinStreak?: number;
    /** ELO rating for matchmaking */
    elo?: number;
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

export type DismissalType =
  | 'Bowled'
  | 'Caught'
  | 'Caught Behind'
  | 'LBW'
  | 'Run Out'
  | 'Stumped'
  | 'Hit Wicket'
  | null;

export type BallOutcome = {
  runs: number; // 0-6
  wicket: boolean;
  dismissalType: DismissalType;
  commentary: string;
  special: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'WIDE' | null;
  timestamp: number;
  isNoBall?: boolean;
  isWide?: boolean;
  isFreeHit?: boolean;
  animationSequence?: import('./animationEngine').AnimationOutput;
};

/** Partnership tracking for innings */
export type Partnership = {
  runs: number;
  balls: number;
};

export type InningsState = {
  battingTeam: string;
  score: number;
  wickets: number;
  overs: number;
  balls: number;
  ballLog: Array<BallOutcome & BallAction>;
  currentBall: BallAction;
  isFreeHitNextBall?: boolean;
  /** Run rate at end of each completed over */
  runRateByOver?: number[];
  /** Boundary count tracking */
  boundaryCount?: { fours: number; sixes: number };
  /** Current consecutive dot balls */
  dotBallStreak?: number;
  /** Consecutive boundary count for momentum */
  boundaryStreak?: number;
  /** Partnership history */
  partnerships?: Partnership[];
  /** Economy rate per bowler session (overs) */
  economyByOver?: number[];
};

export type PitchType = 'Green' | 'Dusty' | 'Dead' | 'Hard';
export type Weather = 'Sunny' | 'Overcast' | 'Rainy' | 'Humid';

export type MatchStatus =
  | 'waiting'
  | 'toss'
  | 'coin_flip'
  | 'batting'
  | 'innings_break'
  | 'super_over_break'
  | 'finished';

/** Audit log entry for every action taken */
export type ActionLogEntry = {
  uid: string;
  action: BallAction;
  timestamp: number;
};

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
  mainInnings1?: InningsState;
  mainInnings2?: InningsState;
  isSuperOver?: boolean;
  currentTurn?: string;
  lastUpdated: number;
  abandonedBy?: string;
  winner?: string;
  /** List of spectator UIDs (future feature) */
  spectators?: string[];
  /** Unix timestamp when batting phase began */
  matchStartTime?: number;
  /** Cumulative balls across both innings for analytics */
  totalBalls?: number;
  /** Full audit log of every action */
  actionLog?: ActionLogEntry[];
};
