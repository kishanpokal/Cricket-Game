import type { AnimationInput, AnimationOutput, BowlerRunupAnimation, BowlerDeliveryAnimation, BallTrajectoryType, SwingDirection, ArcHeight, BouncePoint, BatterAnimation, ContactType, BallDirection, SoundEffect, CrowdReaction, PitchHighlight, WeatherEffect, ResultAnimation, FielderPosition, FielderAction, ReplayCameraAngle, CrowdBaseLevel, BatSoundType, CheerIntensity, BallWhizzType } from '../types/animationEngine';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAnimationSequence(input: AnimationInput): AnimationOutput {
  const { batAction, bowlAction, outcome, matchContext } = input;
  const { shotType } = batAction;
  const { bowlType, line, length } = bowlAction;
  const { runs, wicket, dismissalType, isNoBall, isWide } = outcome;
  const { pitch, weather, isDeathOver, isPowerplay } = matchContext;

  // 1. Bowler Runup Phase
  let bowlerRunupAnimation: BowlerRunupAnimation = 'jog';
  if (bowlType === 'Pace') bowlerRunupAnimation = pick(['sprint', 'jog']);
  else if (bowlType === 'Spin') bowlerRunupAnimation = 'spin_approach';
  else if (bowlType === 'Swing') bowlerRunupAnimation = pick(['jog', 'walk']);

  let pitchHighlight: PitchHighlight = 'none';
  if (length === 'Yorker') pitchHighlight = 'yorker_zone';
  else if (length === 'Good Length') pitchHighlight = 'good_length_zone';
  else if (length === 'Short' || length === 'Bouncer') pitchHighlight = 'short_zone';
  else if (length === 'Full') pitchHighlight = 'full_zone';

  let weatherEffect: WeatherEffect = 'none';
  if (weather === 'Overcast') weatherEffect = pick(['overcast_shadow', 'none']);
  else if (weather === 'Humid') weatherEffect = 'none';
  else if (weather === 'Rainy') weatherEffect = 'drizzle';
  else if (weather === 'Sunny') weatherEffect = pick(['sun_glare', 'none']);

  let runupText = pick(["Runs in hard...", "Approaching the crease", "Here we go..."]);
  if (bowlType === 'Spin') runupText = pick(["Tossing it up...", "Slow approach..."]);

  // 2. Ball Release Phase
  let bowlerDeliveryAnimation: BowlerDeliveryAnimation = 'delivery_stride';
  if (bowlType === 'Pace') bowlerDeliveryAnimation = pick(['delivery_stride', 'jump_delivery']);
  else if (bowlType === 'Spin') bowlerDeliveryAnimation = 'spin_release';
  else if (bowlType === 'Swing') bowlerDeliveryAnimation = 'chest_on_delivery';

  let ballTrajectoryType: BallTrajectoryType = 'parabolic';
  let swingDirection: SwingDirection = 'none';
  let arcHeight: ArcHeight = 'medium';
  let bouncePoint: BouncePoint = 'good_length';
  let speedKmh = 135;
  let seam = false;

  if (bowlType === 'Pace') {
    speedKmh = 135 + Math.floor(Math.random() * 20);
    if (weather === 'Overcast' && Math.random() > 0.3) {
      swingDirection = pick(['inswing', 'outswing']);
    }
  } else if (bowlType === 'Spin') {
    speedKmh = 85 + Math.floor(Math.random() * 15);
    if (pitch === 'Dusty') {
      ballTrajectoryType = 'loopy';
      seam = true;
      arcHeight = 'high';
    }
  } else if (bowlType === 'Swing') {
    speedKmh = 125 + Math.floor(Math.random() * 10);
    ballTrajectoryType = 'skidding';
    swingDirection = pick(['inswing', 'outswing']);
  }

  if (length === 'Yorker') {
    ballTrajectoryType = 'flat';
    bouncePoint = 'yorker';
    if (bowlType === 'Pace') speedKmh = 140 + Math.floor(Math.random() * 15);
  } else if (length === 'Bouncer' || length === 'Short') {
    ballTrajectoryType = 'parabolic';
    arcHeight = 'high';
    bouncePoint = 'short';
  } else if (length === 'Full') {
    bouncePoint = 'full';
  }

  let releaseText = "Good length delivery!";
  if (length === 'Yorker') releaseText = "Fires in a yorker!";
  else if (length === 'Bouncer') releaseText = "Digs it in short!";
  else if (bowlType === 'Spin') releaseText = "Looping up slowly...";

  // 3. Bat Contact Phase
  let batterAnimation: BatterAnimation = 'defensive_block';
  if (wicket && dismissalType === 'Bowled') batterAnimation = 'beaten_bowled';
  else if (wicket && (dismissalType === 'Caught' || dismissalType === 'Caught Behind')) {
    batterAnimation = (shotType === 'Slog' || shotType === 'Loft') ? 'loft_over_mid_on' : 'edge_caught';
  } else if (wicket && dismissalType === 'LBW') {
    batterAnimation = pick(['defensive_block', 'missed_outside_off']);
  } else if (runs === 6) {
    batterAnimation = pick(['slog_sweep', 'loft_over_mid_on']);
  } else if (runs === 4) {
    if (shotType === 'Cut') batterAnimation = 'cut_shot';
    else if (shotType === 'Drive') batterAnimation = pick(['cover_drive', 'straight_drive']);
    else if (shotType === 'Pull') batterAnimation = 'pull_shot';
    else batterAnimation = pick(['cover_drive', 'sweep', 'straight_drive']);
  } else if (runs === 0 && !wicket) {
    batterAnimation = pick(['defensive_block', 'missed_outside_off']);
  } else {
     // Default singles/doubles
     if (shotType === 'Cut') batterAnimation = 'cut_shot';
     else if (shotType === 'Drive') batterAnimation = 'straight_drive';
     else if (shotType === 'Pull') batterAnimation = 'pull_shot';
     else if (shotType === 'Sweep') batterAnimation = 'sweep';
     else if (shotType === 'Slog') batterAnimation = 'slog_sweep';
     else if (shotType === 'Loft') batterAnimation = 'loft_over_mid_on';
  }

  let contactType: ContactType = 'middle_of_bat';
  let soundEffect: SoundEffect = 'clean_crack';
  if (wicket && dismissalType === 'Bowled') {
    contactType = 'miss';
    soundEffect = 'rattle_stumps';
  } else if (wicket && dismissalType === 'Caught Behind') {
    contactType = 'edge';
    soundEffect = 'thin_edge';
  } else if (wicket && dismissalType === 'LBW') {
    contactType = 'pad';
    soundEffect = 'thud_pad';
  } else if (runs === 6 || runs === 4) {
    contactType = 'clean_hit';
    soundEffect = 'clean_crack';
  } else if (runs === 0 && !wicket) {
    contactType = pick(['miss', 'middle_of_bat', 'pad']);
    soundEffect = contactType === 'miss' ? 'clean_miss' : contactType === 'pad' ? 'thud_pad' : 'thick_edge';
  }

  let ballDirection: BallDirection = 'straight';
  if (shotType === 'Cut') ballDirection = 'point';
  else if (shotType === 'Drive') ballDirection = pick(['cover', 'straight', 'mid_off']);
  else if (shotType === 'Pull' || shotType === 'Slog') ballDirection = pick(['mid_wicket', 'square_leg', 'over_mid_wicket']);
  else if (shotType === 'Sweep') ballDirection = pick(['fine_leg', 'square_leg']);
  else if (shotType === 'Loft') ballDirection = pick(['over_long_on', 'over_long_off']);
  else if (shotType === 'Defensive') ballDirection = pick(['straight', 'third_man']);
  
  if (wicket && dismissalType === 'Caught Behind') ballDirection = 'behind_wicket';

  let crowdReactionContact: CrowdReaction = 'murmur';
  if (runs === 6 || runs === 4) crowdReactionContact = 'gasp';
  if (wicket) crowdReactionContact = 'gasp';

  let contactText = "Gets bat on ball...";
  if (contactType === 'clean_hit') contactText = pick(["Big swing!", "Sweet connection!"]);
  else if (contactType === 'edge') contactText = "Gets a thick edge!";
  else if (contactType === 'miss') contactText = "Beaten all ends up!";

  // 4. Result Reveal Phase
  let resultAnimation: ResultAnimation = 'fielder_stops';
  let crowdReactionResult: CrowdReaction = 'murmur';
  let cheerIntensity: CheerIntensity = 'none';

  if (wicket) {
    if (dismissalType === 'Bowled') resultAnimation = 'stumps_shattered';
    else if (dismissalType === 'Caught') resultAnimation = 'fielder_catches';
    else if (dismissalType === 'Caught Behind') resultAnimation = 'keeper_catches';
    else if (dismissalType === 'Run Out') resultAnimation = 'direct_hit_runout';
    else if (dismissalType === 'Stumped') resultAnimation = 'stumping_whip';
    
    crowdReactionResult = 'roar'; // Actually for wicket it's "wave" per rules, but rules also say "roar with crowdReaction wave", but crowdReaction is a single string. Let's use 'wave'
    crowdReactionResult = 'wave';
    cheerIntensity = isPowerplay ? 'swell' : 'eruption';
  } else if (runs === 6) {
    resultAnimation = 'ball_over_rope';
    crowdReactionResult = 'roar';
    cheerIntensity = 'eruption';
  } else if (runs === 4) {
    resultAnimation = 'ball_to_boundary';
    crowdReactionResult = pick(['building_cheer', 'roar']);
    cheerIntensity = 'swell';
  } else if (isWide) {
    resultAnimation = 'wide_ball_signal';
  } else if (isNoBall) {
    resultAnimation = 'no_ball_signal';
  } else if (runs > 0) {
    resultAnimation = 'batsmen_running';
    crowdReactionResult = 'murmur';
  } else {
    resultAnimation = 'ball_rolls_dead';
    crowdReactionResult = 'silent';
  }

  if (isDeathOver && runs === 6) cheerIntensity = 'eruption';

  let replayRequired = false;
  if (wicket || runs === 6 || contactType === 'edge') replayRequired = true;

  let replayCameraAngle: ReplayCameraAngle = null;
  if (replayRequired) {
    if (dismissalType === 'Bowled') replayCameraAngle = 'stump_cam';
    else if (contactType === 'edge') replayCameraAngle = pick(['hotspot', 'snicko']);
    else replayCameraAngle = 'side_on';
  }

  let resultText = "Fielded safely.";
  if (runs === 6) resultText = "That's gone all the way!";
  else if (runs === 4) resultText = "Races to the boundary!";
  else if (wicket && dismissalType === 'Caught') resultText = "Takes a sharp catch!";
  else if (wicket && dismissalType === 'Bowled') resultText = "Crashes into middle stump!";
  else if (wicket && dismissalType === 'LBW') resultText = "Plumb in front! Out!";

  // 5. Commentary
  let preDelivery = "Bowler marks the run-up, getting ready.";
  if (isPowerplay) preDelivery = "Powerplay restrictions are on, field is up.";
  if (isDeathOver) preDelivery = "Death overs now, crucial stage of the match.";
  
  let onContact = "Strikes it.";
  if (runs === 6) onContact = "He's picked it up early and absolutely creamed it!";
  else if (runs === 4) onContact = "Pierces the gap beautifully!";
  else if (wicket && dismissalType === 'Bowled') onContact = "Beaten! Beaten all ends up!";
  else if (wicket && dismissalType === 'Caught') onContact = "Up in the air...";

  let postResult = "Good cricket all around.";
  if (runs === 6) postResult = "That's gone miles! A phenomenal strike from the batter.";
  else if (runs === 4) postResult = "No need to run for those, timed to perfection.";
  else if (wicket) postResult = "A massive blow for the batting side. The bowler strikes at a vital time.";
  else if (runs === 0) postResult = "A precious dot ball building the pressure.";

  let technicalNote = "Standard delivery on a good length.";
  if (bowlType === 'Pace' && swingDirection !== 'none') technicalNote = `Classic ${swingDirection}, late movement causing problems.`;
  else if (bowlType === 'Spin' && pitch === 'Dusty') technicalNote = "Pitched on a length and gripped the dusty surface perfectly.";
  else if (length === 'Yorker') technicalNote = "Fired in at the toes, impossible to get under.";
  else if (length === 'Bouncer') technicalNote = "Bent the back and banged it in short. Excellent aggression.";

  // 6. Fielding Animation
  let primaryFielder: FielderPosition = 'cover';
  let fielderAction: FielderAction = 'simple_collect';
  let throwToKeeper = false;

  if (ballDirection === 'cover') primaryFielder = pick(['cover', 'point']);
  else if (ballDirection === 'over_long_on') { primaryFielder = 'long_on'; fielderAction = 'run_chase'; }
  else if (ballDirection === 'fine_leg') primaryFielder = 'fine_leg';
  else if (ballDirection === 'third_man') primaryFielder = 'third_man';
  else if (ballDirection === 'mid_wicket') primaryFielder = pick(['mid_wicket', 'deep_mid_wicket']);

  if (wicket && dismissalType === 'Caught Behind') { primaryFielder = 'keeper'; fielderAction = 'simple_collect'; }
  else if (wicket && dismissalType === 'Stumped') { primaryFielder = 'keeper'; fielderAction = 'simple_collect'; }
  else if (wicket && dismissalType === 'Caught') { fielderAction = pick(['overhead_catch', 'low_catch']); throwToKeeper = false; }
  
  if (runs === 6 || runs === 4) { fielderAction = 'none'; throwToKeeper = false; }
  else if (runs > 0 && runs < 4) throwToKeeper = true;

  // 7. Pitch Map
  let landingZoneX = 50;
  if (line === 'Leg') landingZoneX = 15;
  else if (line === 'Middle') landingZoneX = 50;
  else if (line === 'Off Stump') landingZoneX = 75;
  else if (line === 'Outside Off' || line === 'Wide') landingZoneX = 95;

  let landingZoneY = 50;
  if (length === 'Yorker' || length === 'Full') landingZoneY = 15;
  else if (length === 'Good Length') landingZoneY = 50;
  else if (length === 'Short') landingZoneY = 80;
  else if (length === 'Bouncer') landingZoneY = 95;

  let dotTrailColor = '#ef4444'; // Pace red
  if (bowlType === 'Spin') dotTrailColor = '#8b5cf6'; // Spin purple
  else if (bowlType === 'Swing') dotTrailColor = '#f97316'; // Swing orange

  // 8. Audio Directives
  let crowdBaseLevel: CrowdBaseLevel = 'moderate';
  if (isDeathOver || isPowerplay) crowdBaseLevel = 'loud';

  let playBatSound = contactType !== 'miss';
  let batSoundType: BatSoundType = 'solid_middle';
  if (contactType === 'edge') batSoundType = 'edge_thick';
  else if (contactType === 'pad') batSoundType = 'pad_thud';
  else if (contactType === 'miss') batSoundType = 'miss_swish';

  let playStumpsSound = (wicket && dismissalType === 'Bowled') || dismissalType === 'Run Out' || dismissalType === 'Hit Wicket';
  let playCrowdCheer = runs >= 4 || wicket;
  
  let playBallWhizz = true;
  let ballWhizzType: BallWhizzType = 'pace_rocket';
  if (bowlType === 'Spin') ballWhizzType = 'spin_flight';
  else if (bowlType === 'Swing') ballWhizzType = 'swing_curve';

  return {
    phases: [
      {
        id: 'bowler_runup',
        durationMs: 1000,
        bowlerAnimation: bowlerRunupAnimation,
        cameraAngle: 'side_on',
        crowdVolume: 0.4,
        ambientText: runupText,
        pitchHighlight,
        weatherEffect
      },
      {
        id: 'ball_release',
        durationMs: 800,
        bowlerAnimation: bowlerDeliveryAnimation,
        ballTrajectory: {
          type: ballTrajectoryType,
          swingDirection,
          seam,
          speedKmh,
          arcHeight,
          bouncePoint
        },
        cameraAngle: 'behind_bowler',
        crowdVolume: 0.5,
        ambientText: releaseText
      },
      {
        id: 'bat_contact',
        durationMs: 1200,
        batterAnimation,
        contactType,
        ballDirection,
        soundEffect,
        cameraAngle: 'behind_batsman',
        crowdVolume: 0.7,
        crowdReaction: crowdReactionContact,
        ambientText: contactText
      },
      {
        id: 'result_reveal',
        durationMs: 2000,
        resultAnimation,
        cameraAngle: 'wide_field',
        crowdVolume: 1.0,
        crowdReaction: crowdReactionResult,
        replayRequired,
        replayCameraAngle,
        ambientText: resultText,
        resultOverlayDelay: 500
      }
    ],
    commentary: {
      preDelivery,
      onContact,
      postResult,
      technicalNote
    },
    fieldingAnimation: {
      primaryFielder,
      fielderAction,
      throwToKeeper
    },
    pitchMap: {
      landingZoneX,
      landingZoneY,
      dotTrailColor
    },
    audioDirectives: {
      crowdBaseLevel,
      playBatSound,
      batSoundType,
      playStumpsSound,
      playCrowdCheer,
      cheerIntensity,
      playBallWhizz,
      ballWhizzType
    }
  };
}
