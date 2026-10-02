import type { FinaleEffect, FinaleOutcome, FinaleSpec } from '../../engine/finale';

/**
 * Authored finales for the seed world events (Game Bible sections 8-10: persistent,
 * state-driven causality). Each finale picks its outcome from the world state when
 * the event's chain completes: the player's presence, trust and knowledge can change
 * it, otherwise the world's own pressure decides. Outcomes can start follow-up
 * events, so one resolved tension becomes the next.
 *
 * Thresholds were calibrated against a 50-turn passive run: Jade Hall tension is
 * about 53 at the assembly, Black River 30 at the ferry finale, and Willow medicine
 * scarcity stays at its seeded 36. Passive play therefore reaches the harder outcome;
 * engaging with the people involved reaches the better one.
 */

const spread = (id: string, text: string, origin: string, locationIds: string[], credibility: number): FinaleEffect =>
  ({ kind: 'spread_rumor', id, text, origin, locationIds, credibility });

const outcome = (o: FinaleOutcome): FinaleOutcome => o;

// ---------------------------------------------------------------- Jade Hall

const GU_WEN_PURSUIT: FinaleSpec = {
  outcomes: [outcome({
    id: 'gu-wen-retrieved',
    headline: 'Jade Hall disciples run Gu Wen to ground on Cloudstep Peak and bring him back with what remains of the stolen volume.',
    description: 'Gu Wen is marched down the mountain under guard, silent, the wrapped manuscript carried before him.',
    when: [],
    effects: [
      { kind: 'adjust_npc', npcId: 'npc-gu-wen', moveTo: 'Jade Hall', disposition: -5 },
      { kind: 'add_npc_goal', npcId: 'npc-gu-wen', retireOthers: true, goal: { id: 'goal-penance', kind: 'rest', description: 'Serve penance in Jade Hall and wait for Elder Bai\'s judgement', priority: 80 } },
      { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: -10, influence: 3 },
      spread('rumor-gu-wen-caught', 'Gu Wen was dragged back to Jade Hall from Cloudstep Peak, and the sect is deciding his punishment.', 'npc-bai-qingshan', ['Jade Hall', 'The Crossroads'], 80),
    ],
  })],
};

const HALL_SCHISM_FOLLOWUP: FinaleSpec = {
  outcomes: [
    outcome({
      id: 'hall-fractures',
      headline: 'The Jade Hall splits for good: Gu Wen takes his followers to Cloudstep Peak and founds a rival sword school.',
      description: 'Two banners now hang where there was one; former sworn brothers pass each other on the road without a word.',
      when: [{ kind: 'faction_tension_at_least', factionId: 'faction-jade-hall', value: 70 }],
      effects: [
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: -20, influence: -15, resources: -10 },
        { kind: 'adjust_faction', factionId: 'faction-crimson-lotus', influence: 4 },
        { kind: 'add_npc_goal', npcId: 'npc-gu-wen', retireOthers: true, goal: { id: 'goal-found-school', kind: 'train', description: 'Build the Cloudstep Sword School into a rival to Jade Hall', priority: 90 } },
        spread('rumor-rival-school', 'Gu Wen has founded a rival sword school on Cloudstep Peak, and Jade Hall disciples are leaving to join it.', 'npc-gu-wen', ['Cloudstep Peak', 'Jade Hall', 'The Crossroads'], 85),
      ],
    }),
    outcome({
      id: 'uneasy-truce',
      headline: 'Elder Bai and Gu Wen agree to an uneasy truce, and the Hall holds together by a thread.',
      description: 'The loyalists and the challengers eat in the same hall again, watching one another over their bowls.',
      when: [],
      effects: [
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: -25 },
        { kind: 'adjust_npc', npcId: 'npc-gu-wen', moveTo: 'Jade Hall' },
        spread('rumor-hall-truce', 'Elder Bai and Gu Wen have made a truce; Jade Hall is whole again, though nobody trusts it.', 'npc-bai-qingshan', ['Jade Hall', 'The Crossroads'], 75),
      ],
    }),
  ],
};

export const AUTUMN_ASSEMBLY_FINALE: FinaleSpec = {
  outcomes: [
    outcome({
      id: 'volume-exposed',
      headline: 'At the assembly, the player\'s question about the missing sword volume turns every eye to Gu Wen, who is exposed as the thief.',
      description: 'Gu Wen goes white, then bolts for the gate; Elder Bai names him oathbreaker before the assembled disciples.',
      when: [
        { kind: 'player_at', locationId: 'Jade Hall' },
        { kind: 'player_knows_rumor', rumorId: 'rumor-volume-missing' },
        { kind: 'npc_disposition_at_least', npcId: 'npc-bai-qingshan', value: 3 },
        { kind: 'npc_alive', npcId: 'npc-gu-wen' },
      ],
      effects: [
        { kind: 'adjust_npc', npcId: 'npc-gu-wen', moveTo: 'Cloudstep Peak', disposition: -20 },
        { kind: 'add_npc_goal', npcId: 'npc-gu-wen', retireOthers: true, goal: { id: 'goal-flee-hall', kind: 'protect', description: 'Stay out of reach of Jade Hall\'s discipline and keep the stolen volume', priority: 90 } },
        { kind: 'adjust_npc', npcId: 'npc-bai-qingshan', disposition: 10 },
        { kind: 'add_npc_goal', npcId: 'npc-bai-qingshan', goal: { id: 'goal-restore-order', kind: 'protect', description: 'Restore order after the exposure and decide Gu Wen\'s fate', priority: 95 } },
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: -15, playerReputation: 10 },
        spread('rumor-gu-wen-exposed', 'Gu Wen was exposed at the autumn assembly as the thief of Jade Hall\'s final sword volume, and has fled the Hall.', 'npc-bai-qingshan', ['Jade Hall', 'The Crossroads', 'Willow Market Town'], 85),
        { kind: 'start_event', event: {
          id: 'event-gu-wen-pursuit', kind: 'personal', title: 'The Hunt for Gu Wen',
          description: 'Jade Hall disciples are combing the Azure Hills for Gu Wen and the stolen volume.',
          locationId: 'Cloudstep Peak', factionIds: ['faction-jade-hall'], severity: 3, pace: { steps: 3, interval: 6 }, finale: GU_WEN_PURSUIT,
        } },
      ],
    }),
    outcome({
      id: 'hall-schism',
      headline: 'The assembly breaks apart: Gu Wen openly challenges Elder Bai\'s chosen heir, and half the disciples follow him out.',
      description: 'Voices rise, benches scrape back, and a line of white-robed disciples walks out beneath the cypresses.',
      when: [{ kind: 'faction_tension_at_least', factionId: 'faction-jade-hall', value: 45 }, { kind: 'npc_alive', npcId: 'npc-gu-wen' }],
      effects: [
        { kind: 'adjust_npc', npcId: 'npc-gu-wen', moveTo: 'Cloudstep Peak' },
        { kind: 'add_npc_goal', npcId: 'npc-gu-wen', retireOthers: true, goal: { id: 'goal-rally-allies', kind: 'social', description: 'Gather allies for a rival claim to Jade Hall', priority: 90 } },
        { kind: 'add_npc_goal', npcId: 'npc-bai-qingshan', goal: { id: 'goal-hold-hall', kind: 'protect', description: 'Keep Jade Hall from splitting further', priority: 95 } },
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: 10, influence: -10, resources: -5 },
        { kind: 'adjust_faction_relation', factionAId: 'faction-jade-hall', factionBId: 'faction-ninefold', trust: -5 },
        spread('rumor-hall-schism', 'Jade Hall has split: Gu Wen and his followers walked out of the autumn assembly in open defiance of Elder Bai.', 'npc-gu-wen', ['Jade Hall', 'The Crossroads', 'Willow Market Town'], 85),
        { kind: 'start_event', event: {
          id: 'event-jade-hall-schism', kind: 'political', title: 'The Jade Hall Schism',
          description: 'Jade Hall is divided between Elder Bai\'s loyalists and Gu Wen\'s followers; talk of a duel for the Hall\'s leadership is spreading.',
          locationId: 'Jade Hall', factionIds: ['faction-jade-hall'], severity: 4, pace: { steps: 4, interval: 6 }, finale: HALL_SCHISM_FOLLOWUP,
        } },
      ],
    }),
    outcome({
      id: 'heir-named',
      headline: 'Elder Bai names his heir before the assembled disciples, and the Hall accepts the choice, for now.',
      description: 'The old master lays his hand on the heir\'s shoulder; the courtyard is silent, then the disciples bow.',
      when: [],
      effects: [
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', tension: -15, influence: 5 },
        { kind: 'add_npc_goal', npcId: 'npc-bai-qingshan', goal: { id: 'goal-train-heir', kind: 'train', description: 'Train his chosen heir before the next assembly', priority: 80 } },
        spread('rumor-heir-named', 'Elder Bai has named his heir; the autumn assembly ended without bloodshed.', 'npc-bai-qingshan', ['Jade Hall', 'The Crossroads'], 90),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Lantern Ferry

const FERRY_BLOCKADE_FOLLOWUP: FinaleSpec = {
  outcomes: [outcome({
    id: 'blockade-lifted',
    headline: 'Jade Hall pays the toll under protest and Captain Ma reopens the ferry; salt begins to flow again.',
    description: 'Couriers cross in sullen silence while the ferrymen check every coin twice.',
    when: [],
    effects: [
      { kind: 'adjust_faction_relation', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', hostility: -10 },
      { kind: 'adjust_market', locationId: 'Lantern Ferry', scarcity: { salt: -15, fish: -10, rope: -10 } },
      { kind: 'adjust_npc', npcId: 'npc-ma-tie', resources: 10 },
      { kind: 'adjust_faction', factionId: 'faction-jade-hall', resources: -5 },
      spread('rumor-blockade-lifted', 'Lantern Ferry is open again: Jade Hall paid the Black River\'s toll.', 'npc-ma-tie', ['Lantern Ferry', 'The Crossroads'], 80),
    ],
  })],
};

export const TOLL_DISPUTE_FINALE: FinaleSpec = {
  outcomes: [
    outcome({
      id: 'toll-mediated',
      headline: 'With the player\'s quiet mediation, Captain Ma and the Jade Hall couriers shake hands on a capped toll.',
      description: 'The ferrymen lower their poles; the couriers pay once, and nobody loses face.',
      when: [{ kind: 'player_at', locationId: 'Lantern Ferry' }, { kind: 'npc_disposition_at_least', npcId: 'npc-ma-tie', value: 3 }],
      effects: [
        { kind: 'adjust_faction_relation', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', hostility: -15, trust: 10, trade: 10 },
        { kind: 'adjust_faction', factionId: 'faction-black-river', tension: -10, playerReputation: 8 },
        { kind: 'adjust_faction', factionId: 'faction-jade-hall', playerReputation: 5 },
        { kind: 'adjust_npc', npcId: 'npc-ma-tie', disposition: 8 },
        spread('rumor-toll-capped', 'The Lantern Ferry toll has been capped after Captain Ma and the Jade Hall couriers shook hands on it.', 'npc-ma-tie', ['Lantern Ferry', 'The Crossroads'], 85),
      ],
    }),
    outcome({
      id: 'ferry-blockade',
      headline: 'Captain Ma closes Lantern Ferry to Jade Hall couriers until the doubled toll is paid.',
      description: 'Boats are hauled onto the bank and a line of ferrymen stands at the lantern pier, arms folded.',
      when: [
        { kind: 'faction_hostility_at_least', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', value: 30 },
        { kind: 'faction_tension_at_least', factionId: 'faction-black-river', value: 30 },
      ],
      effects: [
        { kind: 'adjust_market', locationId: 'Lantern Ferry', scarcity: { salt: 20, fish: 10, rope: 10 } },
        { kind: 'adjust_faction_relation', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', hostility: 10, trust: -10, trade: -15 },
        { kind: 'add_npc_goal', npcId: 'npc-ma-tie', goal: { id: 'goal-hold-ferry', kind: 'protect', description: 'Keep the ferry closed to Jade Hall couriers until the toll is paid', priority: 90 } },
        spread('rumor-ferry-blockade', 'Captain Ma has closed Lantern Ferry to Jade Hall couriers, and salt is already getting dear.', 'npc-ma-tie', ['Lantern Ferry', 'The Crossroads', 'Willow Market Town'], 85),
        { kind: 'start_event', event: {
          id: 'event-ferry-blockade', kind: 'market', title: 'The Ferry Blockade',
          description: 'The ferry is closed to Jade Hall couriers; goods are backing up at the pier and prices are rising.',
          locationId: 'Lantern Ferry', factionIds: ['faction-black-river', 'faction-jade-hall'], severity: 3, pace: { steps: 3, interval: 5 }, finale: FERRY_BLOCKADE_FOLLOWUP,
        } },
      ],
    }),
    outcome({
      id: 'toll-doubled',
      headline: 'The Black River doubles the Lantern Ferry toll, and the Jade Hall couriers pay it with ill grace.',
      description: 'A new tariff board goes up at the toll house; the couriers read it, spit, and pay.',
      when: [],
      effects: [
        { kind: 'adjust_npc', npcId: 'npc-ma-tie', resources: 8 },
        { kind: 'adjust_faction_relation', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', trust: -5, hostility: 5 },
        { kind: 'adjust_market', locationId: 'Lantern Ferry', scarcity: { salt: 6 } },
        spread('rumor-toll-doubled', 'The Black River has doubled the Lantern Ferry toll, and Jade Hall is paying it.', 'npc-ma-tie', ['Lantern Ferry', 'The Crossroads'], 80),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Willow Market

const MEDICINE_SHORTAGE_FOLLOWUP: FinaleSpec = {
  outcomes: [outcome({
    id: 'shortage-eased',
    headline: 'Marsh herbs finally reach Willow Market and the price of medicine falls back.',
    description: 'Crates of reed-wrapped herbs are carried into the stalls, and the line outside the infirmary shortens.',
    when: [],
    effects: [
      { kind: 'adjust_market', locationId: 'Willow Market Town', scarcity: { medicine: -14, herbs: -12 } },
      { kind: 'adjust_npc', npcId: 'npc-yun-shuang', disposition: 3, resources: 5 },
      spread('rumor-shortage-eased', 'Marsh herbs have reached Willow Market; medicine is affordable again.', 'npc-yun-shuang', ['Willow Market Town', 'The Crossroads'], 80),
    ],
  })],
};

export const FEVER_SEASON_FINALE: FinaleSpec = {
  outcomes: [
    outcome({
      id: 'healer-rallied',
      headline: 'With the player\'s help, Madam Yun Shuang\'s infirmary turns the tide of the fever.',
      description: 'Beds are cleared, broths are brewed in rows, and by evening the coughing in the market has thinned.',
      when: [{ kind: 'player_at', locationId: 'Willow Market Town' }, { kind: 'npc_disposition_at_least', npcId: 'npc-yun-shuang', value: 3 }],
      effects: [
        { kind: 'adjust_market', locationId: 'Willow Market Town', scarcity: { medicine: -10, herbs: -8 } },
        { kind: 'adjust_npc', npcId: 'npc-yun-shuang', disposition: 8 },
        { kind: 'adjust_faction', factionId: 'faction-willow-guild', playerReputation: 8, tension: -5 },
        spread('rumor-fever-turned', 'The fever in Willow Market broke after Madam Yun Shuang and a travelling helper rallied the infirmary.', 'npc-yun-shuang', ['Willow Market Town', 'The Crossroads'], 85),
      ],
    }),
    outcome({
      id: 'fever-epidemic',
      headline: 'The fever peaks and Willow Market\'s medicine runs short; the infirmary begins turning people away.',
      description: 'A queue winds around the infirmary wall, and herb sellers have chalked new, steeper prices on their boards.',
      when: [{ kind: 'market_scarcity_at_least', locationId: 'Willow Market Town', good: 'medicine', value: 36 }],
      effects: [
        { kind: 'adjust_market', locationId: 'Willow Market Town', scarcity: { medicine: 12, herbs: 10 } },
        { kind: 'add_npc_goal', npcId: 'npc-yun-shuang', goal: { id: 'goal-source-herbs', kind: 'trade', description: 'Find marsh herbs at any price before the infirmary runs dry', priority: 95 } },
        { kind: 'adjust_npc', npcId: 'npc-yun-shuang', resources: -10 },
        { kind: 'adjust_faction', factionId: 'faction-willow-guild', tension: 8 },
        spread('rumor-medicine-shortage', 'Medicine has run short in Willow Market, and the infirmary is turning people away.', 'npc-yun-shuang', ['Willow Market Town', 'The Crossroads', 'Lantern Ferry'], 85),
        { kind: 'start_event', event: {
          id: 'event-medicine-shortage', kind: 'market', title: 'The Medicine Shortage',
          description: 'Medicine and herbs are scarce in Willow Market; the infirmary is rationing and prices are climbing.',
          locationId: 'Willow Market Town', factionIds: ['faction-willow-guild'], severity: 3, pace: { steps: 3, interval: 5 }, finale: MEDICINE_SHORTAGE_FOLLOWUP,
        } },
      ],
    }),
    outcome({
      id: 'fever-passes',
      headline: 'The fever fades with the first cool nights, and the market breathes again.',
      description: 'Shutters reopen along the lane and the infirmary\'s doors stand propped open to the evening air.',
      when: [],
      effects: [
        { kind: 'adjust_market', locationId: 'Willow Market Town', scarcity: { medicine: -6, herbs: -4 } },
        { kind: 'adjust_faction', factionId: 'faction-willow-guild', tension: -5 },
        spread('rumor-fever-passed', 'The river fever has passed in Willow Market.', 'npc-yun-shuang', ['Willow Market Town', 'The Crossroads'], 80),
      ],
    }),
  ],
};

export const FINALES: Record<string, FinaleSpec> = {
  'event-toll-dispute': TOLL_DISPUTE_FINALE,
  'event-fever-season': FEVER_SEASON_FINALE,
  'event-autumn-assembly': AUTUMN_ASSEMBLY_FINALE,
};
