/**
 * A friendly bout: the description says duel / spar / challenge, so nobody is trying to kill.
 * Kept in its own module so both the Jianghu reactions and the combat rules can share it.
 */
export function isHonourableBout(description: string): boolean {
  return /\b(duel|spar|sparring|challenge)\b/i.test(description) && !/\b(kill|murder|assassinate|ambush)\b/i.test(description);
}

const REGION_NAMES: Record<string, string> = {
  head: 'head', torso: 'torso', leftArm: 'left arm', rightArm: 'right arm', leftLeg: 'left leg', rightLeg: 'right leg', internal: 'inner organs and meridians',
};
export function regionName(region: string | undefined): string {
  return (region && REGION_NAMES[region]) || 'body';
}
