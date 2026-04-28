import type {
  BallAction,
  BallOutcome,
  PitchType,
  Weather,
  MatchFormat,
  DismissalType,
  ShotType,
  BowlType,
  Line,
  Length,
} from '../types/cricket';

// ─── Constants ────────────────────────────────────────────────────────────────


/** Returns the max wickets allowed before "all out" based on overs. */
export const getMaxWickets = (overs: number): number => {
  if (overs <= 3) return 3;
  if (overs <= 5) return 4;
  if (overs <= 10) return 5;
  if (overs <= 15) return 7;
  return 10;
};

// ─── Probability Matrix ──────────────────────────────────────────────────────

/**
 * Weighted outcome table for each (ShotType × Length) combination.
 * Values: [riskModifier, runPotentialModifier]
 * Positive risk = more dangerous, positive runPotential = more scoring.
 */
const SHOT_LENGTH_MATRIX: Record<ShotType, Record<Length, [number, number]>> = {
  Defensive: {
    Full: [-30, -40],
    'Good Length': [-40, -60],
    Short: [-20, -30],
    Yorker: [-15, -50],
    Bouncer: [-10, -20],
  },
  Drive: {
    Full: [15, 55],
    'Good Length': [25, 30],
    Short: [60, -10],
    Yorker: [40, 20],
    Bouncer: [100, -20],
  },
  Cut: {
    Full: [35, 10],
    'Good Length': [20, 25],
    Short: [10, 45],
    Yorker: [50, -15],
    Bouncer: [30, 20],
  },
  Pull: {
    Full: [45, 5],
    'Good Length': [30, 20],
    Short: [15, 40],
    Yorker: [120, -30],
    Bouncer: [40, 50],
  },
  Sweep: {
    Full: [10, 35],
    'Good Length': [20, 25],
    Short: [40, 10],
    Yorker: [60, -10],
    Bouncer: [90, -30],
  },
  Slog: {
    Full: [30, 50],
    'Good Length': [50, 35],
    Short: [40, 40],
    Yorker: [180, -40],
    Bouncer: [70, 25],
  },
  Loft: {
    Full: [20, 55],
    'Good Length': [45, 40],
    Short: [35, 35],
    Yorker: [150, -35],
    Bouncer: [55, 30],
  },
};

/**
 * Line-based modifiers for (ShotType × Line).
 * Returns [riskDelta, runPotentialDelta].
 */
const getLineModifier = (shot: ShotType, line: Line): [number, number] => {
  // Playing across the line is risky
  if (line === 'Leg' && (shot === 'Cut' || shot === 'Drive')) return [30, -10];
  if (line === 'Outside Off' && shot === 'Sweep') return [25, -5];
  if (line === 'Middle' && shot === 'Cut') return [20, -5];

  // Wide line gives free scoring
  if (line === 'Wide') return [-25, 10];

  // Off stump is standard — no modifier
  if (line === 'Off Stump') return [0, 0];

  // Middle stump on defensive is safe
  if (line === 'Middle' && shot === 'Defensive') return [-10, -5];

  return [0, 0];
};

/**
 * Bowl type modifiers based on pitch and weather conditions.
 */
const getBowlTypeModifiers = (
  bowlType: BowlType,
  pitch: PitchType,
  weather: Weather,
  totalBallsBowled: number
): { riskMod: number; runPotMod: number } => {
  let riskMod = 0;
  let runPotMod = 0;

  // Pitch conditions
  if (pitch === 'Dusty' && bowlType === 'Spin') {
    riskMod += 50;
    // Pitch deterioration: after 120 balls (~20 overs), spin gets 15% more effective
    if (totalBallsBowled > 120) {
      riskMod += Math.floor(riskMod * 0.15);
    }
  }
  if (pitch === 'Green' && bowlType === 'Pace') riskMod += 40;
  if (pitch === 'Green' && bowlType === 'Swing') riskMod += 30;
  if (pitch === 'Hard') {
    runPotMod += 20;
    riskMod -= 5;
  }
  if (pitch === 'Dead') {
    runPotMod += 15;
    riskMod -= 15;
  }

  // Weather conditions
  if (weather === 'Overcast' && bowlType === 'Swing') riskMod += 45;
  if (weather === 'Overcast' && bowlType === 'Pace') riskMod += 20;
  if (weather === 'Humid') riskMod += 15;

  return { riskMod, runPotMod };
};

// ─── Match Context Calculations ──────────────────────────────────────────────

interface MatchContext {
  overs: number;
  balls: number;
  score: number;
  wickets: number;
  target?: number;
  isFreeHit?: boolean;
  /** Total balls bowled in the match (both innings combined) — for pitch deterioration */
  totalBallsBowled?: number;
  /** Total overs batting — for fatigue */
  totalOversBatted?: number;
  /** Current consecutive dot balls */
  dotBallStreak?: number;
  /** Current consecutive boundary count */
  boundaryStreak?: number;
  /** Is this a powerplay over? (first 6 in T20/ODI) */
  isPowerplay?: boolean;
  /** Is this a death over? (last 4 in T20) */
  isDeathOver?: boolean;
  /** Max overs in the format */
  maxOvers?: number;
}

/**
 * Calculate pressure factor for the chasing team.
 * When required rate exceeds 2.0 per ball, risk increases.
 */
const getPressureFactor = (ctx: MatchContext): { riskMod: number; runPotMod: number } => {
  if (!ctx.target) return { riskMod: 0, runPotMod: 0 };

  const runsNeeded = ctx.target - ctx.score;
  const maxOvers = ctx.maxOvers ?? 20;
  const ballsRemaining = (maxOvers * 6) - (ctx.overs * 6 + ctx.balls);

  if (ballsRemaining <= 0) return { riskMod: 0, runPotMod: 0 };

  const requiredPerBall = runsNeeded / ballsRemaining;

  if (requiredPerBall > 3.0) return { riskMod: 40, runPotMod: 20 };
  if (requiredPerBall > 2.0) return { riskMod: 25, runPotMod: 15 };
  if (requiredPerBall > 1.5) return { riskMod: 15, runPotMod: 10 };

  // Close chase — pressure but not desperate
  if (runsNeeded <= 15) return { riskMod: 15, runPotMod: 10 };

  return { riskMod: 0, runPotMod: 0 };
};

/**
 * Get momentum-based modifiers.
 * 3 consecutive boundaries → aggression boost
 * 2 consecutive dots → defensive mode
 */
const getMomentumModifier = (ctx: MatchContext): { riskMod: number; runPotMod: number } => {
  const bs = ctx.boundaryStreak ?? 0;
  const ds = ctx.dotBallStreak ?? 0;

  if (bs >= 3) return { riskMod: 15, runPotMod: 20 }; // On a roll — go hard
  if (ds >= 2) return { riskMod: -10, runPotMod: -10 }; // Building pressure — turtle up

  return { riskMod: 0, runPotMod: 0 };
};

/**
 * Player fatigue: after 15+ overs batting, error rate increases by 8%.
 */
const getFatigueModifier = (ctx: MatchContext): number => {
  const oversBatted = ctx.totalOversBatted ?? ctx.overs;
  if (oversBatted >= 15) return 8;
  return 0;
};

// ─── Main Ball Outcome Calculator ────────────────────────────────────────────

/**
 * Calculates the outcome of a single ball delivery based on the batter's
 * shot selection, bowler's delivery, pitch, weather, and match context.
 *
 * Uses a probability matrix approach instead of scattered if-statements
 * for more realistic and strategic outcomes.
 */
export const calculateBallOutcome = (
  batAction: BallAction,
  bowlAction: BallAction,
  pitch: PitchType,
  weather: Weather,
  _format: MatchFormat,
  matchContext: MatchContext
): BallOutcome => {
  const { shotType = 'Defensive', power = 50 } = batAction;
  const { bowlType = 'Pace', line = 'Off Stump', length = 'Good Length' } = bowlAction;

  // ─── Wide Ball Check ───────────────────────────────────────────────────────
  let isWide = false;
  const wideRoll = Math.random() * 100;
  if (line === 'Wide' && wideRoll < 3.0) {
    isWide = true;
  } else if (line === 'Outside Off' && wideRoll < 1.5) {
    isWide = true;
  }

  if (isWide) {
    const outcomeResult: BallOutcome = {
      runs: 1,
      wicket: false,
      dismissalType: null,
      commentary: getWideCommentary(bowlType),
      special: 'WIDE',
      timestamp: Date.now(),
      isWide: true,
      isNoBall: false,
      isFreeHit: false,
    };
    
    return outcomeResult;
  }

  // ─── No Ball Check ─────────────────────────────────────────────────────────
  let isNoBall = false;
  const nbRoll = Math.random() * 100;
  if (bowlType === 'Pace' && nbRoll < 1.2) {
    isNoBall = true;
  } else if (nbRoll < 0.4) {
    isNoBall = true;
  }

  // ─── Base Risk & Run Potential from Matrix ─────────────────────────────────
  const [matrixRisk, matrixRunPot] = SHOT_LENGTH_MATRIX[shotType][length];
  let baseRisk = 35 + matrixRisk;
  let baseRunPotential = matrixRunPot;

  // ─── Line Modifiers ────────────────────────────────────────────────────────
  const [lineRisk, lineRunPot] = getLineModifier(shotType, line);
  baseRisk += lineRisk;
  baseRunPotential += lineRunPot;

  // ─── Bowl Type + Pitch + Weather ───────────────────────────────────────────
  const totalBalls = matchContext.totalBallsBowled ?? (matchContext.overs * 6 + matchContext.balls);
  const { riskMod: bowlRisk, runPotMod: bowlRunPot } = getBowlTypeModifiers(bowlType, pitch, weather, totalBalls);
  baseRisk += bowlRisk;
  baseRunPotential += bowlRunPot;

  // ─── Power Slider Effect ───────────────────────────────────────────────────
  if (power > 85) {
    baseRunPotential += 40;
    baseRisk += 60;
  } else if (power > 70) {
    baseRunPotential += 25;
    baseRisk += 35;
  } else if (power < 20) {
    baseRunPotential -= 40;
    baseRisk -= 25;
  } else if (power < 40) {
    baseRunPotential -= 15;
    baseRisk -= 15;
  } else if (power >= 40 && power <= 60) {
    baseRunPotential += 10;
    baseRisk -= 5;
  }

  // ─── Wicket Pressure (lower order) ─────────────────────────────────────────
  if (matchContext.wickets >= 4) baseRisk += 10;
  if (matchContext.wickets >= 7) baseRisk += 20;

  // ─── DLS-Style Pressure Factor ─────────────────────────────────────────────
  const pressure = getPressureFactor(matchContext);
  baseRisk += pressure.riskMod;
  baseRunPotential += pressure.runPotMod;

  // ─── Momentum System ──────────────────────────────────────────────────────
  const momentum = getMomentumModifier(matchContext);
  baseRisk += momentum.riskMod;
  baseRunPotential += momentum.runPotMod;

  // ─── Fatigue ───────────────────────────────────────────────────────────────
  baseRisk += getFatigueModifier(matchContext);

  // ─── Powerplay: fielding restrictions boost boundary probability ────────────
  if (matchContext.isPowerplay) {
    baseRunPotential += Math.floor(baseRunPotential * 0.20);
  }

  // ─── Death Overs: yorkers are more effective ───────────────────────────────
  if (matchContext.isDeathOver && length === 'Yorker') {
    baseRisk += Math.floor(baseRisk * 0.25);
  }

  // ─── Free Hit: can only be run out, batter gets aggression bonus ───────────
  if (matchContext.isFreeHit) {
    baseRisk = 5; // Tiny chance for run out
    baseRunPotential += 35; // +15 aggression bonus + existing 20
  }

  // ─── Clamp Values ─────────────────────────────────────────────────────────
  baseRisk = Math.max(5, Math.min(baseRisk, 500));
  baseRunPotential = Math.max(0, Math.min(baseRunPotential, 100));

  // ─── Wicket Roll ──────────────────────────────────────────────────────────
  const randomRoll = Math.random() * 1000;
  let isWicket = randomRoll < baseRisk;

  // On Free Hit, can only be run out
  if (isWicket && matchContext.isFreeHit) {
    isWicket = Math.random() < 0.1; // 10% chance it's a run out
  }

  // ─── Determine Outcome ────────────────────────────────────────────────────
  let runs = 0;
  let dismissalType: DismissalType = null;
  let special: BallOutcome['special'] = null;
  let commentary = '';

  if (isWicket) {
    dismissalType = determineDismissalType(shotType, bowlType, line, length, matchContext.isFreeHit);
    special = 'WICKET';
    commentary = getWicketCommentary(dismissalType, bowlType, shotType);
  } else {
    const runResult = determineRuns(baseRunPotential, power, shotType, bowlType, length);
    runs = runResult.runs;
    special = runResult.special;
    commentary = runResult.commentary;
  }

  if (isNoBall) {
    const nbPrefix = pick([
      `NO BALL! Overstepping by the bowler. `,
      `NO BALL! Front foot over the line! `,
      `No ball called! Extra run awarded. `,
    ]);
    commentary = nbPrefix + commentary;
  } else if (matchContext.isFreeHit) {
    const fhPrefix = pick([
      `(Free Hit) `,
      `FREE HIT! The batter has a free swing! `,
      `Free Hit delivery — no dismissal possible! `,
    ]);
    commentary = fhPrefix + commentary;
  }

  const outcomeResult: BallOutcome = {
    runs,
    wicket: isWicket,
    dismissalType,
    commentary,
    special,
    timestamp: Date.now(),
    isNoBall: isNoBall || false,
    isWide: false,
    isFreeHit: matchContext.isFreeHit || false,
  };

  return outcomeResult;
};

// ─── Dismissal Type Logic ────────────────────────────────────────────────────

/**
 * Determines the type of dismissal based on delivery and shot context.
 * Implements LBW rules (only on Middle/Leg + Defensive/Drive) and
 * Caught Behind as separate from Caught.
 */
function determineDismissalType(
  shot: ShotType,
  _bowl: BowlType,
  line: Line,
  length: Length,
  isFreeHit?: boolean
): DismissalType {
  if (isFreeHit) return 'Run Out';

  const roll = Math.random();

  // Yorker dismissals
  if (length === 'Yorker') {
    if (roll > 0.5) return 'Bowled';
    // LBW only when line is Middle or Leg and shot is Defensive or Drive
    if ((line === 'Middle' || line === 'Leg') && (shot === 'Defensive' || shot === 'Drive')) {
      return 'LBW';
    }
    return 'Bowled';
  }

  // Bouncer dismissals
  if (length === 'Bouncer') {
    if (roll > 0.4) return 'Caught';
    if (roll > 0.15) return 'Caught Behind';
    return 'Hit Wicket';
  }

  // Good length, middle stump — classic LBW territory
  if (line === 'Middle' && length === 'Good Length') {
    if ((shot === 'Defensive' || shot === 'Drive') && roll > 0.5) return 'LBW';
    if (roll > 0.3) return 'Bowled';
    return 'Caught';
  }

  // Leg stump LBW
  if (line === 'Leg' && (shot === 'Defensive' || shot === 'Drive') && roll > 0.6) {
    return 'LBW';
  }

  // Outside off — caught behind territory
  if (line === 'Outside Off' || line === 'Off Stump') {
    if (roll > 0.5) return 'Caught Behind';
    return 'Caught';
  }

  // Sweep/Slog dismissals
  if (shot === 'Sweep' || shot === 'Slog') {
    if (roll > 0.5) return 'Caught';
    if (roll > 0.2) return 'Stumped';
    return 'Bowled';
  }

  // Default fallback
  if (roll > 0.5) return 'Caught';
  if (roll > 0.3) return 'Bowled';
  if (roll > 0.15) return 'LBW';
  return 'Run Out';
}

// ─── Run Calculation ─────────────────────────────────────────────────────────

function determineRuns(
  runPotential: number,
  power: number,
  shot: ShotType,
  _bowl: BowlType,
  _length: Length
): { runs: number; special: BallOutcome['special']; commentary: string } {
  const runRoll = Math.random() * 100;

  // Ensure a minimum baseline so we don't always get dot balls
  // when runPotential is low. Even defensive shots can nick runs.
  const effectivePot = Math.max(runPotential, 15);

  // SIX threshold: needs decent power
  const sixThreshold = effectivePot * 0.3 * (power > 65 ? 1 : 0.3);
  if (runRoll < sixThreshold && power > 40) {
    return { runs: 6, special: 'SIX', commentary: getSixCommentary(shot) };
  }

  // FOUR threshold
  const fourThreshold = sixThreshold + effectivePot * 0.35;
  if (runRoll < fourThreshold) {
    return { runs: 4, special: 'FOUR', commentary: getFourCommentary(shot) };
  }

  // 2-3 runs
  const runThreshold = fourThreshold + effectivePot * 0.25;
  if (runRoll < runThreshold) {
    const r = Math.random() > 0.6 ? 2 : 3;
    return { runs: r, special: null, commentary: pick([`Good running! ${r} taken off a ${shot.toLowerCase()}.`, `Quick between the wickets! ${r} runs collected.`, `Sharp running! ${r} taken with excellent judgement! 🏃`]) };
  }

  // 1-2 runs
  const singleThreshold = runThreshold + effectivePot * 0.20;
  if (runRoll < singleThreshold || (shot !== 'Defensive' && runRoll < 70)) {
    const r = Math.random() > 0.4 ? 1 : 2;
    return { runs: r, special: null, commentary: pick([`Worked away for ${r}.`, `${r} run taken. Smart cricket!`, `Nudged for ${r}. Good rotation of strike!`]) };
  }

  return { runs: 0, special: 'DOT', commentary: getDotCommentary(_bowl, _length) };
}

// ─── Commentary Generators ───────────────────────────────────────────────────

function getWicketCommentary(dismissal: DismissalType, bowl: BowlType, shot: ShotType): string {
  switch (dismissal) {
    case 'Bowled':
      return pick([
        `Clean bowled! The ${bowl.toLowerCase()} delivery crashes into the stumps!`,
        `BOWLED! The stumps are shattered! What a ${bowl.toLowerCase()} delivery! 🔥`,
        `Timber! The ${bowl.toLowerCase()} ball rips through the gate!`,
        `Knocked over! The bails go flying from that devastating ${bowl.toLowerCase()} ball!`,
      ]);
    case 'LBW':
      return pick([
        `Plumb in front! LBW given. Trapped by the ${bowl.toLowerCase()} bowler.`,
        `Dead plumb! The umpire raises the finger immediately. LBW!`,
        `Trapped! That ${bowl.toLowerCase()} was heading straight for middle stump. OUT!`,
      ]);
    case 'Caught':
      return pick([
        `Edged and taken! The ${shot.toLowerCase()} goes wrong. Gone!`,
        `CAUGHT! The ${shot.toLowerCase()} finds the fielder. A crucial wicket!`,
        `Up in the air and taken! The ${shot.toLowerCase()} didn't have the distance!`,
        `What a catch! The ${shot.toLowerCase()} was mistimed badly. OUT!`,
      ]);
    case 'Caught Behind':
      return pick([
        `Caught behind! A thin edge off the ${shot.toLowerCase()} and the keeper takes it cleanly!`,
        `The keeper takes a brilliant catch! Thin edge off the ${shot.toLowerCase()}!`,
        `Faintest of edges and the keeper dives to take it! Superb keeping!`,
      ]);
    case 'Run Out':
      return pick([
        `Direct hit! They are miles short of the crease.`,
        `RUN OUT! A brilliant piece of fielding! Direct hit at the stumps!`,
        `Gone! A mix-up in the running and the fielder makes no mistake!`,
      ]);
    case 'Stumped':
      return pick([
        `Dragged out of the crease and stumped! Too clever from the bowler.`,
        `Stumped! Lightning quick work from the keeper! Out of the crease!`,
        `The keeper whips off the bails! Stumped! What a dismissal!`,
      ]);
    case 'Hit Wicket':
      return pick([
        `Hit wicket! Lost balance attempting the ${shot.toLowerCase()}.`,
        `Oh no! Hit wicket! Trod on the stumps playing the ${shot.toLowerCase()}!`,
        `Unfortunate! Dislodged the bails while attempting the ${shot.toLowerCase()}!`,
      ]);
    default:
      return pick([
        `He's gone! What a moment!`,
        `OUT! What a dramatic wicket! The batter has to walk!`,
        `Gone! That's the end of a promising innings! 🏏`,
      ]);
  }
}

function getSixCommentary(shot: ShotType): string {
  return pick([
    `Massive SIX! Incredible ${shot.toLowerCase()} into the stands!`,
    `That's HUGE! A towering six off a ${shot.toLowerCase()}!`,
    `Into the crowd! What a shot! Maximum runs!`,
    `SIX! The ${shot.toLowerCase()} sends it sailing over the boundary!`,
    `Gone, gone, gone! That's disappeared into the night sky! SIX!`,
    `Out of the ground! A ${shot.toLowerCase()} of pure muscle!`,
    `MAXIMUM! 🎆 What a ${shot.toLowerCase()}! Into the top tier!`,
    `SIX! The ${shot.toLowerCase()} is absolutely colossal! Clean out of the park!`,
    `That's into orbit! A spectacular ${shot.toLowerCase()} for six! 💥`,
    `Stand and deliver! The ${shot.toLowerCase()} clears the ropes with ease! 🚀`,
  ]);
}

function getFourCommentary(shot: ShotType): string {
  return pick([
    `Beautiful ${shot.toLowerCase()} for FOUR! Racing to the boundary.`,
    `FOUR runs! Perfectly timed ${shot.toLowerCase()}.`,
    `That's a boundary! Elegant ${shot.toLowerCase()} through the gap.`,
    `Pierces the field! FOUR from a crisp ${shot.toLowerCase()}.`,
    `Textbook ${shot.toLowerCase()} — the ball rockets to the fence!`,
    `Finding the gap with precision. FOUR more!`,
    `Boundary! 🏏 Exquisite ${shot.toLowerCase()}! Pure class!`,
    `FOUR! Threaded through the gap with surgical precision!`,
    `That races away! The ${shot.toLowerCase()} beats every fielder! FOUR!`,
    `What a shot! The ${shot.toLowerCase()} finds the boundary rope! 🔥`,
  ]);
}

function getDotCommentary(bowl: BowlType, length: string): string {
  return pick([
    `Solidly defended. Dot ball.`,
    `Good ${bowl.toLowerCase()} delivery, no run. Tight bowling.`,
    `Beaten! The ${length.toLowerCase()} ball was too good. Dot.`,
    `Left alone wisely. No run scored.`,
    `Excellent line and length. The batter can't get it away.`,
    `Squeezed out but no run. Building pressure.`,
    `Dot ball! Superb ${bowl.toLowerCase()} bowling, nothing given away! 🎯`,
    `No run! Outstanding ${length.toLowerCase()} delivery. Batter had no answer!`,
    `Brilliant bowling! The pressure is mounting! 💪`,
    `Nothing doing! The ${bowl.toLowerCase()} has the batter in two minds!`,
  ]);
}

function getWideCommentary(bowl: BowlType): string {
  return pick([
    `Wide! Straying down the leg side. Free run for the batting team.`,
    `Wide ball called. The ${bowl.toLowerCase()} delivery missed the corridor entirely.`,
    `Too wide! The umpire signals a wide. Extra run.`,
    `That's gone well wide. Umpire extends both arms. WIDE.`,
    `Wide! The ${bowl.toLowerCase()} drifts too far. Free run for the batting side!`,
    `Wide ball! Well outside the batter's reach. An extra gift!`,
  ]);
}

/** Utility: pick random from array */
function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Utility Exports ─────────────────────────────────────────────────────────

/**
 * Calculate current run rate for an innings.
 */
export const calculateRunRate = (score: number, overs: number, balls: number): number => {
  const totalOvers = overs + balls / 6;
  if (totalOvers === 0) return 0;
  return Math.round((score / totalOvers) * 100) / 100;
};

/**
 * Calculate required run rate for the chasing team.
 */
export const calculateRequiredRunRate = (
  target: number,
  currentScore: number,
  maxOvers: number,
  overs: number,
  balls: number
): number => {
  const runsNeeded = target - currentScore;
  const oversRemaining = maxOvers - overs - balls / 6;
  if (oversRemaining <= 0) return Infinity;
  return Math.round((runsNeeded / oversRemaining) * 100) / 100;
};

/**
 * Check if the current over is a powerplay over (first 6 overs in T20/ODI).
 */
export const isPowerplayOver = (overs: number, format: MatchFormat): boolean => {
  if (format === 'custom') return false;
  return overs < 6;
};

/**
 * Check if the current over is a death over (last 4 overs in T20, last 10 in ODI).
 */
export const isDeathOver = (overs: number, format: MatchFormat, maxOvers: number): boolean => {
  if (format === 'T20') return overs >= maxOvers - 4;
  if (format === 'ODI') return overs >= maxOvers - 10;
  return overs >= maxOvers - 2;
};

/**
 * Generate a bowling speed indicator string.
 */
export const getBowlingSpeed = (bowlType: BowlType): string => {
  if (bowlType === 'Pace') {
    const speed = 130 + Math.floor(Math.random() * 16);
    return `${speed} km/h`;
  }
  if (bowlType === 'Spin') {
    const rpm = 85 + Math.floor(Math.random() * 11);
    return `${rpm} rpm`;
  }
  // Swing
  const speed = 120 + Math.floor(Math.random() * 16);
  return `${speed} km/h`;
};
