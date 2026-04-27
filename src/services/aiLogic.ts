import type {  BallAction, BallOutcome, PitchType, Weather, MatchFormat, DismissalType, ShotType, BowlType  } from '../types/cricket';

const outcomes = [0, 1, 2, 3, 4, 6];

/**
 * Returns the max wickets allowed before "all out" based on overs.
 * 1-3 overs → 3 wickets
 * 4-5 overs → 4 wickets
 * 6-10 overs → 5 wickets
 * 11-15 overs → 7 wickets
 * 16+ overs → 10 wickets
 */
export const getMaxWickets = (overs: number): number => {
  if (overs <= 3) return 3;
  if (overs <= 5) return 4;
  if (overs <= 10) return 5;
  if (overs <= 15) return 7;
  return 10;
};

export const calculateBallOutcome = (
  batAction: BallAction,
  bowlAction: BallAction,
  pitch: PitchType,
  weather: Weather,
  format: MatchFormat,
  matchContext: {
    overs: number;
    balls: number;
    score: number;
    wickets: number;
    target?: number;
  }
): BallOutcome => {
  const { shotType = 'Defensive', power = 50 } = batAction;
  const { bowlType = 'Pace', line = 'Off Stump', length = 'Good Length' } = bowlAction;

  let baseRisk = 35; // Base probability of getting out (out of 1000) — increased from 10
  let baseRunPotential = 0; // 0 to 100 for hitting boundaries

  // 1. Weather & Pitch effects
  if (weather === 'Overcast' && bowlType === 'Swing') {
    baseRisk += 45; // Swing is deadly in overcast
  }
  if (weather === 'Overcast' && bowlType === 'Pace') {
    baseRisk += 20; // Some extra seam in overcast
  }
  if (weather === 'Humid') {
    baseRisk += 15; // Reverse swing territory
  }
  if (pitch === 'Dusty' && bowlType === 'Spin') {
    baseRisk += 50; // Spinners dominate on dust
  }
  if (pitch === 'Green' && bowlType === 'Pace') {
    baseRisk += 40; // Pacers get serious movement
  }
  if (pitch === 'Green' && bowlType === 'Swing') {
    baseRisk += 30; // Extra movement on green tracks
  }
  if (pitch === 'Hard') {
    baseRunPotential += 20; // Easy to score
    baseRisk -= 5;
  }
  if (pitch === 'Dead') {
    baseRunPotential += 15;
    baseRisk -= 15; // Easy to score, less risk
  }

  // 2. Matchup: Delivery vs Shot — EXPANDED
  // === DANGEROUS MATCHUPS (high wicket chance) ===
  if (length === 'Yorker' && (shotType === 'Slog' || shotType === 'Loft')) {
    baseRisk += 180; // Slogging a yorker = very likely out
    baseRunPotential -= 40;
  }
  if (length === 'Yorker' && shotType === 'Pull') {
    baseRisk += 120; // Can't pull a yorker
    baseRunPotential -= 30;
  }
  if (length === 'Bouncer' && shotType === 'Drive') {
    baseRisk += 100; // Driving a bouncer = top edge
    baseRunPotential -= 20;
  }
  if (length === 'Bouncer' && shotType === 'Sweep') {
    baseRisk += 90; // Sweeping a bouncer makes no sense
    baseRunPotential -= 30;
  }
  if (length === 'Short' && shotType === 'Drive') {
    baseRisk += 60; // Driving a short ball = risky
  }

  // === REWARDING MATCHUPS (good runs, some risk) ===
  if (length === 'Bouncer' && shotType === 'Pull') {
    baseRunPotential += 50;
    baseRisk += 40; // High risk high reward
  }
  if (length === 'Full' && (shotType === 'Drive' || shotType === 'Loft')) {
    baseRunPotential += 55;
    baseRisk += 15; // Slight risk on the loft
  }
  if (length === 'Full' && shotType === 'Sweep') {
    baseRunPotential += 35;
  }
  if (length === 'Short' && shotType === 'Cut') {
    baseRunPotential += 45;
    baseRisk += 10;
  }
  if (length === 'Short' && shotType === 'Pull') {
    baseRunPotential += 40;
    baseRisk += 15;
  }

  // === SAFE MATCHUPS (low risk, low reward) ===
  if (shotType === 'Defensive' && length === 'Good Length') {
    baseRisk -= 40; // Very safe
    baseRunPotential -= 60; // Hard to score
  }
  if (shotType === 'Defensive' && length === 'Full') {
    baseRisk -= 30;
    baseRunPotential -= 40;
  }
  if (shotType === 'Defensive') {
    baseRisk -= 15; // Defensive is always safer
    baseRunPotential -= 20;
  }

  // === LINE-BASED MODIFIERS ===
  if (line === 'Wide') {
    baseRisk -= 25; // Hard to get out to a wide delivery
    baseRunPotential += 10; // Free scoring
  }
  if (line === 'Leg' && (shotType === 'Cut' || shotType === 'Drive')) {
    baseRisk += 30; // Playing across the line
  }
  if (line === 'Outside Off' && shotType === 'Sweep') {
    baseRisk += 25; // Sweeping outside off is risky
  }
  if (line === 'Middle' && shotType === 'Cut') {
    baseRisk += 20; // Can't cut a straight ball well
  }

  // 3. Power Slider Effect — MORE IMPACTFUL
  if (power > 85) {
    baseRunPotential += 40;
    baseRisk += 60; // Full power = high chance of mishit
  } else if (power > 70) {
    baseRunPotential += 25;
    baseRisk += 35; // Hard swing = edges and misses
  } else if (power < 20) {
    baseRunPotential -= 40;
    baseRisk -= 25; // Very soft hands = very safe but no runs
  } else if (power < 40) {
    baseRunPotential -= 15;
    baseRisk -= 15; // Soft hands
  } else if (power >= 40 && power <= 60) {
    baseRunPotential += 10; // Controlled shot
    baseRisk -= 5;
  }

  // 4. Pressure situations — increase risk
  if (matchContext.wickets >= 4) {
    baseRisk += 10; // Lower order, more nervous
  }
  if (matchContext.wickets >= 7) {
    baseRisk += 20; // Tail-ender pressure
  }
  if (matchContext.target && matchContext.target - matchContext.score <= 15) {
    baseRisk += 15; // Pressure of a close chase
    baseRunPotential += 10; // But also more aggressive
  }

  // Final Risk & Runs calculation
  // Bound the risk and run potential
  baseRisk = Math.max(5, Math.min(baseRisk, 500)); // Min 0.5%, max 50% chance of wicket
  baseRunPotential = Math.max(0, Math.min(baseRunPotential, 100));

  const randomRoll = Math.random() * 1000;
  const isWicket = randomRoll < baseRisk;

  let runs = 0;
  let dismissalType: DismissalType = null;
  let special: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | null = null;
  let commentary = '';

  if (isWicket) {
    const wRoll = Math.random();
    // Dismissal type depends on delivery and shot
    if (length === 'Yorker') {
      dismissalType = wRoll > 0.5 ? 'Bowled' : 'LBW';
    } else if (length === 'Bouncer') {
      dismissalType = wRoll > 0.3 ? 'Caught' : 'Hit Wicket';
    } else if (line === 'Middle' && length === 'Good Length') {
      dismissalType = wRoll > 0.6 ? 'LBW' : wRoll > 0.3 ? 'Bowled' : 'Caught';
    } else if (shotType === 'Sweep' || shotType === 'Slog') {
      dismissalType = wRoll > 0.5 ? 'Caught' : wRoll > 0.2 ? 'Stumped' : 'Bowled';
    } else {
      dismissalType = wRoll > 0.5 ? 'Caught' : wRoll > 0.3 ? 'Bowled' : wRoll > 0.15 ? 'LBW' : 'Run Out';
    }

    special = 'WICKET';
    commentary = getWicketCommentary(dismissalType, bowlType, shotType);
  } else {
    // Determine runs based on run potential
    const runRoll = Math.random() * 100;
    if (runRoll < baseRunPotential * 0.3 && power > 65) {
      runs = 6;
      special = 'SIX';
      commentary = getSixCommentary(shotType);
    } else if (runRoll < baseRunPotential * 0.6) {
      runs = 4;
      special = 'FOUR';
      commentary = getFourCommentary(shotType);
    } else if (runRoll < baseRunPotential * 0.8) {
      runs = Math.random() > 0.6 ? 2 : 3;
      commentary = `Good running! ${runs} taken off a ${shotType.toLowerCase()}.`;
    } else if (runRoll < baseRunPotential || shotType !== 'Defensive') {
      runs = Math.random() > 0.4 ? 1 : 2;
      commentary = `Worked away for ${runs}.`;
    } else {
      runs = 0;
      special = 'DOT';
      commentary = getDotCommentary(bowlType, length);
    }
  }

  return {
    runs,
    wicket: isWicket,
    dismissalType,
    commentary,
    special,
    timestamp: Date.now()
  };
};

function getWicketCommentary(dismissal: DismissalType, bowl: BowlType, shot: ShotType): string {
  switch (dismissal) {
    case 'Bowled': return `Clean bowled! The ${bowl.toLowerCase()} delivery crashes into the stumps!`;
    case 'LBW': return `Plumb in front! LBW given. Trapped by the ${bowl.toLowerCase()} bowler.`;
    case 'Caught': return `Edged and taken! The ${shot.toLowerCase()} goes wrong. Gone!`;
    case 'Run Out': return `Direct hit! They are miles short of the crease.`;
    case 'Stumped': return `Dragged out of the crease and stumped! Too clever from the bowler.`;
    case 'Hit Wicket': return `Hit wicket! Lost balance attempting the ${shot.toLowerCase()}.`;
    default: return `He's gone! What a moment!`;
  }
}

function getSixCommentary(shot: ShotType): string {
  const options = [
    `Massive SIX! Incredible ${shot.toLowerCase()} into the stands!`,
    `That's HUGE! A towering six off a ${shot.toLowerCase()}!`,
    `Into the crowd! What a shot! Maximum runs!`,
    `SIX! The ${shot.toLowerCase()} sends it sailing over the boundary!`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function getFourCommentary(shot: ShotType): string {
  const options = [
    `Beautiful ${shot.toLowerCase()} for FOUR! Racing to the boundary.`,
    `FOUR runs! Perfectly timed ${shot.toLowerCase()}.`,
    `That's a boundary! Elegant ${shot.toLowerCase()} through the gap.`,
    `Pierces the field! FOUR from a crisp ${shot.toLowerCase()}.`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function getDotCommentary(bowl: BowlType, length: string): string {
  const options = [
    `Solidly defended. Dot ball.`,
    `Good ${bowl.toLowerCase()} delivery, no run. Tight bowling.`,
    `Beaten! The ${length.toLowerCase()} ball was too good. Dot.`,
    `Left alone wisely. No run scored.`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}
