/**
 * Animation Engine Types — Defines all input/output structures for the
 * 5-second ball delivery animation sequence.
 */

import type { ShotType, BowlType, Line, Length, DismissalType, PitchType, Weather } from './cricket';

// ─── INPUT TYPES ────────────────────────────────────────────────────────────

export interface AnimationInput {
  batAction: {
    shotType: ShotType;
    power: number; // 0-100
  };
  bowlAction: {
    bowlType: BowlType;
    line: Line;
    length: Length;
  };
  outcome: {
    runs: number; // 0-6
    wicket: boolean;
    dismissalType: DismissalType;
    special: 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'WIDE' | null;
    isNoBall: boolean;
    isWide: boolean;
  };
  matchContext: {
    overs: number;
    balls: number;
    score: number;
    wickets: number;
    target: number | null;
    pitch: PitchType;
    weather: Weather;
    format: 'T20' | 'ODI' | 'custom';
    isDeathOver: boolean;
    isPowerplay: boolean;
  };
}

// ─── OUTPUT TYPES ───────────────────────────────────────────────────────────

export type BowlerRunupAnimation = 'walk' | 'jog' | 'sprint' | 'spin_approach';
export type BowlerDeliveryAnimation = 'delivery_stride' | 'jump_delivery' | 'spin_release' | 'chest_on_delivery';

export type CameraAngle =
  | 'side_on' | 'behind_bowler' | 'overhead' | 'end_on' | 'drone'
  | 'behind_batsman' | 'wide_shot' | 'wide_field' | 'boundary_cam'
  | 'stump_cam' | 'slip_cordon';

export type BallTrajectoryType = 'parabolic' | 'flat' | 'loopy' | 'skidding';
export type SwingDirection = 'none' | 'inswing' | 'outswing' | 'reverse';
export type ArcHeight = 'low' | 'medium' | 'high';
export type BouncePoint = 'full' | 'good_length' | 'short' | 'yorker';

export type BatterAnimation =
  | 'defensive_block' | 'straight_drive' | 'cover_drive' | 'cut_shot'
  | 'pull_shot' | 'sweep' | 'slog_sweep' | 'loft_over_mid_on'
  | 'missed_outside_off' | 'pad_away' | 'beaten_bowled' | 'edge_caught';

export type ContactType = 'middle_of_bat' | 'edge' | 'top_edge' | 'bottom_edge' | 'pad' | 'miss' | 'clean_hit';

export type BallDirection =
  | 'straight' | 'cover' | 'mid_wicket' | 'fine_leg' | 'third_man'
  | 'mid_on' | 'mid_off' | 'square_leg' | 'point'
  | 'over_long_on' | 'over_long_off' | 'over_mid_wicket' | 'behind_wicket';

export type SoundEffect =
  | 'clean_crack' | 'thick_edge' | 'thin_edge' | 'thud_pad'
  | 'rattle_stumps' | 'clean_miss' | 'top_edge_pop';

export type CrowdReaction = 'silent' | 'gasp' | 'murmur' | 'building_cheer' | 'roar' | 'groan' | 'wave';

export type PitchHighlight = 'none' | 'yorker_zone' | 'good_length_zone' | 'short_zone' | 'full_zone';
export type WeatherEffect = 'none' | 'overcast_shadow' | 'sun_glare' | 'drizzle';

export type ResultAnimation =
  | 'ball_to_boundary' | 'ball_over_rope' | 'fielder_stops'
  | 'stumps_shattered' | 'keeper_catches' | 'fielder_catches'
  | 'batsmen_running' | 'direct_hit_runout' | 'stumping_whip'
  | 'ball_rolls_dead' | 'wide_ball_signal' | 'no_ball_signal';

export type ReplayCameraAngle = 'side_on' | 'stump_cam' | 'hotspot' | 'snicko' | null;

export type FielderPosition =
  | 'point' | 'cover' | 'mid_off' | 'mid_on' | 'fine_leg' | 'third_man'
  | 'mid_wicket' | 'deep_mid_wicket' | 'long_on' | 'long_off' | 'gully' | 'slip'
  | 'short_leg' | 'keeper';

export type FielderAction =
  | 'none' | 'dive_stop' | 'run_chase' | 'simple_collect' | 'boundary_save'
  | 'overhead_catch' | 'low_catch' | 'relay_throw';

export type CrowdBaseLevel = 'quiet' | 'moderate' | 'loud' | 'electric';
export type BatSoundType = 'solid_middle' | 'edge_thick' | 'edge_thin' | 'miss_swish' | 'pad_thud';
export type CheerIntensity = 'none' | 'ripple' | 'swell' | 'eruption';
export type BallWhizzType = 'pace_rocket' | 'spin_flight' | 'swing_curve';

// ─── PHASE STRUCTURES ───────────────────────────────────────────────────────

export interface BowlerRunupPhase {
  id: 'bowler_runup';
  durationMs: number;
  bowlerAnimation: BowlerRunupAnimation;
  cameraAngle: CameraAngle;
  crowdVolume: number;
  ambientText: string;
  pitchHighlight: PitchHighlight;
  weatherEffect: WeatherEffect;
}

export interface BallReleasePhase {
  id: 'ball_release';
  durationMs: number;
  bowlerAnimation: BowlerDeliveryAnimation;
  ballTrajectory: {
    type: BallTrajectoryType;
    swingDirection: SwingDirection;
    seam: boolean;
    speedKmh: number;
    arcHeight: ArcHeight;
    bouncePoint: BouncePoint;
  };
  cameraAngle: CameraAngle;
  crowdVolume: number;
  ambientText: string;
}

export interface BatContactPhase {
  id: 'bat_contact';
  durationMs: number;
  batterAnimation: BatterAnimation;
  contactType: ContactType;
  ballDirection: BallDirection;
  soundEffect: SoundEffect;
  cameraAngle: CameraAngle;
  crowdVolume: number;
  crowdReaction: CrowdReaction;
  ambientText: string;
}

export interface ResultRevealPhase {
  id: 'result_reveal';
  durationMs: number;
  resultAnimation: ResultAnimation;
  cameraAngle: CameraAngle;
  crowdVolume: number;
  crowdReaction: CrowdReaction;
  replayRequired: boolean;
  replayCameraAngle: ReplayCameraAngle;
  ambientText: string;
  resultOverlayDelay: number;
}

export type AnimationPhase = BowlerRunupPhase | BallReleasePhase | BatContactPhase | ResultRevealPhase;

// ─── FULL OUTPUT ────────────────────────────────────────────────────────────

export interface AnimationOutput {
  phases: [BowlerRunupPhase, BallReleasePhase, BatContactPhase, ResultRevealPhase];
  commentary: {
    preDelivery: string;
    onContact: string;
    postResult: string;
    technicalNote: string;
  };
  fieldingAnimation: {
    primaryFielder: FielderPosition;
    fielderAction: FielderAction;
    throwToKeeper: boolean;
  };
  pitchMap: {
    landingZoneX: number;
    landingZoneY: number;
    dotTrailColor: string;
  };
  audioDirectives: {
    crowdBaseLevel: CrowdBaseLevel;
    playBatSound: boolean;
    batSoundType: BatSoundType;
    playStumpsSound: boolean;
    playCrowdCheer: boolean;
    cheerIntensity: CheerIntensity;
    playBallWhizz: boolean;
    ballWhizzType: BallWhizzType;
  };
}
