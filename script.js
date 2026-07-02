const PREP_SECONDS = 15;
const MAX_ROUNDS = 10;
const MANA_CAP = 99;
const AI_MANA_BONUS_PER_ROUND = 3;
const ROUND_BANNER_SECONDS = 1.8;
const SHOP_UPGRADE_COST = 3;
const TOWER_UPGRADE_COST = 5;
const ATTACKER_UPGRADE_MULTIPLIER = 1.1;
const TOWER_UPGRADE_MULTIPLIER = 1.2;
const MAX_TOWER_UPGRADES = 2;
const SHOW_RANGE_ARCS = false;
const STATS_STORAGE_KEY = "bline-tower-wars-match-stats";
const MATCH_STATE_STORAGE_KEY = "line-tower-wars-active-match";
const OPTIONS_STORAGE_KEY = "bline-tower-wars-options";
const INTRO_ANIMATIC_MAX_SECONDS = 20;
const INTRO_ANIMATIC_SEQUENCE = [
  "assets/intro/overhill-animatic-with-urs-audio.mp4",
  "assets/intro/carling-arts-zoom-logo.mp4"
];
const GAUNTLET_VICTORY_SFX_SRC = "assets/sfx/gauntlet-victory.wav";

// Multiplayer mode — set by lobby.js when a match is found, cleared on exit
let multiplayerRole          = null;   // null | "host" | "guest"
let multiplayerRoomId        = null;
let multiplayerOpponentName  = "Opponent";
let opponentAttackerUpgrades = {};     // loaded from Firebase before each battle
const BASE_TOWER_CONE_DEGREES = 130;
const LOGICAL_CANVAS_WIDTH = 420;
const LOGICAL_CANVAS_HEIGHT = 760;
let ARTBOARD_WIDTH = 630;
let ARTBOARD_HEIGHT = 860;
let SAFE_AREA_OFFSET_X = 105;
let SAFE_AREA_OFFSET_Y = 50;
const BATTLEFIELD_BOUNDS = { x: 10, y: 20, width: 400, height: 570 };
let PIXI_LAYER_ASSET_ROOT = "assets/battlefield-template-v3";
let PIXI_HIGH_Z_LAYER = null;
let PIXI_TIMER_FILL_LAYER = null;
const DEFAULT_PIXI_TEMPLATE_LAYERS = [
  "01_bleed_area.png",
  "02_safe_area.png",
  "03_battlefield.png",
  "04_tower_dock.png",
  "05_creep_dock.png",
  "06_timer_round_panel.png",
  "07_timer_round_containers.png",
  "08_score_mana_panel.png",
  "09_score_mana_containers.png",
  "10_tower_card_frames.png",
  "12_creep_card_frames.png"
];
let PIXI_TEMPLATE_LAYERS = [...DEFAULT_PIXI_TEMPLATE_LAYERS];
let BATTLEFIELD_TOWER_MARKER_PATH = "assets/ui/markers/battlefield-tower-marker.png";
let BATTLEFIELD_TOWER_MARKER_SIZE = 48;
const TOWER_RENDER_BOX_WIDTH = 64;
const TOWER_RENDER_BOX_HEIGHT = 78;
const TOWER_SHADOW_LENGTH_RATIO = TOWER_RENDER_BOX_HEIGHT / TOWER_RENDER_BOX_WIDTH;
const OBJECT_SHADOWS = {
  color: "0, 0, 0",
  minAlpha: 0.24,
  maxAlpha: 0.34,
  minWidthScale: 0.98,
  maxWidthScale: 0.82,
  minHeightScale: 0.9,
  maxHeightScale: 3.15,
  creep: {
    widthRatio: 0.68,
    heightRatio: 0.2,
    yOffsetRatio: 0.34
  },
  tower: {
    widthRatio: 0.72,
    heightRatio: 0.18 * TOWER_SHADOW_LENGTH_RATIO,
    yOffsetRatio: 0.42,
    maxDepth: 0.81
  }
};
const DEFAULT_TOWER_CARD_CENTERS = [
  { x: 161, y: 691 },
  { x: 237, y: 691 },
  { x: 313, y: 691 },
  { x: 389, y: 691 },
  { x: 465, y: 691 }
];
const DEFAULT_CREEP_CARD_CENTERS = [
  { x: 161, y: 772 },
  { x: 237, y: 772 },
  { x: 313, y: 772 },
  { x: 389, y: 772 },
  { x: 465, y: 772 }
];
let TOWER_CARD_CENTERS = [...DEFAULT_TOWER_CARD_CENTERS];
let CREEP_CARD_CENTERS = [...DEFAULT_CREEP_CARD_CENTERS];
let TIMER_FILL_RECT = { x: 22, y: 238, width: 20, height: 122 };

const towerDefs = [
  { id: "violet", name: "Violet", cost: 3, damage: 2, range: 0.416, fireRate: 0.935, color: "#7c3aed", coneDegrees: 220, maxTargets: 1 },
  { id: "yellow", name: "Yellow", cost: 5, damage: 2, range: 0.520, fireRate: 0.95, color: "#eab308", coneDegrees: BASE_TOWER_CONE_DEGREES * 1.1, maxTargets: 1 },
  { id: "red", name: "Red", cost: 7, damage: 3.45, range: 0.434, fireRate: 1.05, color: "#dc2626", coneDegrees: BASE_TOWER_CONE_DEGREES, maxTargets: 1 },
  { id: "green", name: "Green", cost: 9, damage: 4, range: 0.635, fireRate: 1.15, color: "#22c55e", coneDegrees: BASE_TOWER_CONE_DEGREES * 0.9, maxTargets: 1 },
  { id: "blue", name: "Blue", cost: 11, damage: 4, range: 0.492, fireRate: 1.375, color: "#2563eb", coneDegrees: 200, maxTargets: 2 }
];
const LEGACY_TOWER_ID_ALIASES = {
  orange: "blue"
};
const LEGACY_ART_PACK_ID_ALIASES = {
  jonCarlingFantasy: "jonCarlingLight"
};

function normalizeTowerId(towerId) {
  return LEGACY_TOWER_ID_ALIASES[towerId] || towerId;
}

function normalizeArtPackId(artPackId) {
  return LEGACY_ART_PACK_ID_ALIASES[artPackId] || artPackId;
}

function readNumberWithLegacyId(source, id) {
  if (!source || typeof source !== "object") {
    return 0;
  }
  const direct = source[id];
  if (Number.isFinite(direct)) {
    return direct;
  }
  for (const [legacyId, currentId] of Object.entries(LEGACY_TOWER_ID_ALIASES)) {
    if (currentId === id && Number.isFinite(source[legacyId])) {
      return source[legacyId];
    }
  }
  return 0;
}

function readBooleanWithLegacyId(source, id) {
  if (!source || typeof source !== "object") {
    return false;
  }
  if (typeof source[id] === "boolean") {
    return source[id];
  }
  for (const [legacyId, currentId] of Object.entries(LEGACY_TOWER_ID_ALIASES)) {
    if (currentId === id && typeof source[legacyId] === "boolean") {
      return source[legacyId];
    }
  }
  return false;
}

function normalizeTowerInstance(tower) {
  if (!tower || typeof tower !== "object") {
    return tower;
  }
  const normalizedId = normalizeTowerId(tower.id);
  if (normalizedId === tower.id) {
    return tower;
  }
  const def = towerDefs.find((item) => item.id === normalizedId);
  return {
    ...tower,
    id: normalizedId,
    name: def?.name || tower.name,
    color: def?.color || tower.color
  };
}
const TOWER_LEVEL_RULES = {
  violet: {
    maxLevel: 2,
    damagePerLevel: 1,
    rangePerLevel: 1.2,
    fireRatePerLevel: 1.5,
    iconScalePerLevel: 1.2
  },
  yellow: {
    maxLevel: 2,
    damagePerLevel: 1,
    rangePerLevel: 1,
    fireRatePerLevel: 1.25,
    iconScalePerLevel: 1.2,
    slowDurationPerLevel: 1.5
  },
  red: {
    maxLevel: 2,
    damagePerLevel: 1.5,
    rangePerLevel: 1.1,
    fireRatePerLevel: 1,
    iconScalePerLevel: 1.2,
    shrapnelDamagePerLevel: 1.5
  },
  green: {
    maxLevel: 2,
    damagePerLevel: 1.5,
    rangePerLevel: 1.1,
    fireRatePerLevel: 1.2,
    iconScalePerLevel: 1.2,
    poisonDotPerLevel: 1.5
  },
  blue: {
    maxLevel: 2,
    damagePerLevel: 1.2,
    rangePerLevel: 1.1,
    fireRatePerLevel: 1,
    iconScalePerLevel: 1.2,
    maxTargetsByLevel: {
      2: 3
    }
  }
};
const ART_PACKS = {
  classic: {
    battlefield: "assets/arena/battlefield_background.png",
    towers: {
      violet: "assets/classic/towers/violet.png",
      yellow: "assets/classic/towers/yellow.png",
      red: "assets/classic/towers/red.png",
      green: "assets/classic/towers/green.png",
      blue: "assets/classic/towers/blue.png"
    },
    towerFireSheets: {
      violet: { path: "assets/classic/towers/sheets/violet-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      yellow: { path: "assets/classic/towers/sheets/yellow-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      red: { path: "assets/classic/towers/sheets/red-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      green: { path: "assets/classic/towers/sheets/green-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      blue: { path: "assets/classic/towers/sheets/blue-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 }
    },
    attackerIcons: {
      imp: null,
      runner: null,
      brute: null,
      wisp: null,
      tank: null
    },
    attackerSprites: {
      imp: { path: "assets/creeps/imp-sprite-sheet.png", frameWidth: 272, frameHeight: 206, frames: 4, fps: 6 },
      runner: { path: "assets/creeps/runner-sprite-sheet.png", frameWidth: 276, frameHeight: 286, frames: 4, fps: 6 },
      brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
      wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
      tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
    }
  },
  jonCarling: {
    battlefield: "assets/joncarling/arena/battlefield_background.png",
    pixiTemplate: {
      assetRoot: "assets/joncarling/battlefield-template-v4",
      artboardWidth: 1260,
      artboardHeight: 1000,
      safeOffsetX: 420,
      safeOffsetY: 180,
      layers: [
        "01_bleed_area.png",
        "02_safe_area.png",
        "03_battlefield.png",
        "04_tower_dock.png",
        "05_creep_dock.png",
        "06_timer_round_panel.png",
        "07_timer_round_containers.png",
        "08_score_mana_panel.png",
        "09_score_mana_containers.png",
        "10_tower_card_frames.png",
        "12_creep_card_frames.png",
        "17_ready_(skips_timer).png"
      ],
      timerFillLayer: "16_timer_fill_rect_24x122.png",
      timerFillRect: { x: 22, y: 201, width: 21, height: 166 },
      towerCardCenters: [
        { x: 477, y: 821 },
        { x: 553, y: 821 },
        { x: 629, y: 821 },
        { x: 705, y: 821 },
        { x: 781, y: 821 }
      ],
      creepCardCenters: [
        { x: 477, y: 902 },
        { x: 553, y: 902 },
        { x: 629, y: 902 },
        { x: 705, y: 902 },
        { x: 781, y: 902 }
      ]
    },
    towers: {
      violet: "assets/towers/violet.png",
      yellow: "assets/towers/yellow.png",
      red: "assets/towers/red.png",
      green: "assets/towers/green.png",
      blue: "assets/towers/blue.png"
    },
    attackerIcons: {
      imp: null,
      runner: null,
      brute: null,
      wisp: null,
      tank: null
    },
    attackerSprites: {
      imp: { path: "assets/creeps/imp-sprite-sheet.png", frameWidth: 272, frameHeight: 206, frames: 4, fps: 6 },
      runner: { path: "assets/creeps/runner-sprite-sheet.png", frameWidth: 276, frameHeight: 286, frames: 4, fps: 6 },
      brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
      wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
      tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
    },
    creepKillEffect: {
      path: "assets/joncarling/effects/creep-kill-explosion.png",
      frameWidth: 97,
      frameHeight: 83,
      frames: 12,
      fps: 12.5,
      renderWidth: 78,
      renderHeight: 67
    }
  },
  jonCarlingLight: {
    battlefield: "assets/joncarling/arena/battlefield_background.png",
    pixiTemplate: {
      assetRoot: "assets/joncarling/battlefield-template-v4",
      artboardWidth: 1260,
      artboardHeight: 1000,
      safeOffsetX: 420,
      safeOffsetY: 180,
      layers: [
        "01_bleed_area.png",
        "02_safe_area.png",
        "03_battlefield.png",
        "04_tower_dock.png",
        "05_creep_dock.png",
        "06_timer_round_panel.png",
        "07_timer_round_containers.png",
        "08_score_mana_panel.png",
        "09_score_mana_containers.png",
        "10_tower_card_frames.png",
        "12_creep_card_frames.png",
        "17_ready_(skips_timer).png"
      ],
      timerFillLayer: "16_timer_fill_rect_24x122.png",
      markerPath: "assets/joncarling-light/markers/battlefield-tower-position.png",
      markerSize: 48,
      timerFillRect: { x: 22, y: 201, width: 21, height: 166 },
      towerCardCenters: [
        { x: 477, y: 821 },
        { x: 553, y: 821 },
        { x: 629, y: 821 },
        { x: 705, y: 821 },
        { x: 781, y: 821 }
      ],
      creepCardCenters: [
        { x: 477, y: 902 },
        { x: 553, y: 902 },
        { x: 629, y: 902 },
        { x: 705, y: 902 },
        { x: 781, y: 902 }
      ]
    },
    towers: {
      violet: "assets/joncarling-light/towers/violet.png",
      yellow: "assets/joncarling-light/towers/yellow.png",
      red: "assets/joncarling-light/towers/red.png",
      green: "assets/joncarling-light/towers/green.png",
      blue: "assets/joncarling-light/towers/blue.png"
    },
    towerFireSheets: {
      violet: { path: "assets/joncarling-light/towers/sheets/violet-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
      yellow: { path: "assets/joncarling-light/towers/sheets/yellow-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
      red: { path: "assets/joncarling-light/towers/sheets/red-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
      green: { path: "assets/joncarling-light/towers/sheets/green-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
      blue: { path: "assets/joncarling-light/towers/sheets/blue-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 }
    },
    attackerIcons: {
      imp: null,
      runner: null,
      brute: null,
      wisp: null,
      tank: null
    },
    attackerSprites: {
      imp: { path: "assets/creeps/imp-sprite-sheet.png", frameWidth: 272, frameHeight: 206, frames: 4, fps: 6 },
      runner: { path: "assets/creeps/runner-sprite-sheet.png", frameWidth: 276, frameHeight: 286, frames: 4, fps: 6 },
      brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
      wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
      tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
    },
    creepKillEffect: {
      path: "assets/joncarling/effects/creep-kill-explosion.png",
      frameWidth: 97,
      frameHeight: 83,
      frames: 12,
      fps: 12.5,
      renderWidth: 78,
      renderHeight: 67
    },
    sideAssets: {
      player: {
        towers: {
          violet: "assets/joncarling-light/towers/violet.png",
          yellow: "assets/joncarling-light/towers/yellow.png",
          red: "assets/joncarling-light/towers/red.png",
          green: "assets/joncarling-light/towers/green.png",
          blue: "assets/joncarling-light/towers/blue.png"
        },
        towerFireSheets: {
          violet: { path: "assets/joncarling-light/towers/sheets/violet-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          yellow: { path: "assets/joncarling-light/towers/sheets/yellow-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          red: { path: "assets/joncarling-light/towers/sheets/red-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          green: { path: "assets/joncarling-light/towers/sheets/green-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          blue: { path: "assets/joncarling-light/towers/sheets/blue-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 }
        },
        attackerSprites: {
          imp: { path: "assets/creeps/imp-sprite-sheet.png", frameWidth: 272, frameHeight: 206, frames: 4, fps: 6 },
          runner: { path: "assets/creeps/runner-sprite-sheet.png", frameWidth: 276, frameHeight: 286, frames: 4, fps: 6 },
          brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
          wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
          tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
        }
      },
      ai: {
        towers: {
          violet: "assets/joncarling-light/towers/violet.png",
          yellow: "assets/joncarling-light/towers/yellow.png",
          red: "assets/joncarling-light/towers/red.png",
          green: "assets/joncarling-light/towers/green.png",
          blue: "assets/joncarling-light/towers/blue.png"
        },
        towerFireSheets: {
          violet: { path: "assets/joncarling-light/towers/sheets/violet-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          yellow: { path: "assets/joncarling-light/towers/sheets/yellow-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          red: { path: "assets/joncarling-light/towers/sheets/red-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          green: { path: "assets/joncarling-light/towers/sheets/green-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
          blue: { path: "assets/joncarling-light/towers/sheets/blue-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 }
        },
        attackerSprites: {
          imp: { path: "assets/creeps/imp-sprite-sheet.png", frameWidth: 272, frameHeight: 206, frames: 4, fps: 6 },
          runner: { path: "assets/creeps/runner-sprite-sheet.png", frameWidth: 276, frameHeight: 286, frames: 4, fps: 6 },
          brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
          wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
          tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
        }
      }
    }
  },
  unfuneralOD: {
    battlefield: "assets/unfuneralod/arena/arena2.png",
    pixiTemplate: {
      assetRoot: "assets/unfuneralod/battlefield-template-v4",
      artboardWidth: 1260,
      artboardHeight: 1000,
      safeOffsetX: 420,
      safeOffsetY: 180,
      layers: [
        "01_bleed_area.png",
        "02_safe_area.png",
        "03_battlefield.png",
        "04_tower_dock.png",
        "05_creep_dock.png",
        "06_timer_round_panel.png",
        "07_timer_round_containers.png",
        "08_score_mana_panel.png",
        "09_score_mana_containers.png",
        "10_tower_card_frames.png",
        "12_creep_card_frames.png",
        "17_ready_(skips_timer).png"
      ],
      highZLayer: "18_safe_area_high_z.png",
      timerFillLayer: "16_timer_fill_rect_24x122.png",
      markerPath: "assets/unfuneralod/markers/battlefield-tower-position.png",
      markerSize: 48,
      timerFillRect: { x: 22, y: 201, width: 21, height: 166 },
      towerCardCenters: [
        { x: 477, y: 821 },
        { x: 553, y: 821 },
        { x: 629, y: 821 },
        { x: 705, y: 821 },
        { x: 781, y: 821 }
      ],
      creepCardCenters: [
        { x: 477, y: 902 },
        { x: 553, y: 902 },
        { x: 629, y: 902 },
        { x: 705, y: 902 },
        { x: 781, y: 902 }
      ]
    },
    towers: {
      violet: "assets/unfuneralod/towers/violet.png",
      yellow: "assets/unfuneralod/towers/yellow.png",
      red: "assets/unfuneralod/towers/red.png",
      green: "assets/unfuneralod/towers/green.png",
      blue: "assets/unfuneralod/towers/blue.png"
    },
    towerFireSheets: {
      violet: { path: "assets/unfuneralod/towers/sheets/violet-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      yellow: { path: "assets/unfuneralod/towers/sheets/yellow-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      red: { path: "assets/unfuneralod/towers/sheets/red-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      green: { path: "assets/unfuneralod/towers/sheets/green-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 },
      blue: { path: "assets/unfuneralod/towers/sheets/blue-fire.png", frameWidth: 64, frameHeight: 78, frames: 4, duration: 0.24 }
    },
    attackerIcons: {
      imp: null,
      runner: null,
      brute: null,
      wisp: null,
      tank: null
    },
    attackerSprites: {
      imp: { path: "assets/unfuneralod/creeps/imp.png", frameWidth: 64, frameHeight: 64, frames: 4, fps: 6, renderWidth: 46, renderHeight: 46, previewFrame: true },
      runner: { path: "assets/unfuneralod/creeps/runner.png", frameWidth: 64, frameHeight: 64, frames: 4, fps: 6, renderWidth: 46, renderHeight: 46, previewFrame: true },
      brute: { path: "assets/creeps/brute-sprite-sheet.png", frameWidth: 270, frameHeight: 272, frames: 4, fps: 6 },
      wisp: { path: "assets/creeps/wisp-sprite-sheet.png", frameWidth: 242, frameHeight: 260, frames: 4, fps: 6 },
      tank: { path: "assets/creeps/tank-sprite-sheet.png", frameWidth: 270, frameHeight: 302, frames: 4, fps: 6 }
    }
  }
};
const JON_CARLING_LIGHT_TOWER_ASSETS = {
  towers: {
    violet: "assets/joncarling-light/towers/violet.png",
    yellow: "assets/joncarling-light/towers/yellow.png",
    red: "assets/joncarling-light/towers/red.png",
    green: "assets/joncarling-light/towers/green.png",
    blue: "assets/joncarling-light/towers/blue.png"
  },
  towerFireSheets: {
    violet: { path: "assets/joncarling-light/towers/sheets/violet-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    yellow: { path: "assets/joncarling-light/towers/sheets/yellow-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    red: { path: "assets/joncarling-light/towers/sheets/red-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    green: { path: "assets/joncarling-light/towers/sheets/green-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    blue: { path: "assets/joncarling-light/towers/sheets/blue-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 }
  }
};
const JON_CARLING_DARK_TOWER_ASSETS = {
  towers: {
    violet: "assets/joncarling-dark/towers/violet.png",
    yellow: "assets/joncarling-dark/towers/yellow.png",
    red: "assets/joncarling-dark/towers/red.png",
    green: "assets/joncarling-dark/towers/green.png",
    blue: "assets/joncarling-dark/towers/blue.png"
  },
  towerFireSheets: {
    violet: { path: "assets/joncarling-dark/towers/sheets/violet-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    yellow: { path: "assets/joncarling-dark/towers/sheets/yellow-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    red: { path: "assets/joncarling-dark/towers/sheets/red-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    green: { path: "assets/joncarling-dark/towers/sheets/green-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 },
    blue: { path: "assets/joncarling-dark/towers/sheets/blue-fire.png", frameWidth: 512, frameHeight: 624, frames: 4, duration: 0.24 }
  }
};
const JON_CARLING_LIGHT_UNIT_ASSETS = {
  attackerSprites: {
    imp: { path: "assets/joncarling-light/creeps/imp.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    runner: { path: "assets/joncarling-light/creeps/runner.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    brute: { path: "assets/joncarling-light/creeps/brute.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    wisp: { path: "assets/joncarling-light/creeps/wisp.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    tank: { path: "assets/joncarling-light/creeps/tank.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true }
  }
};
const JON_CARLING_DARK_UNIT_ASSETS = {
  attackerSprites: {
    imp: { path: "assets/joncarling-dark/creeps/imp.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    runner: { path: "assets/joncarling-dark/creeps/runner.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    brute: { path: "assets/joncarling-dark/creeps/brute.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    wisp: { path: "assets/joncarling-dark/creeps/wisp.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true },
    tank: { path: "assets/joncarling-dark/creeps/tank.png", frameWidth: 512, frameHeight: 512, frames: 4, fps: 6, renderWidth: 64, renderHeight: 64, previewFrame: true }
  }
};
ART_PACKS.jonCarlingLight.sideAssets.player = {
  ...ART_PACKS.jonCarlingLight.sideAssets.player,
  ...JON_CARLING_LIGHT_TOWER_ASSETS,
  ...JON_CARLING_LIGHT_UNIT_ASSETS
};
ART_PACKS.jonCarlingLight.sideAssets.ai = {
  ...ART_PACKS.jonCarlingLight.sideAssets.ai,
  ...JON_CARLING_DARK_TOWER_ASSETS,
  ...JON_CARLING_DARK_UNIT_ASSETS
};
ART_PACKS.jonCarlingDark = {
  ...ART_PACKS.jonCarlingLight,
  towers: JON_CARLING_DARK_TOWER_ASSETS.towers,
  towerFireSheets: JON_CARLING_DARK_TOWER_ASSETS.towerFireSheets,
  attackerSprites: JON_CARLING_DARK_UNIT_ASSETS.attackerSprites,
  sideAssets: {
    player: {
      ...ART_PACKS.jonCarlingLight.sideAssets.player,
      ...JON_CARLING_DARK_TOWER_ASSETS,
      ...JON_CARLING_DARK_UNIT_ASSETS
    },
    ai: {
      ...ART_PACKS.jonCarlingLight.sideAssets.ai,
      ...JON_CARLING_LIGHT_TOWER_ASSETS,
      ...JON_CARLING_LIGHT_UNIT_ASSETS
    }
  }
};

const attackerDefs = [
  { id: "imp", name: "Imp", cost: 2, hp: 18, speed: 0.09, color: "#1f2937" },
  { id: "runner", name: "Runner", cost: 3, hp: 16.2, speed: 0.126, color: "#d97706" },
  { id: "brute", name: "Brute", cost: 4, hp: 39.6, speed: 0.0825, color: "#15803d" },
  { id: "wisp", name: "Wisp", cost: 5, hp: 30.8, speed: 0.132, color: "#8b5cf6" },
  { id: "tank", name: "Tank", cost: 6, hp: 57.2, speed: 0.0682, color: "#0f766e" }
];
const DEFAULT_OPTIONS = {
  difficulty: "yellow",
  artPack: "unfuneralOD",
  musicPack: "christopherJosephUehlein",
  musicVolume: 40,
  sfxVolume: 85
};
const GAUNTLET_STORAGE_KEY = "lineTowerWarsGauntlet";
const GAUNTLET_SEASON_ID = "gauntlet-2026-06-ai-strategy";
const GAUNTLET_MAP_WIDTH = 630;
const GAUNTLET_MAP_HEIGHT = 1520;
const GAUNTLET_STAGES = [
  { id: "marker-01", difficulty: "purple", strategy: "rush", x: 311.5, y: 1415.5 },
  { id: "marker-02", difficulty: "purple", strategy: "fortress", x: 455.5, y: 1319.5 },
  { id: "marker-03", difficulty: "yellow", strategy: "counter", x: 215.5, y: 1271.5 },
  { id: "marker-04", difficulty: "yellow", strategy: "rush", x: 167.5, y: 1175.5 },
  { id: "marker-05", difficulty: "yellow", strategy: "fortress", x: 311.5, y: 1127.5 },
  { id: "marker-06", difficulty: "red", strategy: "counter", x: 455.5, y: 1031.5 },
  { id: "marker-07", difficulty: "red", strategy: "rush", x: 359.5, y: 983.5 },
  { id: "marker-08", difficulty: "red", strategy: "fortress", x: 263.5, y: 887.5 },
  { id: "marker-09", difficulty: "green", strategy: "counter", x: 167.5, y: 791.5 },
  { id: "marker-10", difficulty: "green", strategy: "rush", x: 359.5, y: 695.5 },
  { id: "marker-11", difficulty: "green", strategy: "fortress", x: 455.5, y: 551.5 },
  { id: "marker-12", difficulty: "green", strategy: "counter", x: 407.5, y: 455.5 },
  { id: "marker-13", difficulty: "blue", strategy: "rush", x: 215.5, y: 407.5 },
  { id: "marker-14", difficulty: "blue", strategy: "fortress", x: 311.5, y: 311.5 },
  { id: "marker-15", difficulty: "blue", strategy: "counter", x: 311.5, y: 215.5 },
  { id: "marker-16", difficulty: "blue", strategy: "boss", x: 311.5, y: 71.5 }
];
const ART_PACK_OPTIONS = [
  { id: "classic", name: "Classic", unlocked: true, preview: { creeps: ["imp", "runner"], towers: ["violet", "yellow"] } },
  { id: "jonCarling", name: "Jon Carling", unlocked: true, icon: "assets/ui/artist-icons/joncarling.png", instagram: "https://www.instagram.com/joncarling/", quadBackground: "assets/arena/quad-backgrounds/joncarling.png", preview: { creeps: ["imp", "runner"], towers: ["violet", "yellow"] } },
  { id: "jonCarlingLight", name: "Jon Carling Light", unlocked: true, icon: "assets/ui/artist-icons/joncarling.png", instagram: "https://www.instagram.com/joncarling/", quadBackground: "assets/arena/quad-backgrounds/joncarling.png", preview: { creeps: ["brute", "wisp"], towers: ["red", "blue"] } },
  { id: "jonCarlingDark", name: "Jon Carling Dark", unlocked: true, icon: "assets/ui/artist-icons/joncarling.png", instagram: "https://www.instagram.com/joncarling/", quadBackground: "assets/arena/quad-backgrounds/joncarling.png", preview: { creeps: ["brute", "wisp"], towers: ["red", "blue"] } },
  { id: "unfuneralOD", name: "UnfuneralOD", unlocked: true, icon: "assets/ui/artist-icons/unfuneralod.png", instagram: "https://www.instagram.com/unfuneralod/", quadBackground: "assets/arena/quad-backgrounds/unfuneralod.png", preview: { creeps: ["imp", "runner"], towers: ["violet", "green"] } },
  { id: "artist4", name: "Artist Slot 4", unlocked: false, preview: { creeps: ["brute", "wisp"], towers: ["violet", "yellow"] } },
  { id: "artist5", name: "Artist Slot 5", unlocked: false, preview: { creeps: ["runner", "tank"], towers: ["green", "blue"] } },
  { id: "artist6", name: "Artist Slot 6", unlocked: false, preview: { creeps: ["imp", "wisp"], towers: ["red", "green"] } },
  { id: "artist7", name: "Artist Slot 7", unlocked: false, preview: { creeps: ["brute", "tank"], towers: ["yellow", "blue"] } },
  { id: "artist8", name: "Artist Slot 8", unlocked: false, preview: { creeps: ["runner", "brute"], towers: ["violet", "red"] } }
];
const MUSIC_PACK_OPTIONS = [
  {
    id: "christopherJosephUehlein",
    name: "Christopher Joseph Uehlein",
    unlocked: true,
    icon: "assets/music/composers/christopher-joseph-uehlein-spaceman.png",
    featureImage: "assets/music/composers/christopher-joseph-uehlein-spaceman.png",
    link: "https://overhill.games",
    tracks: [
      { title: "ATW Track 01 Original", src: "assets/music/christopher-joseph-uehlein-track-1.m4a" },
      { title: "ATW Track 02 Military Snare", src: "assets/music/christopher-joseph-uehlein-track-2.m4a" }
    ]
  },
  {
    id: "martinBiesecke",
    name: "Martin Biesecke",
    unlocked: true,
    icon: "assets/music/composers/martin-biesecke.png",
    featureImage: "assets/music/composers/martin-biesecke-mayybie-logo.png",
    link: "https://linktr.ee/maaybie",
    tracks: [
      { title: "Calm Stamets Point Theme", src: "assets/music/martin-biesecke-track-1.m4a" },
      { title: "Singularity Theme", src: "assets/music/martin-biesecke-track-2.m4a" },
      { title: "Martin Robot Combo", src: "assets/music/martin-biesecke-track-3.m4a" }
    ]
  },
  {
    id: "appalachianDeathTrap",
    name: "Appalachian Death Trap",
    unlocked: true,
    icon: "assets/music/composers/appalachian-death-trap-link.png",
    featureImage: "assets/music/composers/appalachian-death-trap-logo.jpg",
    link: "https://linktr.ee/adeathtrap",
    tracks: [
      { title: "Oxford Cloth Pyscho", src: "assets/music/appalachian-death-trap-track-1.m4a" },
      { title: "Into the Wilderness", src: "assets/music/appalachian-death-trap-track-2.m4a" },
      { title: "Stars", src: "assets/music/appalachian-death-trap-track-3.m4a" },
      { title: "Faces be Damed", src: "assets/music/appalachian-death-trap-track-4.m4a" }
    ]
  },
  { id: "composer4", name: "Music Slot 4", unlocked: false, trackCount: 0 },
  { id: "composer5", name: "Music Slot 5", unlocked: false, trackCount: 0 },
  { id: "composer6", name: "Music Slot 6", unlocked: false, trackCount: 0 },
  { id: "composer7", name: "Music Slot 7", unlocked: false, trackCount: 0 },
  { id: "composer8", name: "Music Slot 8", unlocked: false, trackCount: 0 }
];
const AI_DIFFICULTY_SETTINGS = {
  purple: {
    label: "Purple",
    level: "Easy",
    summary: "Forgiving AI. It over-saves, sends slower waves, and gives up the strongest tower priorities.",
    manaBonusPerRound: 1,
    defenseRatioScale: 0.72,
    reserveScale: 1.55,
    postReserveScale: 1.45,
    maxPlacements: 1,
    minAttackBudgetScale: 0.55,
    towerWeights: { violet: 0.5, yellow: -1.1, red: -0.2, green: -0.8, blue: -1.2 },
    attackerPatterns: [["tank"], ["wisp", "tank"], ["brute", "tank"]],
    fallbackOrder: ["tank", "wisp", "brute", "runner", "imp"],
    randomTowerNoise: 0.9,
    considerTowerUpgrades: false,
    adaptation: 0.1,
    burstPressure: 0.35,
    defaultStrategy: "rush"
  },
  yellow: {
    label: "Yellow",
    level: "Medium",
    summary: "Balanced AI. It considers every tower and creep, including tower upgrades, with a modest economy bonus.",
    manaBonusPerRound: 2,
    defenseRatioScale: 0.95,
    reserveScale: 1.05,
    postReserveScale: 1,
    maxPlacements: 2,
    minAttackBudgetScale: 0.9,
    towerWeights: { violet: 0.15, yellow: 0.2, red: 0, green: 0.15, blue: 0.1 },
    attackerPatterns: [["runner", "runner", "imp", "runner", "imp"], ["imp", "runner", "brute", "wisp", "runner"], ["brute", "wisp", "tank", "imp"]],
    fallbackOrder: ["runner", "imp", "brute", "wisp", "tank"],
    randomTowerNoise: 0.22,
    considerTowerUpgrades: true,
    adaptation: 0.45,
    burstPressure: 0.65,
    defaultStrategy: "counter"
  },
  red: {
    label: "Red",
    level: "Hard",
    summary: "Aggressive AI. It leans on rush and imp pressure, with green support from the simulation's upper middle.",
    manaBonusPerRound: 3,
    defenseRatioScale: 0.88,
    reserveScale: 0.92,
    postReserveScale: 0.76,
    maxPlacements: 2,
    minAttackBudgetScale: 1.1,
    towerWeights: { violet: 0.45, yellow: 0.3, red: 0.2, green: 0.65, blue: 0.35 },
    attackerPatterns: [["runner", "imp", "runner", "imp", "runner"], ["imp", "imp", "runner", "brute", "imp"], ["brute", "imp", "wisp", "runner"]],
    fallbackOrder: ["imp", "runner", "brute", "wisp", "tank"],
    randomTowerNoise: 0.12,
    considerTowerUpgrades: true,
    adaptation: 0.75,
    burstPressure: 0.95,
    defaultStrategy: "rush"
  },
  green: {
    label: "Green",
    level: "Very Hard",
    summary: "Sharp AI. It combines the strongest tower samples with steady rush pressure.",
    manaBonusPerRound: 4,
    defenseRatioScale: 1,
    reserveScale: 0.78,
    postReserveScale: 0.58,
    maxPlacements: 2,
    minAttackBudgetScale: 1.25,
    towerWeights: { violet: 0.9, yellow: 0.65, red: 0.15, green: 0.55, blue: 0.95 },
    attackerPatterns: [["runner", "imp", "runner", "imp", "runner", "imp"], ["imp", "runner", "brute", "imp", "runner"], ["brute", "wisp", "imp", "runner"]],
    fallbackOrder: ["runner", "imp", "brute", "wisp", "tank"],
    randomTowerNoise: 0.06,
    considerTowerUpgrades: true,
    adaptation: 1.05,
    burstPressure: 1.2,
    defaultStrategy: "counter"
  },
  blue: {
    label: "Blue",
    level: "Ludicrous",
    summary: "No mercy. It borrows from the top simulated tower-heavy strategies and rush pressure.",
    manaBonusPerRound: 5,
    defenseRatioScale: 1.08,
    reserveScale: 0.62,
    postReserveScale: 0.38,
    maxPlacements: 3,
    minAttackBudgetScale: 1.45,
    towerWeights: { violet: 1, yellow: 1.25, red: 0.25, green: 0.65, blue: 1 },
    attackerPatterns: [["runner", "imp", "runner", "imp", "runner", "imp", "runner"], ["imp", "runner", "imp", "brute", "runner", "imp"], ["brute", "wisp", "imp", "runner", "tank"]],
    fallbackOrder: ["runner", "imp", "brute", "wisp", "tank"],
    randomTowerNoise: 0.02,
    considerTowerUpgrades: true,
    adaptation: 1.35,
    burstPressure: 1.55,
    defaultStrategy: "counter"
  }
};
const AI_STRATEGY_SETTINGS = {
  rush: {
    label: "Rush",
    reserveScale: 0.72,
    defenseBudgetScale: 0.75,
    attackBudgetScale: 1.35,
    fallbackBias: { runner: 1.35, imp: 1.28, wisp: 1.08, brute: 0.92, tank: 0.72 },
    towerBias: { violet: 0.55, yellow: 0.2, red: 0.05, green: 0.35, blue: 0.05 },
    upgradeBias: 0.2,
    counterScale: 0.8,
    burstInterval: 3,
    forceAttackWhenBehind: 1.35
  },
  fortress: {
    label: "Fortress",
    reserveScale: 1.1,
    defenseBudgetScale: 1.45,
    attackBudgetScale: 0.85,
    fallbackBias: { runner: 0.82, imp: 0.9, brute: 1.12, wisp: 1.02, tank: 1.28 },
    towerBias: { violet: -0.1, yellow: 0.45, red: 0.25, green: 0.45, blue: 0.65 },
    upgradeBias: 0.85,
    counterScale: 1,
    burstInterval: 4,
    forceAttackWhenBehind: 1.05
  },
  counter: {
    label: "Counter",
    reserveScale: 0.9,
    defenseBudgetScale: 1.05,
    attackBudgetScale: 1.12,
    fallbackBias: { runner: 1.05, imp: 1.08, brute: 1, wisp: 1.05, tank: 1 },
    towerBias: { violet: 0.15, yellow: 0.35, red: 0.25, green: 0.25, blue: 0.35 },
    upgradeBias: 0.6,
    counterScale: 1.45,
    burstInterval: 3,
    forceAttackWhenBehind: 1.2
  },
  boss: {
    label: "Boss",
    reserveScale: 0.55,
    defenseBudgetScale: 1.25,
    attackBudgetScale: 1.65,
    fallbackBias: { runner: 1.25, imp: 1.25, brute: 1.08, wisp: 1.12, tank: 1.08 },
    towerBias: { violet: 0.45, yellow: 0.85, red: 0.35, green: 0.75, blue: 0.9 },
    upgradeBias: 1,
    counterScale: 1.7,
    burstInterval: 2,
    forceAttackWhenBehind: 1.55
  }
};
const AI_GAUNTLET_STAGE_SETTINGS = [
  { towerPlan: [{ round: 1, towers: 1 }, { round: 4, towers: 2 }, { round: 7, towers: 3 }], towerBias: { violet: 0.8, yellow: 0.2 }, attackerBias: { runner: 0.35, imp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 6, towers: 3 }], towerBias: { yellow: 0.6, violet: 0.25 }, attackerBias: { brute: 0.35, imp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 8, towers: 4 }], towerBias: { red: 0.55, violet: 0.25 }, attackerBias: { runner: 0.45, wisp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 8, towers: 4 }], towerBias: { yellow: 0.55, blue: 0.2 }, attackerBias: { imp: 0.45, runner: 0.3 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 7, towers: 4 }], towerBias: { green: 0.55, red: 0.25 }, attackerBias: { brute: 0.45, wisp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 7, towers: 4 }], towerBias: { red: 0.6, yellow: 0.25 }, attackerBias: { runner: 0.4, imp: 0.35 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }], towerBias: { violet: 0.55, yellow: 0.45, red: 0.2 }, attackerBias: { runner: 0.65, imp: 0.45 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }], towerBias: { green: 0.65, blue: 0.4, yellow: 0.25 }, attackerBias: { brute: 0.55, wisp: 0.35, imp: 0.2 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }, { round: 9, towers: 5 }], towerBias: { yellow: 0.65, blue: 0.55, red: 0.25 }, attackerBias: { wisp: 0.55, runner: 0.4, imp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }, { round: 9, towers: 5 }], towerBias: { violet: 0.55, red: 0.45, yellow: 0.35 }, attackerBias: { runner: 0.7, imp: 0.5 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }, { round: 8, towers: 5 }], towerBias: { blue: 0.75, green: 0.45, yellow: 0.35 }, attackerBias: { brute: 0.55, tank: 0.35, wisp: 0.3 } },
  { towerPlan: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }, { round: 8, towers: 5 }], towerBias: { yellow: 0.65, blue: 0.5, green: 0.35 }, attackerBias: { wisp: 0.55, imp: 0.45, runner: 0.35 } },
  { towerPlan: [{ round: 1, towers: 2 }, { round: 3, towers: 3 }, { round: 5, towers: 4 }, { round: 7, towers: 5 }], towerBias: { violet: 0.65, yellow: 0.55, blue: 0.35 }, attackerBias: { runner: 0.75, imp: 0.6, wisp: 0.25 } },
  { towerPlan: [{ round: 1, towers: 2 }, { round: 3, towers: 3 }, { round: 5, towers: 4 }, { round: 7, towers: 5 }], towerBias: { green: 0.75, blue: 0.65, red: 0.35 }, attackerBias: { brute: 0.65, wisp: 0.45, tank: 0.35 } },
  { towerPlan: [{ round: 1, towers: 2 }, { round: 3, towers: 3 }, { round: 5, towers: 4 }, { round: 7, towers: 5 }], towerBias: { yellow: 0.75, blue: 0.65, red: 0.4 }, attackerBias: { wisp: 0.65, runner: 0.55, imp: 0.45 } },
  { towerPlan: [{ round: 1, towers: 2 }, { round: 2, towers: 3 }, { round: 4, towers: 4 }, { round: 6, towers: 5 }], towerBias: { blue: 0.8, yellow: 0.65, green: 0.55, red: 0.35 }, attackerBias: { runner: 0.65, imp: 0.6, wisp: 0.5, brute: 0.45 } }
];
let gameOptions = { ...DEFAULT_OPTIONS };
let activeArtPackId = DEFAULT_OPTIONS.artPack;
let activeArtPack = ART_PACKS[activeArtPackId] || ART_PACKS[DEFAULT_OPTIONS.artPack];
let towerSpritePaths = activeArtPack.towers;
let towerSpritePathSets = { player: activeArtPack.towers, ai: activeArtPack.towers };
let towerFireSheetConfig = activeArtPack.towerFireSheets || {};
let towerFireSheetConfigSets = { player: activeArtPack.towerFireSheets || {}, ai: activeArtPack.towerFireSheets || {} };
let attackerIconPaths = activeArtPack.attackerIcons;
let attackerIconPathSets = { player: activeArtPack.attackerIcons, ai: activeArtPack.attackerIcons };
let attackerSpriteConfig = activeArtPack.attackerSprites;
let attackerSpriteConfigSets = { player: activeArtPack.attackerSprites, ai: activeArtPack.attackerSprites };
let attackerSprites = {};
let attackerSpriteSets = { player: {}, ai: {} };
let creepKillEffectConfig = activeArtPack.creepKillEffect || null;
let creepKillEffectSprite = null;
const battlefieldBackgroundImage = new Image();
document.documentElement.dataset.artPack = activeArtPackId;
applyArtPack(activeArtPackId);

const menuScreenEl = document.getElementById("menu-screen");
const gauntletScreenEl = document.getElementById("gauntlet-screen");
const difficultyOptionsScreenEl = document.getElementById("difficulty-options-screen");
const musicOptionsScreenEl = document.getElementById("music-options-screen");
const artOptionsScreenEl = document.getElementById("art-options-screen");
const recordsScreenEl = document.getElementById("records-screen");
const gameScreenEl = document.getElementById("game-screen");
const appShellEl = document.getElementById("app-shell");
const loadingAnimaticEl = document.getElementById("loading-animatic");
const loadingAnimaticVideoEl = document.getElementById("loading-animatic-video");
const loadingAnimaticSkipBtnEl = document.getElementById("loading-animatic-skip-btn");
const orientationNoticeEl = document.getElementById("orientation-notice");
const playMatchBtnEl = document.getElementById("play-match-btn");
const openGauntletBtnEl = document.getElementById("open-gauntlet-btn");
const openDifficultyOptionsBtnEl = document.getElementById("open-difficulty-options-btn");
const openMusicOptionsBtnEl = document.getElementById("open-music-options-btn");
const openArtOptionsBtnEl = document.getElementById("open-art-options-btn");
const optionsBackBtnEls = document.querySelectorAll(".options-back-btn");
const difficultyListEl = document.getElementById("difficulty-list");
const difficultySummaryEl = document.getElementById("difficulty-summary");
const musicPackGridEl = document.getElementById("music-pack-grid");
const musicSummaryEl = document.getElementById("music-summary");
const musicVolumeSliderEl = document.getElementById("music-volume-slider");
const musicVolumeValueEl = document.getElementById("music-volume-value");
const sfxVolumeSliderEl = document.getElementById("sfx-volume-slider");
const sfxVolumeValueEl = document.getElementById("sfx-volume-value");
const artPackGridEl = document.getElementById("art-pack-grid");
const resumeMatchBtnEl = document.getElementById("resume-match-btn");
const openRecordsBtnEl = document.getElementById("open-records-btn");
const recordsBackBtnEl = document.getElementById("records-back-btn");
const gauntletBackBtnEl = document.getElementById("gauntlet-back-btn");
const gauntletStartBtnEl = document.getElementById("gauntlet-start-btn");
const gauntletStageTitleEl = document.getElementById("gauntlet-stage-title");
const gauntletStageCopyEl = document.getElementById("gauntlet-stage-copy");
const gauntletStageListEl = document.getElementById("gauntlet-stage-list");
const gauntletMapTrackEl = document.getElementById("gauntlet-map-track");
const gauntletMarkerLayerEl = document.getElementById("gauntlet-marker-layer");
const gauntletOrbEl = document.getElementById("gauntlet-orb");
const menuMetaEl = document.getElementById("menu-meta");
const recordsUpdatedAtEl = document.getElementById("records-updated-at");
const recordsOverviewEl = document.getElementById("records-overview");
const recordsMilestonesEl = document.getElementById("records-milestones");
const recordsTopAttackersEl = document.getElementById("records-top-attackers");
const recordsTopTowersEl = document.getElementById("records-top-towers");
const playerScoreEl = document.getElementById("player-score");
const aiScoreEl = document.getElementById("ai-score");
const waveNumberEl = document.getElementById("wave-number");
const playerManaEl = document.getElementById("player-mana");
const shopManaValueEl = document.getElementById("shop-mana-value");
const phaseLabelEl = document.getElementById("phase-label");
const phaseTimerEl = document.getElementById("phase-timer");
const waveProgressFillEl = document.getElementById("wave-progress-fill");
const statusTextEl = document.getElementById("status-text");
const replayBtnEl = document.getElementById("replay-btn");
const pauseBtnEl = document.getElementById("pause-btn");
const floatingPauseBtnEl = document.getElementById("floating-pause-btn");
const readyBtnEl = document.getElementById("ready-btn");
const battleSkipBtnEl = document.getElementById("battle-skip-btn");
const shopOverlayEl = document.getElementById("shop-overlay");
const matchEndOverlayEl = document.getElementById("match-end-overlay");
const matchResultEyebrowEl = document.getElementById("match-result-eyebrow");
const matchResultTitleEl = document.getElementById("match-result-title");
const matchResultCopyEl = document.getElementById("match-result-copy");
const matchSummaryGridEl = document.getElementById("match-summary-grid");
const matchNextGoalEl = document.getElementById("match-next-goal");
const matchContinueBtnEl = document.getElementById("match-continue-btn");
const matchPlayAgainBtnEl = document.getElementById("match-play-again-btn");
const matchRecordsBtnEl = document.getElementById("match-records-btn");
const matchHomeBtnEl = document.getElementById("match-home-btn");
const shopTitleEl = document.getElementById("shop-title");
const shopUnitNameEl = document.getElementById("shop-unit-name");
const shopCurrentUnitEl = document.getElementById("shop-current-unit");
const shopNextUnitEl = document.getElementById("shop-next-unit");
const shopLevelCurrentEl = document.getElementById("shop-level-current");
const shopLevelNextEl = document.getElementById("shop-level-next");
const shopDescriptionEl = document.getElementById("shop-description");
const shopUpgradeBtnEl = document.getElementById("shop-upgrade-btn");
const shopStartBtnEl = document.getElementById("shop-start-btn");

const enemySlotsEl = document.getElementById("enemy-slots");
const playerSlotsEl = document.getElementById("player-slots");
const towerPanelEl = document.getElementById("tower-panel");
const attackerPanelEl = document.getElementById("attacker-panel");
const arenaZoneEl = document.querySelector(".arena-zone");
const arenaDropZoneEl = document.getElementById("arena-drop-zone");
const topBarEl = document.querySelector(".top-bar");
const hudStripEl = document.querySelector(".hud-strip");
const bottomBarEl = document.querySelector(".bottom-bar");
const progressBtnEl = document.getElementById("progress-btn");
const homeBtnEl = document.getElementById("home-btn");

const canvas = document.getElementById("arena-canvas");
const ctx = canvas.getContext("2d");
const BATTLEFIELD_BOTTOM_TRIM_PX = 10;
const FIELD_SHIFT_Y = BATTLEFIELD_BOTTOM_TRIM_PX / LOGICAL_CANVAS_HEIGHT;
const prefersTouchInput = window.matchMedia("(pointer: coarse)").matches || ("ontouchstart" in window);
const MIN_GAME_FRAME_SCALE = 0.5;
const MAX_PHONE_FRAME_SCALE = Number.POSITIVE_INFINITY;
const MAX_DESKTOP_PREVIEW_SCALE = 1;
const GAME_FRAME_ASPECT = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT;

const state = {
  screen: "menu",
  waveNumber: 1,
  completedRounds: 0,
  phase: "banner",
  phaseTimer: PREP_SECONDS,
  playerMana: 9,
  aiMana: 9,
  playerScore: 0,
  aiScore: 0,
  gameOver: false,
  paused: false,
  winnerText: "",
  playerTowers: [null, null, null, null, null],
  aiTowers: [null, null, null, null, null],
  playerQueue: [],
  aiQueue: [],
  playerQueueCounts: {},
  attackersPlayer: [],
  attackersAI: [],
  projectiles: [],
  fireBursts: [],
  yellowLeaps: [],
  towerFlashes: [],
  towerFireAnimations: [],
  deathParticles: [],
  deathEffects: [],
  nextUnitId: 1,
  nextProjectileId: 1,
  nextFireBurstId: 1,
  aiDraftDone: false,
  animationClock: 0,
  roundBannerTimer: ROUND_BANNER_SECONDS,
  roundBannerText: "Round 1",
  battleSkipUsedThisRound: false,
  shopSelectionType: "attacker",
  shopSelectionId: attackerDefs[0].id,
  matchWinner: "",
  hasActiveMatch: false,
  matchSummary: null,
  matchStats: null,
  playerTowerUpgrades: Object.fromEntries(towerDefs.map((tower) => [tower.id, 0])),
  playerAttackerUpgrades: Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, 0])),
  matchUsage: {
    player: {
      towers: Object.fromEntries(towerDefs.map((tower) => [tower.id, false])),
      attackers: Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, false]))
    },
    ai: {
      towers: Object.fromEntries(towerDefs.map((tower) => [tower.id, false])),
      attackers: Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, false]))
    }
  },
  soundCooldowns: {
    violet: 0,
    yellow: 0,
    red: 0,
    green: 0,
    blue: 0
  },
  roundManaBonusPending: {
    player: 0,
    ai: 0
  },
  gauntletRun: null,
  aiDifficultyOverride: "",
  aiStrategyOverride: ""
};

let gauntletProgress = {
  seasonId: GAUNTLET_SEASON_ID,
  unlockedStage: 0,
  completedWins: 0,
  currentMatches: 0,
  currentWins: 0
};
let gauntletTravelFromStage = null;
let pendingGauntletReturn = null;
let activeDragPayload = "";
let selectedTowerId = null;
let touchDragState = null;
let audioCtx = null;
let audioUnlocked = false;
let sfxMasterGain = null;
let musicAudioEl = null;
let gauntletVictoryAudioEl = null;
let activeMusicPackId = DEFAULT_OPTIONS.musicPack;
let activeMusicTrackIndex = 0;
let musicFadeTimer = null;
let lastAppHiddenAt = null;
let wasPausedBeforeBackground = false;
let laneBackgroundCanvas = null;
let loadingAnimaticDismissed = false;
let loadingAnimaticTimer = null;
let loadingAnimaticIndex = 0;
let loadingAnimaticMutedFallback = false;
const pixiState = {
  app: null,
  ready: false,
  artboard: null,
  battlefieldLayer: null,
  battlefieldMask: null,
  highZLayer: null,
  markerLayer: null,
  markerTexture: null,
  uiLayer: null,
  towerLayer: null,
  dockIconLayer: null,
  textLayer: null,
  timerFill: null,
  timerFillSprite: null,
  timerMask: null,
  legacyTexture: null,
  legacySprite: null,
  towerTextures: {},
  towerTextureSets: { player: {}, ai: {} },
  towerFireTextures: {},
  towerFireTextureSets: { player: {}, ai: {} },
  attackerTextures: {},
  attackerTextureSets: { player: {}, ai: {} },
  towerSprites: new Map(),
  cardSprites: [],
  cardText: [],
  cardEntries: [],
  hudText: {},
  lastTowerSignature: "",
  lastMarkerSignature: "",
  lastCardSignature: "",
  lastHudSignature: ""
};
let pixiTowerDragState = null;
let suppressNextPixiTowerTap = false;
window.atwPixiState = pixiState;

const laneStarts = {
  player: { x: 0.5, y: 560 / LOGICAL_CANVAS_HEIGHT },
  ai: { x: 0.5, y: 40 / LOGICAL_CANVAS_HEIGHT }
};

const laneEnds = {
  player: { x: 0.5, y: 80 / LOGICAL_CANVAS_HEIGHT },
  ai: { x: 0.5, y: 520 / LOGICAL_CANVAS_HEIGHT }
};

const towerPosPlayer = [
  { x: 147 / LOGICAL_CANVAS_WIDTH, y: 479 / LOGICAL_CANVAS_HEIGHT },
  { x: 273 / LOGICAL_CANVAS_WIDTH, y: 479 / LOGICAL_CANVAS_HEIGHT },
  { x: 95 / LOGICAL_CANVAS_WIDTH, y: 539 / LOGICAL_CANVAS_HEIGHT },
  { x: 210 / LOGICAL_CANVAS_WIDTH, y: 539 / LOGICAL_CANVAS_HEIGHT },
  { x: 324 / LOGICAL_CANVAS_WIDTH, y: 539 / LOGICAL_CANVAS_HEIGHT }
];

const towerPosAI = [
  { x: 147 / LOGICAL_CANVAS_WIDTH, y: 130 / LOGICAL_CANVAS_HEIGHT },
  { x: 273 / LOGICAL_CANVAS_WIDTH, y: 130 / LOGICAL_CANVAS_HEIGHT },
  { x: 95 / LOGICAL_CANVAS_WIDTH, y: 70 / LOGICAL_CANVAS_HEIGHT },
  { x: 210 / LOGICAL_CANVAS_WIDTH, y: 70 / LOGICAL_CANVAS_HEIGHT },
  { x: 324 / LOGICAL_CANVAS_WIDTH, y: 70 / LOGICAL_CANVAS_HEIGHT }
];

const slotPosPlayer = towerPosPlayer;
const slotPosAI = towerPosAI;
let persistentStats = createEmptyPersistentStats();
let statsSaveTimeout = null;
let gameFrameLayout = {
  viewportWidth: LOGICAL_CANVAS_WIDTH,
  viewportHeight: LOGICAL_CANVAS_HEIGHT,
  frameWidth: LOGICAL_CANVAS_WIDTH,
  frameHeight: LOGICAL_CANVAS_HEIGHT,
  safeFrameWidth: LOGICAL_CANVAS_WIDTH,
  safeFrameHeight: LOGICAL_CANVAS_HEIGHT,
  safeFrameX: 0,
  safeFrameY: 0,
  visibleLogicalWidth: LOGICAL_CANVAS_WIDTH,
  visibleLogicalHeight: LOGICAL_CANVAS_HEIGHT,
  safeOffsetLogicalX: 0,
  safeOffsetLogicalY: 0,
  scale: 1,
  reservedHeight: 0,
  desktopPreview: false
};

function readVisualViewportSize() {
  return {
    width: Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || LOGICAL_CANVAS_WIDTH),
    height: Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || LOGICAL_CANVAS_HEIGHT)
  };
}

function readPixelValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getShellContentBox(viewportWidth, viewportHeight) {
  if (state.screen === "game") {
    const rootStyles = window.getComputedStyle(document.documentElement);
    const safeLeft = readPixelValue(rootStyles.getPropertyValue("--safe-left"));
    const safeRight = readPixelValue(rootStyles.getPropertyValue("--safe-right"));
    const safeTop = readPixelValue(rootStyles.getPropertyValue("--safe-top"));
    const safeBottom = readPixelValue(rootStyles.getPropertyValue("--safe-bottom"));
    return {
      width: Math.max(1, viewportWidth - safeLeft - safeRight),
      height: Math.max(1, viewportHeight - safeTop - safeBottom)
    };
  }
  const shellStyles = window.getComputedStyle(appShellEl);
  const paddingLeft = readPixelValue(shellStyles.paddingLeft);
  const paddingRight = readPixelValue(shellStyles.paddingRight);
  const paddingTop = readPixelValue(shellStyles.paddingTop);
  const paddingBottom = readPixelValue(shellStyles.paddingBottom);
  return {
    width: Math.max(1, viewportWidth - paddingLeft - paddingRight),
    height: Math.max(1, viewportHeight - paddingTop - paddingBottom)
  };
}

function isDesktopDebugPreviewViewport() {
  return window.matchMedia("(min-width: 901px) and (pointer: fine)").matches;
}

function measureGameChromeHeight() {
  if (state.screen !== "game") {
    return 0;
  }
  return Math.ceil(
    (topBarEl?.getBoundingClientRect().height || 0) +
    (hudStripEl?.getBoundingClientRect().height || 0) +
    (bottomBarEl?.getBoundingClientRect().height || 0)
  );
}

function applyGameFrameLayout(layout) {
  gameFrameLayout = layout;
  window.gameFrameLayout = gameFrameLayout;
  document.documentElement.style.setProperty("--app-width", `${layout.viewportWidth}px`);
  document.documentElement.style.setProperty("--app-height", `${layout.viewportHeight}px`);
  document.documentElement.style.setProperty("--game-frame-width", `${layout.frameWidth}px`);
  document.documentElement.style.setProperty("--game-frame-height", `${layout.frameHeight}px`);
  document.documentElement.style.setProperty("--safe-frame-x", `${layout.safeFrameX || 0}px`);
  document.documentElement.style.setProperty("--safe-frame-y", `${layout.safeFrameY || 0}px`);
  document.documentElement.style.setProperty("--pixi-safe-width", `${layout.safeFrameWidth || layout.frameWidth}px`);
  document.documentElement.style.setProperty("--pixi-safe-height", `${layout.safeFrameHeight || layout.frameHeight}px`);
  document.documentElement.style.setProperty("--game-frame-scale", layout.scale.toFixed(4));
  document.documentElement.style.setProperty("--game-frame-aspect", String(GAME_FRAME_ASPECT));
  appShellEl.classList.toggle("game-active", state.screen === "game");
  gameScreenEl.classList.toggle("desktop-debug-preview", layout.desktopPreview);
  resizePixiRendererToLayout();
}

function calculateGameFrameLayout() {
  const viewport = readVisualViewportSize();
  const desktopPreview = state.screen === "game" && isDesktopDebugPreviewViewport();
  const shellBox = getShellContentBox(viewport.width, viewport.height);
  const maxScale = desktopPreview ? MAX_DESKTOP_PREVIEW_SCALE : MAX_PHONE_FRAME_SCALE;
  const reservedHeight = measureGameChromeHeight();
  const availableWidth = shellBox.width;
  const availableHeight = Math.max(1, shellBox.height - reservedHeight);
  let scale = Math.min(maxScale, availableWidth / LOGICAL_CANVAS_WIDTH, availableHeight / LOGICAL_CANVAS_HEIGHT);
  scale = Math.max(MIN_GAME_FRAME_SCALE, scale);

  const maxBleedWidth = ARTBOARD_WIDTH * scale;
  const maxBleedHeight = ARTBOARD_HEIGHT * scale;
  const frameWidth = Math.round(Math.min(availableWidth, maxBleedWidth));
  const frameHeight = Math.round(Math.min(availableHeight, maxBleedHeight));
  const safeFrameWidth = LOGICAL_CANVAS_WIDTH * scale;
  const safeFrameHeight = LOGICAL_CANVAS_HEIGHT * scale;
  const safeFrameX = (frameWidth - safeFrameWidth) / 2;
  const safeFrameY = (frameHeight - safeFrameHeight) / 2;
  const visibleLogicalWidth = frameWidth / scale;
  const visibleLogicalHeight = frameHeight / scale;

  applyGameFrameLayout({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    frameWidth,
    frameHeight,
    safeFrameWidth,
    safeFrameHeight,
    safeFrameX,
    safeFrameY,
    visibleLogicalWidth,
    visibleLogicalHeight,
    safeOffsetLogicalX: safeFrameX / scale,
    safeOffsetLogicalY: safeFrameY / scale,
    scale,
    reservedHeight,
    desktopPreview
  });
}

function updateViewportHeight() {
  calculateGameFrameLayout();
}

function resizeBattlefieldFrame() {
  calculateGameFrameLayout();
}

function updateOrientationNotice() {
  if (!orientationNoticeEl) {
    return;
  }
  // Portrait-first mobile UX: never block gameplay with orientation prompts.
  orientationNoticeEl.classList.add("hidden");
}

async function lockLandscapeOrientation() {
  // Intentionally no-op: do not force landscape on mobile.
  updateOrientationNotice();
}

function preventBrowserGestures(event) {
  if (!appShellEl.contains(event.target)) {
    return;
  }
  if (event.type === "touchmove" && state.screen !== "game" && !touchDragState) {
    return;
  }
  event.preventDefault();
}

function createOffscreenCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  return offscreen;
}

function getCapacitorPlugin(pluginName) {
  return window.Capacitor?.Plugins?.[pluginName] || null;
}

async function triggerPlacementHaptic(type) {
  const haptics = getCapacitorPlugin("Haptics");
  try {
    if (haptics) {
      if (type === "impact") {
        await haptics.impact({ style: "MEDIUM" });
        return;
      }
      await haptics.notification({ type: type.toUpperCase() });
      return;
    }
  } catch {
  }

  if (!navigator.vibrate) {
    return;
  }

  if (type === "impact") {
    navigator.vibrate(14);
  } else if (type === "success") {
    navigator.vibrate([12, 28, 16]);
  } else if (type === "error") {
    navigator.vibrate([24, 40, 24]);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createCountMap(defs) {
  return Object.fromEntries(defs.map((def) => [def.id, 0]));
}

function createEmptyProfileStats() {
  return {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentWinStreak: 0,
    bestWinStreak: 0
  };
}

function createEmptyMatchStats() {
  return {
    towersPlaced: 0,
    attackersQueued: 0,
    upgradesBought: 0
  };
}

function createEmptyPersistentStats() {
  return {
    updatedAt: null,
    profile: createEmptyProfileStats(),
    unitScores: {
      total: createCountMap(attackerDefs),
      player: createCountMap(attackerDefs),
      ai: createCountMap(attackerDefs)
    },
    towerKills: {
      total: createCountMap(towerDefs),
      player: createCountMap(towerDefs),
      ai: createCountMap(towerDefs)
    },
    matchUsage: {
      attackers: {
        used: createCountMap(attackerDefs),
        winningTeamUsed: createCountMap(attackerDefs)
      },
      towers: {
        used: createCountMap(towerDefs),
        winningTeamUsed: createCountMap(towerDefs)
      }
    }
  };
}

function normalizePersistentStats(raw) {
  const stats = createEmptyPersistentStats();
  if (!raw || typeof raw !== "object") {
    return stats;
  }

  stats.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
  stats.profile.matchesPlayed = Number.isFinite(raw.profile?.matchesPlayed) ? raw.profile.matchesPlayed : 0;
  stats.profile.wins = Number.isFinite(raw.profile?.wins) ? raw.profile.wins : 0;
  stats.profile.losses = Number.isFinite(raw.profile?.losses) ? raw.profile.losses : 0;
  stats.profile.draws = Number.isFinite(raw.profile?.draws) ? raw.profile.draws : 0;
  stats.profile.currentWinStreak = Number.isFinite(raw.profile?.currentWinStreak) ? raw.profile.currentWinStreak : 0;
  stats.profile.bestWinStreak = Number.isFinite(raw.profile?.bestWinStreak) ? raw.profile.bestWinStreak : 0;

  for (const scope of ["total", "player", "ai"]) {
    for (const attacker of attackerDefs) {
      const value = raw.unitScores?.[scope]?.[attacker.id];
      stats.unitScores[scope][attacker.id] = Number.isFinite(value) ? value : 0;
    }
    for (const tower of towerDefs) {
      stats.towerKills[scope][tower.id] = readNumberWithLegacyId(raw.towerKills?.[scope], tower.id);
    }
  }

  for (const attacker of attackerDefs) {
    const usedValue = raw.matchUsage?.attackers?.used?.[attacker.id];
    const winningValue = raw.matchUsage?.attackers?.winningTeamUsed?.[attacker.id];
    stats.matchUsage.attackers.used[attacker.id] = Number.isFinite(usedValue) ? usedValue : 0;
    stats.matchUsage.attackers.winningTeamUsed[attacker.id] = Number.isFinite(winningValue) ? winningValue : 0;
  }

  for (const tower of towerDefs) {
    stats.matchUsage.towers.used[tower.id] = readNumberWithLegacyId(raw.matchUsage?.towers?.used, tower.id);
    stats.matchUsage.towers.winningTeamUsed[tower.id] = readNumberWithLegacyId(raw.matchUsage?.towers?.winningTeamUsed, tower.id);
  }

  return stats;
}

function canUsePreviewStatsEndpoint() {
  return ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
}

async function loadPersistentStats() {
  if (canUsePreviewStatsEndpoint()) {
    try {
      const response = await fetch("./stats", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Stats load failed: ${response.status}`);
      }
      persistentStats = normalizePersistentStats(await response.json());
      return;
    } catch {
    }
  }

  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      persistentStats = normalizePersistentStats(JSON.parse(raw));
    }
  } catch {
    persistentStats = createEmptyPersistentStats();
  }

  refreshMetaUI();
  refreshAllUI();
}

async function persistStatsNow() {
  persistentStats.updatedAt = new Date().toISOString();
  const body = JSON.stringify(persistentStats, null, 2);

  if (canUsePreviewStatsEndpoint()) {
    try {
      const response = await fetch("./stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (!response.ok) {
        throw new Error(`Stats save failed: ${response.status}`);
      }
      return;
    } catch {
    }
  }

  try {
    localStorage.setItem(STATS_STORAGE_KEY, body);
  } catch {
  }
}

function queueStatsSave() {
  if (statsSaveTimeout) {
    clearTimeout(statsSaveTimeout);
  }
  statsSaveTimeout = setTimeout(() => {
    statsSaveTimeout = null;
    persistStatsNow();
  }, 150);
}

function saveMatchStateNow() {
  if (!state.hasActiveMatch || state.gameOver || multiplayerRole !== null) {
    localStorage.removeItem(MATCH_STATE_STORAGE_KEY);
    return;
  }

  const snapshot = {
    waveNumber: state.waveNumber,
    completedRounds: state.completedRounds,
    phase: state.phase,
    phaseTimer: state.phaseTimer,
    playerMana: state.playerMana,
    aiMana: state.aiMana,
    playerScore: state.playerScore,
    aiScore: state.aiScore,
    paused: state.paused,
    winnerText: state.winnerText,
    playerTowers: state.playerTowers,
    aiTowers: state.aiTowers,
    playerQueue: state.playerQueue,
    aiQueue: state.aiQueue,
    playerQueueCounts: state.playerQueueCounts,
    attackersPlayer: state.attackersPlayer,
    attackersAI: state.attackersAI,
    projectiles: state.projectiles,
    fireBursts: state.fireBursts,
    yellowLeaps: state.yellowLeaps,
    towerFlashes: state.towerFlashes,
    towerFireAnimations: state.towerFireAnimations,
    deathParticles: state.deathParticles,
    deathEffects: state.deathEffects,
    nextUnitId: state.nextUnitId,
    nextProjectileId: state.nextProjectileId,
    nextFireBurstId: state.nextFireBurstId,
    aiDraftDone: state.aiDraftDone,
    animationClock: state.animationClock,
    roundBannerTimer: state.roundBannerTimer,
    roundBannerText: state.roundBannerText,
    battleSkipUsedThisRound: state.battleSkipUsedThisRound,
    shopSelectionType: state.shopSelectionType,
    shopSelectionId: state.shopSelectionId,
    matchWinner: state.matchWinner,
    matchSummary: state.matchSummary,
    matchStats: state.matchStats,
    playerTowerUpgrades: state.playerTowerUpgrades,
    playerAttackerUpgrades: state.playerAttackerUpgrades,
    matchUsage: state.matchUsage,
    soundCooldowns: state.soundCooldowns,
    roundManaBonusPending: state.roundManaBonusPending,
    gauntletRun: state.gauntletRun,
    aiDifficultyOverride: state.aiDifficultyOverride,
    aiStrategyOverride: state.aiStrategyOverride,
    hasActiveMatch: state.hasActiveMatch
  };

  try {
    localStorage.setItem(MATCH_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
  }
}

function restoreSavedMatchState() {
  try {
    const raw = localStorage.getItem(MATCH_STATE_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    Object.assign(state, snapshot);
    state.playerTowers = Array.isArray(state.playerTowers) ? state.playerTowers.map(normalizeTowerInstance) : [null, null, null, null, null];
    state.aiTowers = Array.isArray(state.aiTowers) ? state.aiTowers.map(normalizeTowerInstance) : [null, null, null, null, null];
    state.playerTowerUpgrades = Object.fromEntries(towerDefs.map((tower) => [
      tower.id,
      readNumberWithLegacyId(state.playerTowerUpgrades, tower.id)
    ]));
    state.matchUsage = {
      player: {
        attackers: state.matchUsage?.player?.attackers || {},
        towers: Object.fromEntries(towerDefs.map((tower) => [
          tower.id,
          readBooleanWithLegacyId(state.matchUsage?.player?.towers, tower.id)
        ]))
      },
      ai: {
        attackers: state.matchUsage?.ai?.attackers || {},
        towers: Object.fromEntries(towerDefs.map((tower) => [
          tower.id,
          readBooleanWithLegacyId(state.matchUsage?.ai?.towers, tower.id)
        ]))
      }
    };
    state.projectiles = Array.isArray(state.projectiles)
      ? state.projectiles.map((projectile) => {
          const towerId = normalizeTowerId(projectile.towerId);
          return {
            ...projectile,
            towerId,
            color: towerId === "blue" ? "#2563eb" : projectile.color
          };
        })
      : [];
    state.soundCooldowns = Object.fromEntries(towerDefs.map((tower) => [
      tower.id,
      readNumberWithLegacyId(state.soundCooldowns, tower.id)
    ]));
    state.shopSelectionId = normalizeTowerId(state.shopSelectionId);
    state.fireBursts = Array.isArray(state.fireBursts) ? state.fireBursts : [];
    state.yellowLeaps = Array.isArray(state.yellowLeaps) ? state.yellowLeaps : [];
    state.towerFireAnimations = [];
    state.nextFireBurstId = Number.isFinite(state.nextFireBurstId) ? state.nextFireBurstId : 1;
    state.completedRounds = Number.isFinite(state.completedRounds)
      ? clamp(Math.floor(state.completedRounds), 0, MAX_ROUNDS)
      : clamp(Math.floor((Number(state.waveNumber) || 1) - 1), 0, MAX_ROUNDS);
    state.roundManaBonusPending = state.roundManaBonusPending && typeof state.roundManaBonusPending === "object"
      ? {
          player: Number.isFinite(state.roundManaBonusPending.player) ? state.roundManaBonusPending.player : 0,
          ai: Number.isFinite(state.roundManaBonusPending.ai) ? state.roundManaBonusPending.ai : 0
        }
      : { player: 0, ai: 0 };
    state.gameOver = false;
    state.hasActiveMatch = true;
    state.paused = true;
    state.gauntletRun = state.gauntletRun && Number.isFinite(state.gauntletRun.stageIndex)
      ? { stageIndex: clamp(Math.floor(state.gauntletRun.stageIndex), 0, GAUNTLET_STAGES.length - 1) }
      : null;
    state.aiDifficultyOverride = AI_DIFFICULTY_SETTINGS[state.aiDifficultyOverride] ? state.aiDifficultyOverride : "";
    state.aiStrategyOverride = AI_STRATEGY_SETTINGS[state.aiStrategyOverride] ? state.aiStrategyOverride : "";
    refreshAllUI();
    return true;
  } catch {
    return false;
  }
}

function clearSavedMatchState() {
  try {
    localStorage.removeItem(MATCH_STATE_STORAGE_KEY);
  } catch {
  }
}

function getProfileStats() {
  return persistentStats.profile || createEmptyProfileStats();
}

function sumMapValues(map) {
  return Object.values(map || {}).reduce((sum, value) => sum + value, 0);
}

function formatUpdatedAt(isoString) {
  if (!isoString) {
    return "No saved records yet.";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "No saved records yet.";
  }

  return `Updated ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function getWinRate(profile) {
  if (profile.matchesPlayed === 0) {
    return 0;
  }
  return Math.round((profile.wins / profile.matchesPlayed) * 100);
}

function getTopEntries(recordMap, defs, count) {
  return defs
    .map((def) => ({
      name: def.name,
      value: recordMap?.[def.id] || 0
    }))
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, count);
}

function getMilestones(profile) {
  const scoredUnits = sumMapValues(persistentStats.unitScores.player);
  const towerKills = sumMapValues(persistentStats.towerKills.player);

  return [
    {
      label: "Play 3 matches",
      progress: `${Math.min(profile.matchesPlayed, 3)}/3`,
      done: profile.matchesPlayed >= 3
    },
    {
      label: "Reach a 2-match win streak",
      progress: `${Math.min(profile.bestWinStreak, 2)}/2`,
      done: profile.bestWinStreak >= 2
    },
    {
      label: "Score 10 attackers",
      progress: `${Math.min(scoredUnits, 10)}/10`,
      done: scoredUnits >= 10
    },
    {
      label: "Destroy 25 enemy units with towers",
      progress: `${Math.min(towerKills, 25)}/25`,
      done: towerKills >= 25
    }
  ];
}

function getNextGoalText(profile) {
  const milestones = getMilestones(profile);
  const nextMilestone = milestones.find((item) => !item.done);
  if (nextMilestone) {
    return `Next goal: ${nextMilestone.label} (${nextMilestone.progress}).`;
  }
  return "Next goal: defend your best streak and keep improving your records.";
}

function renderStatCards(container, items) {
  container.innerHTML = items.map((item) => `
    <article class="stat-card">
      <strong>${item.value}</strong>
      <span>${item.label}</span>
    </article>
  `).join("");
}

function renderRankingRows(container, items, emptyLabel) {
  if (!items.some((item) => item.value > 0)) {
    container.innerHTML = `<div class="ranking-row"><strong>${emptyLabel}</strong><span>Complete a match to start filling this board.</span></div>`;
    return;
  }

  container.innerHTML = items.map((item, index) => `
    <div class="ranking-row">
      <strong>#${index + 1} ${item.name}</strong>
      <span>${item.value} lifetime impact</span>
    </div>
  `).join("");
}

function getArtPackOption(artPackId) {
  const normalizedArtPackId = normalizeArtPackId(artPackId);
  return ART_PACK_OPTIONS.find((option) => option.id === normalizedArtPackId) || ART_PACK_OPTIONS[0];
}

function getArtPackForPreview(option) {
  const sourceId = ART_PACKS[option.id] ? option.id : (option.previewSource || DEFAULT_OPTIONS.artPack);
  return ART_PACKS[sourceId] || ART_PACKS[DEFAULT_OPTIONS.artPack];
}

function getAttackerPreviewMarkup(pack, attackerId, alt) {
  const fallbackPack = ART_PACKS[DEFAULT_OPTIONS.artPack];
  const spriteCfg = pack.attackerSprites?.[attackerId] || fallbackPack.attackerSprites?.[attackerId];
  const iconPath = pack.attackerIcons?.[attackerId] || fallbackPack.attackerIcons?.[attackerId] || null;
  if (spriteCfg && !iconPath) {
    return `<span class="art-thumb-sprite" style="--sprite-url: url('${spriteCfg.path}'); --sprite-frames: ${spriteCfg.frames};" role="img" aria-label="${alt}"></span>`;
  }
  return `<img src="${iconPath}" alt="${alt}" />`;
}

function renderArtPackOptions() {
  if (!artPackGridEl) {
    return;
  }

  artPackGridEl.innerHTML = ART_PACK_OPTIONS.map((option) => {
    const pack = getArtPackForPreview(option);
    const fallbackPack = ART_PACKS[DEFAULT_OPTIONS.artPack];
    const preview = option.preview;
    const previewPack = {
      ...pack,
      towers: getArtPackSideAssets(pack, "player", "towers"),
      attackerIcons: getArtPackSideAssets(pack, "player", "attackerIcons"),
      attackerSprites: getArtPackSideAssets(pack, "player", "attackerSprites")
    };
    const towerA = previewPack.towers?.[preview.towers[0]] || fallbackPack.towers[preview.towers[0]];
    const towerB = previewPack.towers?.[preview.towers[1]] || fallbackPack.towers[preview.towers[1]];
    const lockedLabel = option.unlocked ? "" : `<span class="art-lock">In-App Purchase</span>`;
    const iconLink = option.icon && option.instagram
      ? `<a class="artist-social-link" href="${option.instagram}" target="_blank" rel="noopener noreferrer" aria-label="${option.name} Instagram"><img src="${option.icon}" alt="" /></a>`
      : "";
    const thumbnailStyle = option.quadBackground
      ? ` style="--quad-bg: url('${option.quadBackground}');"`
      : "";
    const thumbnailCells = option.unlocked
      ? `
          <span class="art-thumb-cell">${getAttackerPreviewMarkup(previewPack, preview.creeps[0], `${option.name} creep`)}</span>
          <span class="art-thumb-cell"><img src="${towerA}" alt="" /></span>
          <span class="art-thumb-cell"><img src="${towerB}" alt="" /></span>
          <span class="art-thumb-cell">${getAttackerPreviewMarkup(previewPack, preview.creeps[1], `${option.name} creep`)}</span>
        `
      : `
          <span class="art-thumb-cell locked-placeholder"></span>
          <span class="art-thumb-cell locked-placeholder"></span>
          <span class="art-thumb-cell locked-placeholder"></span>
          <span class="art-thumb-cell locked-placeholder"></span>
        `;
    return `
      <div class="art-pack-option${option.unlocked ? "" : " locked"}" role="radio" tabindex="${option.unlocked ? "0" : "-1"}" aria-checked="false" data-art-pack="${option.id}" ${option.unlocked ? "" : "aria-disabled=\"true\""} aria-label="${option.name}${option.unlocked ? "" : " locked"}">
        <span class="art-thumb-grid" aria-hidden="true"${thumbnailStyle}>
          ${thumbnailCells}
        </span>
        <span class="art-pack-name-row">
          <strong>${option.name}</strong>
          ${iconLink}
        </span>
        ${lockedLabel}
      </div>
    `;
  }).join("");
}

function refreshArtOptionsUI() {
  if (!artPackGridEl) {
    return;
  }
  for (const option of artPackGridEl.querySelectorAll(".art-pack-option")) {
    const selected = option.dataset.artPack === gameOptions.artPack;
    option.setAttribute("aria-checked", selected ? "true" : "false");
  }
}

function getMusicPackOption(musicPackId) {
  return MUSIC_PACK_OPTIONS.find((option) => option.id === musicPackId) || MUSIC_PACK_OPTIONS[0];
}

function renderMusicPackOptions() {
  if (!musicPackGridEl) {
    return;
  }

  musicPackGridEl.innerHTML = MUSIC_PACK_OPTIONS.map((option) => {
    const lockedLabel = option.unlocked ? "" : `<span class="music-lock">In-App Purchase</span>`;
    const trackCount = option.tracks?.length || option.trackCount || 0;
    const trackLabel = trackCount > 0
      ? `${trackCount} track${trackCount === 1 ? "" : "s"}`
      : "Awaiting tracks";
    const icon = option.icon
      ? `<img class="music-pack-icon" src="${option.icon}" alt="" />`
      : `<span class="music-slot-icon" aria-hidden="true"></span>`;
    const iconMarkup = option.icon && option.link
      ? `<a class="music-composer-link" href="${option.link}" target="_blank" rel="noopener noreferrer" aria-label="${option.name} link">${icon}</a>`
      : icon;
    const featureMarkup = option.featureImage
      ? `
        <span class="music-pack-feature">
          <img class="music-pack-feature-image" src="${option.featureImage}" alt="" />
        </span>
      `
      : "";
    const optionClass = `music-pack-option${option.featureImage ? " featured" : ""}${option.unlocked ? "" : " locked"}`;
    return `
      <div class="${optionClass}" role="radio" tabindex="${option.unlocked ? "0" : "-1"}" aria-checked="false" data-music-pack="${option.id}" ${option.unlocked ? "" : "aria-disabled=\"true\""} aria-label="${option.name}${option.unlocked ? "" : " locked"}">
        ${featureMarkup}
        <span class="music-pack-meta-row">
          ${iconMarkup}
          <span class="music-pack-name-row">
            <strong>${option.name}</strong>
            <span>${trackLabel}</span>
          </span>
        </span>
        ${lockedLabel}
      </div>
    `;
  }).join("");
}

function refreshMusicOptionsUI() {
  if (musicVolumeSliderEl) {
    musicVolumeSliderEl.value = String(gameOptions.musicVolume);
  }
  if (musicVolumeValueEl) {
    musicVolumeValueEl.value = `${gameOptions.musicVolume}%`;
    musicVolumeValueEl.textContent = `${gameOptions.musicVolume}%`;
  }
  if (sfxVolumeSliderEl) {
    sfxVolumeSliderEl.value = String(gameOptions.sfxVolume);
  }
  if (sfxVolumeValueEl) {
    sfxVolumeValueEl.value = `${gameOptions.sfxVolume}%`;
    sfxVolumeValueEl.textContent = `${gameOptions.sfxVolume}%`;
  }
  if (musicSummaryEl) {
    const selected = getMusicPackOption(gameOptions.musicPack);
    const trackCount = selected.tracks?.length || selected.trackCount || 0;
    musicSummaryEl.textContent = trackCount > 0
      ? `${selected.name} selected for battle music.`
      : `${selected.name} selected. Add M4A tracks to enable playback.`;
  }
  if (!musicPackGridEl) {
    return;
  }
  for (const option of musicPackGridEl.querySelectorAll(".music-pack-option")) {
    const selected = option.dataset.musicPack === gameOptions.musicPack;
    option.setAttribute("aria-checked", selected ? "true" : "false");
  }
}

function getOwnerVisualSide(owner) {
  return owner === "ai" ? "ai" : "player";
}

function getArtPackSideAssets(pack, side, key) {
  const fallbackPack = ART_PACKS[DEFAULT_OPTIONS.artPack] || {};
  return pack.sideAssets?.[side]?.[key] || pack[key] || fallbackPack[key] || {};
}

function applyPixiTemplate(template = {}) {
  ARTBOARD_WIDTH = template.artboardWidth || 630;
  ARTBOARD_HEIGHT = template.artboardHeight || 860;
  SAFE_AREA_OFFSET_X = template.safeOffsetX || 105;
  SAFE_AREA_OFFSET_Y = template.safeOffsetY || 50;
  PIXI_LAYER_ASSET_ROOT = template.assetRoot || "assets/battlefield-template-v3";
  PIXI_TEMPLATE_LAYERS = template.layers ? [...template.layers] : [...DEFAULT_PIXI_TEMPLATE_LAYERS];
  PIXI_HIGH_Z_LAYER = template.highZLayer || null;
  PIXI_TIMER_FILL_LAYER = template.timerFillLayer || null;
  BATTLEFIELD_TOWER_MARKER_PATH = template.markerPath || "assets/ui/markers/battlefield-tower-marker.png";
  BATTLEFIELD_TOWER_MARKER_SIZE = template.markerSize || 48;
  TOWER_CARD_CENTERS = template.towerCardCenters ? template.towerCardCenters.map((center) => ({ ...center })) : [...DEFAULT_TOWER_CARD_CENTERS];
  CREEP_CARD_CENTERS = template.creepCardCenters ? template.creepCardCenters.map((center) => ({ ...center })) : [...DEFAULT_CREEP_CARD_CENTERS];
  TIMER_FILL_RECT = template.timerFillRect ? { ...template.timerFillRect } : { x: 22, y: 238, width: 20, height: 122 };
}

function applyArtPack(artPackId, rerender = false) {
  const normalizedArtPackId = normalizeArtPackId(artPackId);
  const nextPack = ART_PACKS[normalizedArtPackId] || ART_PACKS[DEFAULT_OPTIONS.artPack];
  activeArtPackId = ART_PACKS[normalizedArtPackId] ? normalizedArtPackId : DEFAULT_OPTIONS.artPack;
  activeArtPack = nextPack;
  applyPixiTemplate(activeArtPack.pixiTemplate);
  towerSpritePathSets = {
    player: getArtPackSideAssets(activeArtPack, "player", "towers"),
    ai: getArtPackSideAssets(activeArtPack, "ai", "towers")
  };
  towerSpritePaths = towerSpritePathSets.player;
  towerFireSheetConfigSets = {
    player: getArtPackSideAssets(activeArtPack, "player", "towerFireSheets"),
    ai: getArtPackSideAssets(activeArtPack, "ai", "towerFireSheets")
  };
  towerFireSheetConfig = towerFireSheetConfigSets.player;
  attackerIconPathSets = {
    player: getArtPackSideAssets(activeArtPack, "player", "attackerIcons"),
    ai: getArtPackSideAssets(activeArtPack, "ai", "attackerIcons")
  };
  attackerIconPaths = attackerIconPathSets.player;
  attackerSpriteConfigSets = {
    player: getArtPackSideAssets(activeArtPack, "player", "attackerSprites"),
    ai: getArtPackSideAssets(activeArtPack, "ai", "attackerSprites")
  };
  attackerSpriteConfig = attackerSpriteConfigSets.player;
  creepKillEffectConfig = activeArtPack.creepKillEffect || null;
  attackerSprites = {};
  attackerSpriteSets = { player: {}, ai: {} };
  for (const side of ["player", "ai"]) {
    for (const [attackerId, cfg] of Object.entries(attackerSpriteConfigSets[side] || {})) {
      if (!cfg) {
        continue;
      }
      const img = new Image();
      img.src = cfg.path;
      attackerSpriteSets[side][attackerId] = img;
    }
  }
  attackerSprites = attackerSpriteSets.player;
  creepKillEffectSprite = null;
  if (creepKillEffectConfig?.path) {
    creepKillEffectSprite = new Image();
    creepKillEffectSprite.src = creepKillEffectConfig.path;
  }
  battlefieldBackgroundImage.src = activeArtPack.battlefield || "";
  document.documentElement.dataset.artPack = activeArtPackId;

  if (rerender) {
    createCards();
    if (pixiState.ready) {
      buildPixiScene();
      pixiState.lastTowerSignature = "";
      pixiState.lastCardSignature = "";
      pixiState.lastHudSignature = "";
    }
    refreshAllUI();
  }
}

function getAIDifficultySettings() {
  const difficultyId = state.aiDifficultyOverride || gameOptions.difficulty;
  return AI_DIFFICULTY_SETTINGS[difficultyId] || AI_DIFFICULTY_SETTINGS[DEFAULT_OPTIONS.difficulty];
}

function getAIStrategySettings() {
  const difficulty = getAIDifficultySettings();
  const strategyId = state.aiStrategyOverride || difficulty.defaultStrategy || "counter";
  return AI_STRATEGY_SETTINGS[strategyId] || AI_STRATEGY_SETTINGS.counter;
}

function getAIGauntletStageSettings() {
  if (!state.gauntletRun) {
    return null;
  }
  const stageIndex = clamp(Math.floor(state.gauntletRun.stageIndex), 0, GAUNTLET_STAGES.length - 1);
  return AI_GAUNTLET_STAGE_SETTINGS[stageIndex] || null;
}

function getAIManaBonusPerRound() {
  const configuredBonus = getAIDifficultySettings().manaBonusPerRound;
  return Number.isFinite(configuredBonus) ? configuredBonus : AI_MANA_BONUS_PER_ROUND;
}

function loadOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) {
      gameOptions = { ...DEFAULT_OPTIONS };
      applyArtPack(gameOptions.artPack);
      return;
    }
    const parsed = JSON.parse(raw);
    gameOptions = {
      ...DEFAULT_OPTIONS,
      ...parsed
    };
    gameOptions.artPack = normalizeArtPackId(gameOptions.artPack);
    if (!AI_DIFFICULTY_SETTINGS[gameOptions.difficulty]) {
      gameOptions.difficulty = DEFAULT_OPTIONS.difficulty;
    }
    if (!ART_PACKS[gameOptions.artPack]) {
      gameOptions.artPack = DEFAULT_OPTIONS.artPack;
    }
    if (gameOptions.musicPack === "composer1") {
      gameOptions.musicPack = DEFAULT_OPTIONS.musicPack;
    } else if (gameOptions.musicPack === "composer2") {
      gameOptions.musicPack = "martinBiesecke";
    }
    if (!MUSIC_PACK_OPTIONS.some((option) => option.id === gameOptions.musicPack)) {
      gameOptions.musicPack = DEFAULT_OPTIONS.musicPack;
    }
    gameOptions.musicVolume = clamp(Number(gameOptions.musicVolume), 0, 100);
    gameOptions.sfxVolume = clamp(Number(gameOptions.sfxVolume), 0, 100);
  } catch {
    gameOptions = { ...DEFAULT_OPTIONS };
  }
  applyArtPack(gameOptions.artPack);
}

function saveOptions() {
  try {
    localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(gameOptions));
  } catch {
  }
}

function createDefaultGauntletProgress() {
  return {
    seasonId: GAUNTLET_SEASON_ID,
    unlockedStage: 0,
    completedWins: 0,
    currentMatches: 0,
    currentWins: 0
  };
}

function normalizeGauntletProgress(parsed) {
  if (parsed?.seasonId && parsed.seasonId !== GAUNTLET_SEASON_ID) {
    return createDefaultGauntletProgress();
  }
  const unlockedStage = clamp(Math.floor(Number(parsed?.unlockedStage) || 0), 0, GAUNTLET_STAGES.length - 1);
  const completedWins = clamp(
    Math.floor(Number(parsed?.completedWins ?? unlockedStage) || 0),
    0,
    GAUNTLET_STAGES.length
  );
  const currentMatches = Math.max(0, Math.floor(Number(parsed?.currentMatches) || 0));
  const currentWins = clamp(Math.floor(Number(parsed?.currentWins) || 0), 0, currentMatches);
  return {
    seasonId: GAUNTLET_SEASON_ID,
    unlockedStage,
    completedWins,
    currentMatches,
    currentWins
  };
}

function loadGauntletProgress() {
  try {
    const raw = localStorage.getItem(GAUNTLET_STORAGE_KEY);
    gauntletProgress = raw ? normalizeGauntletProgress(JSON.parse(raw)) : createDefaultGauntletProgress();
  } catch {
    gauntletProgress = createDefaultGauntletProgress();
  }
}

function saveGauntletProgress() {
  try {
    localStorage.setItem(GAUNTLET_STORAGE_KEY, JSON.stringify(gauntletProgress));
  } catch {
  }
}

function getGauntletStage(index = gauntletProgress.unlockedStage) {
  return GAUNTLET_STAGES[clamp(index, 0, GAUNTLET_STAGES.length - 1)];
}

function getGauntletStagePercent(stage) {
  return {
    x: stage.x / GAUNTLET_MAP_WIDTH * 100,
    y: stage.y / GAUNTLET_MAP_HEIGHT * 100
  };
}

function focusGauntletViewport(stageIndex = gauntletProgress.unlockedStage) {
  if (!gauntletMapTrackEl) {
    return;
  }
  const viewportEl = document.getElementById("gauntlet-map-viewport");
  if (!viewportEl) {
    return;
  }
  const stage = getGauntletStage(stageIndex);
  const viewportHeight = viewportEl.clientHeight;
  const trackHeight = gauntletMapTrackEl.getBoundingClientRect().height;
  if (!viewportHeight || !trackHeight) {
    return;
  }
  const stageY = stage.y / GAUNTLET_MAP_HEIGHT * trackHeight;
  const targetY = viewportHeight * 0.66;
  const minOffset = Math.min(0, viewportHeight - trackHeight);
  const offsetY = clamp(targetY - stageY, minOffset, 0);
  gauntletMapTrackEl.style.setProperty("--gauntlet-scroll-y", `${offsetY.toFixed(1)}px`);
}

function refreshGauntletUI() {
  if (!gauntletScreenEl) {
    return;
  }
  const stageIndex = clamp(gauntletProgress.unlockedStage, 0, GAUNTLET_STAGES.length - 1);
  const stage = getGauntletStage(stageIndex);
  const stagePercent = getGauntletStagePercent(stage);
  if (gauntletOrbEl) {
    const fromStage = gauntletTravelFromStage !== null ? getGauntletStage(gauntletTravelFromStage) : null;
    const fromPercent = fromStage ? getGauntletStagePercent(fromStage) : null;
    gauntletOrbEl.style.left = `${(fromPercent || stagePercent).x}%`;
    gauntletOrbEl.style.top = `${(fromPercent || stagePercent).y}%`;
    if (fromPercent) {
      requestAnimationFrame(() => {
        gauntletOrbEl.style.left = `${stagePercent.x}%`;
        gauntletOrbEl.style.top = `${stagePercent.y}%`;
        gauntletTravelFromStage = null;
      });
    }
  }
  if (gauntletMarkerLayerEl) {
    gauntletMarkerLayerEl.innerHTML = GAUNTLET_STAGES.map((item, index) => {
      const stateName = index < stageIndex ? "complete" : index === stageIndex ? "current" : "pending";
      const percent = getGauntletStagePercent(item);
      return `
        <div class="gauntlet-marker ${stateName}" style="left: ${percent.x}%; top: ${percent.y}%;"></div>
      `;
    }).join("");
  }
  if (gauntletStartBtnEl) {
    gauntletStartBtnEl.textContent = "Engage";
  }
  requestAnimationFrame(() => focusGauntletViewport(stageIndex));
}

function advanceGauntletAfterVictory(stageIndex) {
  if (!Number.isFinite(stageIndex)) {
    return false;
  }
  gauntletProgress.completedWins = clamp(
    Math.max(Number(gauntletProgress.completedWins) || 0, stageIndex + 1),
    0,
    GAUNTLET_STAGES.length
  );
  const nextStageIndex = clamp(stageIndex + 1, 0, GAUNTLET_STAGES.length - 1);
  if (nextStageIndex <= gauntletProgress.unlockedStage) {
    saveGauntletProgress();
    return false;
  }
  gauntletTravelFromStage = stageIndex;
  gauntletProgress.unlockedStage = nextStageIndex;
  saveGauntletProgress();
  return true;
}

function recordCurrentGauntletResult(won) {
  gauntletProgress.currentMatches = Math.max(0, Math.floor(Number(gauntletProgress.currentMatches) || 0)) + 1;
  gauntletProgress.currentWins = clamp(
    Math.floor(Number(gauntletProgress.currentWins) || 0) + (won ? 1 : 0),
    0,
    gauntletProgress.currentMatches
  );
  saveGauntletProgress();
}

function getCurrentGauntletWinRate() {
  const matches = Math.max(0, Math.floor(Number(gauntletProgress.currentMatches) || 0));
  if (matches <= 0) {
    return 0;
  }
  const wins = clamp(Math.floor(Number(gauntletProgress.currentWins) || 0), 0, matches);
  return Math.round((wins / matches) * 100);
}

function setDifficulty(difficulty) {
  if (!AI_DIFFICULTY_SETTINGS[difficulty]) {
    return;
  }
  gameOptions.difficulty = difficulty;
  saveOptions();
  refreshOptionsUI();
}

function setArtPack(artPackId) {
  const normalizedArtPackId = normalizeArtPackId(artPackId);
  const option = getArtPackOption(normalizedArtPackId);
  if (!option.unlocked || !ART_PACKS[normalizedArtPackId]) {
    return;
  }
  gameOptions.artPack = normalizedArtPackId;
  applyArtPack(normalizedArtPackId, true);
  saveOptions();
  refreshArtOptionsUI();
}

function setMusicPack(musicPackId) {
  const option = getMusicPackOption(musicPackId);
  if (!option.unlocked) {
    return;
  }
  gameOptions.musicPack = option.id;
  activeMusicPackId = option.id;
  activeMusicTrackIndex = 0;
  if (musicAudioEl) {
    musicAudioEl.pause();
    musicAudioEl.removeAttribute("src");
    musicAudioEl.load();
  }
  saveOptions();
  refreshMusicOptionsUI();
  syncMusicPlaybackForScreen();
}

function setMusicVolume(volume) {
  gameOptions.musicVolume = clamp(Number(volume), 0, 100);
  updateMusicVolume();
  saveOptions();
  refreshMusicOptionsUI();
}

function setSfxVolume(volume) {
  gameOptions.sfxVolume = clamp(Number(volume), 0, 100);
  updateSfxVolume();
  if (gauntletVictoryAudioEl) {
    gauntletVictoryAudioEl.volume = getVolumeScale(gameOptions.sfxVolume);
  }
  saveOptions();
  refreshMusicOptionsUI();
}

function refreshOptionsUI() {
  const settings = getAIDifficultySettings();
  if (difficultySummaryEl) {
    difficultySummaryEl.textContent = settings.summary;
  }
  renderArtPackOptions();
  renderMusicPackOptions();
  if (!difficultyListEl) {
    return;
  }
  for (const option of difficultyListEl.querySelectorAll(".difficulty-option")) {
    const selected = option.dataset.difficulty === gameOptions.difficulty;
    option.setAttribute("aria-checked", selected ? "true" : "false");
  }
  refreshMusicOptionsUI();
  refreshArtOptionsUI();
}

function refreshMenuUI() {
  const profile = getProfileStats();
  const hasResume = state.hasActiveMatch && !state.gameOver && multiplayerRole === null;
  playMatchBtnEl.textContent = hasResume ? "Start New Match" : "Play Match";
  resumeMatchBtnEl.classList.toggle("hidden", !hasResume);
  menuMetaEl.textContent = profile.matchesPlayed > 0
    ? `${profile.matchesPlayed} matches played · ${profile.wins} wins · Best streak ${profile.bestWinStreak}`
    : "No records yet. Your first match will begin a fresh commander profile.";
}

function refreshRecordsUI() {
  const profile = getProfileStats();
  recordsUpdatedAtEl.textContent = formatUpdatedAt(persistentStats.updatedAt);
  renderStatCards(recordsOverviewEl, [
    { label: "Matches Played", value: profile.matchesPlayed },
    { label: "Wins", value: profile.wins },
    { label: "Best Win Streak", value: profile.bestWinStreak },
    { label: "Win Rate", value: `${getWinRate(profile)}%` }
  ]);

  recordsMilestonesEl.innerHTML = getMilestones(profile).map((item) => `
    <div class="milestone-row">
      <strong>${item.done ? "Completed" : "In Progress"} · ${item.label}</strong>
      <span>${item.progress}</span>
    </div>
  `).join("");

  renderRankingRows(recordsTopAttackersEl, getTopEntries(persistentStats.unitScores.player, attackerDefs, 3), "Top attackers are waiting");
  renderRankingRows(recordsTopTowersEl, getTopEntries(persistentStats.towerKills.player, towerDefs, 3), "Top towers are waiting");
}

function refreshMetaUI() {
  refreshMenuUI();
  refreshGauntletUI();
  refreshOptionsUI();
  refreshRecordsUI();
}

function setScreen(screen) {
  state.screen = screen;
  menuScreenEl.classList.toggle("hidden", screen !== "menu");
  gauntletScreenEl.classList.toggle("hidden", screen !== "gauntlet");
  difficultyOptionsScreenEl.classList.toggle("hidden", screen !== "difficultyOptions");
  musicOptionsScreenEl.classList.toggle("hidden", screen !== "musicOptions");
  artOptionsScreenEl.classList.toggle("hidden", screen !== "artOptions");
  recordsScreenEl.classList.toggle("hidden", screen !== "records");
  gameScreenEl.classList.toggle("hidden", screen !== "game");
  refreshMenuUI();
  refreshOptionsUI();
  refreshRecordsUI();
  updateOrientationNotice();
  requestAnimationFrame(resizeBattlefieldFrame);
  if (screen === "gauntlet") {
    requestAnimationFrame(() => focusGauntletViewport());
  }
  if (screen !== "game") {
    requestAnimationFrame(() => {
      appShellEl.scrollTop = 0;
    });
  }
  syncMusicPlaybackForScreen();
}

function dismissLoadingAnimatic() {
  if (loadingAnimaticDismissed) {
    return;
  }
  loadingAnimaticDismissed = true;
  if (loadingAnimaticTimer) {
    window.clearTimeout(loadingAnimaticTimer);
    loadingAnimaticTimer = null;
  }
  if (loadingAnimaticVideoEl) {
    loadingAnimaticVideoEl.pause();
    loadingAnimaticVideoEl.removeAttribute("src");
    loadingAnimaticVideoEl.load();
  }
  loadingAnimaticEl?.classList.add("dismissed");
  window.setTimeout(() => {
    loadingAnimaticEl?.classList.add("hidden");
  }, 260);
}

function setLoadingAnimaticSource(index) {
  if (!loadingAnimaticVideoEl || !INTRO_ANIMATIC_SEQUENCE[index]) {
    return false;
  }
  loadingAnimaticVideoEl.classList.remove("fading-out");
  loadingAnimaticVideoEl.src = INTRO_ANIMATIC_SEQUENCE[index];
  loadingAnimaticVideoEl.load();
  return true;
}

function syncLoadingAnimaticAspect() {
  if (!loadingAnimaticEl || !loadingAnimaticVideoEl) {
    return;
  }
  const { videoWidth, videoHeight } = loadingAnimaticVideoEl;
  if (!videoWidth || !videoHeight) {
    return;
  }
  loadingAnimaticEl.style.setProperty("--loading-video-aspect", String(videoWidth / videoHeight));
}

function updateLoadingAnimaticFade() {
  if (!loadingAnimaticVideoEl || loadingAnimaticDismissed) {
    return;
  }
  const isFinalAnimatic = loadingAnimaticIndex === INTRO_ANIMATIC_SEQUENCE.length - 1;
  const { currentTime, duration } = loadingAnimaticVideoEl;
  if (isFinalAnimatic && Number.isFinite(duration) && duration - currentTime <= 1.1) {
    loadingAnimaticVideoEl.classList.add("fading-out");
  }
}

function advanceLoadingAnimatic() {
  if (loadingAnimaticDismissed) {
    return;
  }
  loadingAnimaticIndex += 1;
  if (loadingAnimaticIndex >= INTRO_ANIMATIC_SEQUENCE.length || !setLoadingAnimaticSource(loadingAnimaticIndex)) {
    dismissLoadingAnimatic();
    return;
  }
  window.setTimeout(tryPlayLoadingAnimaticWithSound, 0);
}

function tryPlayLoadingAnimaticWithSound() {
  if (loadingAnimaticDismissed || !loadingAnimaticVideoEl) {
    return;
  }
  loadingAnimaticVideoEl.muted = loadingAnimaticMutedFallback;
  loadingAnimaticVideoEl.volume = getVolumeScale(gameOptions.sfxVolume);
  const playPromise = loadingAnimaticVideoEl.play();
  if (!playPromise || typeof playPromise.catch !== "function") {
    return;
  }
  playPromise.catch(() => {
    if (loadingAnimaticDismissed || !loadingAnimaticVideoEl) {
      return;
    }
    loadingAnimaticVideoEl.muted = true;
    loadingAnimaticMutedFallback = true;
    loadingAnimaticVideoEl.play().catch(() => {
      window.setTimeout(advanceLoadingAnimatic, 800);
    });
  });
}

function initLoadingAnimatic() {
  if (!loadingAnimaticEl || !loadingAnimaticVideoEl) {
    return;
  }
  if (!setLoadingAnimaticSource(loadingAnimaticIndex)) {
    dismissLoadingAnimatic();
    return;
  }
  loadingAnimaticVideoEl.volume = getVolumeScale(gameOptions.sfxVolume);
  loadingAnimaticVideoEl.addEventListener("loadedmetadata", syncLoadingAnimaticAspect);
  loadingAnimaticVideoEl.addEventListener("timeupdate", updateLoadingAnimaticFade);
  loadingAnimaticVideoEl.addEventListener("ended", advanceLoadingAnimatic);
  loadingAnimaticVideoEl.addEventListener("error", () => {
    window.setTimeout(advanceLoadingAnimatic, 800);
  });
  loadingAnimaticSkipBtnEl?.addEventListener("click", () => {
    unlockAudioFromGesture();
    dismissLoadingAnimatic();
  });
  loadingAnimaticTimer = window.setTimeout(dismissLoadingAnimatic, INTRO_ANIMATIC_MAX_SECONDS * 1000);
  window.setTimeout(tryPlayLoadingAnimaticWithSound, 0);
}

function recordUnitScore(attackerId, owner) {
  persistentStats.unitScores.total[attackerId] += 1;
  persistentStats.unitScores[owner][attackerId] += 1;
  queueStatsSave();
}

function recordTowerKill(towerId, owner) {
  persistentStats.towerKills.total[towerId] += 1;
  persistentStats.towerKills[owner][towerId] += 1;
  queueStatsSave();
}

function grantRoundManaBonus(owner, amount = 1, source = "kill") {
  if (owner !== "player" && owner !== "ai") {
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  if (owner === "player") {
    state.playerMana = clamp(state.playerMana + amount, 0, MANA_CAP);
    playBonusManaSfx(source);
  } else {
    state.aiMana = clamp(state.aiMana + amount, 0, MANA_CAP);
  }

  // Keep legacy field neutral for save compatibility with old sessions.
  state.roundManaBonusPending[owner] = 0;
}

function markMatchUsage(kind, id, owner) {
  state.matchUsage[owner][kind][id] = true;
}

function commitMatchUsageStats() {
  for (const owner of ["player", "ai"]) {
    const isWinningSide = state.matchWinner === owner;

    for (const attacker of attackerDefs) {
      if (!state.matchUsage[owner].attackers[attacker.id]) {
        continue;
      }
      persistentStats.matchUsage.attackers.used[attacker.id] += 1;
      if (isWinningSide) {
        persistentStats.matchUsage.attackers.winningTeamUsed[attacker.id] += 1;
      }
    }

    for (const tower of towerDefs) {
      if (!state.matchUsage[owner].towers[tower.id]) {
        continue;
      }
      persistentStats.matchUsage.towers.used[tower.id] += 1;
      if (isWinningSide) {
        persistentStats.matchUsage.towers.winningTeamUsed[tower.id] += 1;
      }
    }
  }

  queueStatsSave();
}

function getAttackerDef(attackerId) {
  return attackerDefs.find((item) => item.id === attackerId) || null;
}

function getTowerDef(towerId) {
  return towerDefs.find((item) => item.id === towerId) || null;
}

function getPlayerUpgradeLevel(attackerId) {
  return 1 + (state.playerAttackerUpgrades[attackerId] || 0);
}

function getPlayerTowerUpgradeLevel(towerId) {
  return 1 + (state.playerTowerUpgrades[towerId] || 0);
}

function getTowerLevelRule(towerId) {
  const rule = TOWER_LEVEL_RULES[towerId];
  if (!rule) {
    return {
      maxLevel: 1,
      damagePerLevel: 1,
      rangePerLevel: 1,
      fireRatePerLevel: 1,
      iconScalePerLevel: 1
    };
  }
  return rule;
}

function getTowerMaxLevel(towerId) {
  return Math.max(1, getTowerLevelRule(towerId).maxLevel || 1);
}

function createTowerInstance(def, owner = "player", level = 1) {
  const upgradeMultiplier = owner === "player"
    ? Math.pow(TOWER_UPGRADE_MULTIPLIER, state.playerTowerUpgrades[def.id] || 0)
    : 1;
  const levelRule = getTowerLevelRule(def.id);
  const safeLevel = clamp(Math.floor(level), 1, getTowerMaxLevel(def.id));
  const levelSteps = safeLevel - 1;
  const levelDamageMultiplier = Math.pow(levelRule.damagePerLevel, levelSteps);
  const levelRangeMultiplier = Math.pow(levelRule.rangePerLevel, levelSteps);
  const levelFireRateMultiplier = Math.pow(levelRule.fireRatePerLevel, levelSteps);
  const iconScale = Math.pow(levelRule.iconScalePerLevel, levelSteps);
  const slowDurationPerLevel = levelRule.slowDurationPerLevel || 1;
  const shrapnelDamagePerLevel = levelRule.shrapnelDamagePerLevel || 1;
  const poisonDotPerLevel = levelRule.poisonDotPerLevel || 1;
  const slowDuration = def.id === "yellow"
    ? 1.2 * Math.pow(slowDurationPerLevel, levelSteps)
    : 0;
  const shrapnelDamageMultiplier = def.id === "red"
    ? Math.pow(shrapnelDamagePerLevel, levelSteps)
    : 1;
  const poisonDotMultiplier = def.id === "green"
    ? Math.pow(poisonDotPerLevel, levelSteps)
    : 1;
  const maxTargetsByLevel = levelRule.maxTargetsByLevel || null;
  const scaledMaxTargets = maxTargetsByLevel && Number.isFinite(maxTargetsByLevel[safeLevel])
    ? maxTargetsByLevel[safeLevel]
    : Math.max(1, def.maxTargets || 1);
  const coneDegrees = Number.isFinite(def.coneDegrees) ? def.coneDegrees : BASE_TOWER_CONE_DEGREES;
  return {
    ...def,
    level: safeLevel,
    iconScale,
    slowDuration,
    shrapnelDamageMultiplier,
    poisonDotMultiplier,
    damage: def.damage * upgradeMultiplier * levelDamageMultiplier,
    range: def.range * upgradeMultiplier * levelRangeMultiplier,
    fireRate: def.fireRate / (upgradeMultiplier * levelFireRateMultiplier),
    cooldown: 0,
    coneDegrees,
    coneHalfAngleRad: (coneDegrees * Math.PI) / 360,
    coneHalfAngleCos: Math.cos((coneDegrees * Math.PI) / 360),
    maxTargets: Math.max(1, scaledMaxTargets)
  };
}

function towerPowerScore(tower) {
  if (!tower) {
    return 0;
  }
  return tower.damage * tower.range / tower.fireRate;
}

function resetMatch() {
  _battleResolving = false;
  state.waveNumber = 1;
  state.completedRounds = 0;
  state.phase = "banner";
  state.phaseTimer = PREP_SECONDS;
  state.playerMana = 9;
  state.aiMana = 9;
  state.playerScore = 0;
  state.aiScore = 0;
  state.gameOver = false;
  state.paused = false;
  state.winnerText = "";
  state.playerTowers = [null, null, null, null, null];
  state.aiTowers = [null, null, null, null, null];
  state.playerQueue = [];
  state.aiQueue = [];
  state.playerQueueCounts = {};
  state.attackersPlayer = [];
  state.attackersAI = [];
  state.projectiles = [];
  state.fireBursts = [];
  state.yellowLeaps = [];
  state.towerFlashes = [];
  state.towerFireAnimations = [];
  state.deathParticles = [];
  state.deathEffects = [];
  state.nextUnitId = 1;
  state.nextProjectileId = 1;
  state.nextFireBurstId = 1;
  state.aiDraftDone = false;
  state.animationClock = 0;
  state.roundBannerTimer = ROUND_BANNER_SECONDS;
  state.roundBannerText = "Round 1";
  state.battleSkipUsedThisRound = false;
  state.shopSelectionType = "attacker";
  state.shopSelectionId = attackerDefs[0].id;
  state.matchWinner = "";
  state.hasActiveMatch = true;
  state.matchSummary = null;
  state.matchStats = createEmptyMatchStats();
  state.playerTowerUpgrades = Object.fromEntries(towerDefs.map((tower) => [tower.id, 0]));
  state.playerAttackerUpgrades = Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, 0]));
  state.matchUsage = {
    player: {
      towers: Object.fromEntries(towerDefs.map((tower) => [tower.id, false])),
      attackers: Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, false]))
    },
    ai: {
      towers: Object.fromEntries(towerDefs.map((tower) => [tower.id, false])),
      attackers: Object.fromEntries(attackerDefs.map((attacker) => [attacker.id, false]))
    }
  };
  state.soundCooldowns.violet = 0;
  state.soundCooldowns.yellow = 0;
  state.soundCooldowns.red = 0;
  state.soundCooldowns.green = 0;
  state.soundCooldowns.blue = 0;
  state.roundManaBonusPending.player = 0;
  state.roundManaBonusPending.ai = 0;
  state._aiFanSeeds = [];
  pendingGauntletReturn = null;
  state.aiStrategyOverride = "";

  previousTime = performance.now();
  updateStatus("Round 1 coming up.");
  refreshAllUI();
  syncPauseButtons();
}

function startNewMatch(options = {}) {
  clearSavedMatchState();
  resetMatch();
  state.gauntletRun = options.gauntlet
    ? { stageIndex: clamp(Math.floor(Number(options.stageIndex) || 0), 0, GAUNTLET_STAGES.length - 1) }
    : null;
  state.aiDifficultyOverride = options.difficulty || "";
  state.aiStrategyOverride = options.strategy || "";
  state.paused = false;
  setScreen("game");
  lockLandscapeOrientation();
  playCurrentMusicTrack();
  refreshAllUI();
}

function startGauntletChallenge() {
  const stageIndex = clamp(gauntletProgress.unlockedStage, 0, GAUNTLET_STAGES.length - 1);
  const stage = getGauntletStage(stageIndex);
  startNewMatch({
    gauntlet: true,
    stageIndex,
    difficulty: stage.difficulty,
    strategy: stage.strategy
  });
  updateStatus(`Gauntlet battle ${stageIndex + 1}.`);
}

window.setScreen = setScreen;
window.startNewMatch = startNewMatch;
window.startGauntletChallenge = startGauntletChallenge;

function createTowerSlots() {
  enemySlotsEl.innerHTML = "";
  playerSlotsEl.innerHTML = "";

  for (let i = 0; i < 5; i += 1) {
    const enemySlot = document.createElement("div");
    enemySlot.className = "tower-slot enemy";
    enemySlot.dataset.slotIndex = String(i);
    enemySlot.style.left = `${slotPosAI[i].x * 100}%`;
    enemySlot.style.top = `${slotPosAI[i].y * 100}%`;
    enemySlot.style.zIndex = i < 2 ? "5" : "4";
    enemySlotsEl.appendChild(enemySlot);

    const playerSlot = document.createElement("div");
    playerSlot.className = "tower-slot player";
    playerSlot.dataset.slotIndex = String(i);
    playerSlot.style.left = `${slotPosPlayer[i].x * 100}%`;
    playerSlot.style.top = `${slotPosPlayer[i].y * 100}%`;
    playerSlot.style.zIndex = i < 2 ? "4" : "5";

    playerSlot.addEventListener("dragover", (event) => {
      if (!isPlayerInputAllowed()) {
        return;
      }
      event.preventDefault();
      playerSlot.classList.add("over");
    });

    playerSlot.addEventListener("dragleave", () => {
      playerSlot.classList.remove("over");
    });

    playerSlot.addEventListener("drop", (event) => {
      playerSlot.classList.remove("over");
      if (!isPlayerInputAllowed()) {
        return;
      }

      const payload = event.dataTransfer.getData("text/plain") || activeDragPayload;
      if (!payload.startsWith("tower:")) {
        return;
      }

      event.preventDefault();
      const towerId = payload.split(":")[1];
      placePlayerTower(i, towerId);
      clearSelectedTower();
    });

    playerSlot.addEventListener("click", () => {
      if (!isPlayerInputAllowed() || !selectedTowerId) {
        return;
      }
      placePlayerTower(i, selectedTowerId);
    });

    playerSlotsEl.appendChild(playerSlot);
  }
}

function createCards() {
  towerPanelEl.innerHTML = "";
  attackerPanelEl.innerHTML = "";

  for (const tower of towerDefs.slice().reverse()) {
    const card = document.createElement("div");
    card.className = "card tower";
    card.draggable = !prefersTouchInput;
    card.dataset.towerId = tower.id;
    card.dataset.cost = String(tower.cost);
    card.innerHTML = `
      <img class="tower-icon-card" src="${towerSpritePaths[tower.id]}" alt="${tower.name} tower" />
      <span class="tower-cost">${tower.cost}</span>
    `;
    if (!prefersTouchInput) {
      card.addEventListener("dragstart", (event) => {
        const payload = `tower:${tower.id}`;
        activeDragPayload = payload;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", payload);
      });
      card.addEventListener("dragend", () => {
        activeDragPayload = "";
      });
    }
    if (prefersTouchInput) {
      card.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch" || state.phase === "shop" || !isPlayerInputAllowed()) {
          return;
        }
        startTouchDrag(event, `tower:${tower.id}`, "tower");
      });
    }
    card.addEventListener("click", () => onTowerCardActivated(tower));
    towerPanelEl.appendChild(card);
  }

  for (const attacker of attackerDefs) {
    const card = document.createElement("div");
    card.className = "card attacker";
    card.draggable = !prefersTouchInput;
    card.dataset.attackerId = attacker.id;
    card.dataset.cost = String(attacker.cost);
    const spriteCfg = attackerSpriteConfig[attacker.id];
    const iconPath = attackerIconPaths[attacker.id];
    if (spriteCfg && !iconPath) {
      card.innerHTML = `
        <span class="attacker-icon-card attacker-sprite-preview" style="--sprite-url: url('${spriteCfg.path}'); --sprite-frames: ${spriteCfg.frames};" role="img" aria-label="${attacker.name}"></span>
        <span class="attacker-cost">${attacker.cost}</span>
      `;
    } else if (spriteCfg) {
      card.innerHTML = `
        <img class="attacker-icon-card" src="${iconPath || spriteCfg.path}" alt="${attacker.name}" />
        <span class="attacker-cost">${attacker.cost}</span>
      `;
    } else {
      card.innerHTML = `
        <div class="shape" style="background:${attacker.color}"></div>
        <span class="attacker-cost">${attacker.cost}</span>
      `;
    }
    if (!prefersTouchInput) {
      card.addEventListener("dragstart", (event) => {
        const payload = `attacker:${attacker.id}`;
        activeDragPayload = payload;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", payload);
      });
      card.addEventListener("dragend", () => {
        activeDragPayload = "";
      });
    }
    if (prefersTouchInput) {
      card.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch" || state.phase === "shop" || !isPlayerInputAllowed()) {
          return;
        }
        startTouchDrag(event, `attacker:${attacker.id}`, "attacker");
      });
    }
    card.addEventListener("click", () => onAttackerCardActivated(attacker));
    attackerPanelEl.appendChild(card);
  }
}

function startTouchDrag(event, payload, kind) {
  if (touchDragState || !isPlayerInputAllowed()) {
    return;
  }

  const sourceCard = event.currentTarget;
  const sourceRect = sourceCard.getBoundingClientRect();
  const ghostEl = sourceCard.cloneNode(true);
  ghostEl.style.position = "fixed";
  ghostEl.style.left = `${sourceRect.left}px`;
  ghostEl.style.top = `${sourceRect.top}px`;
  ghostEl.style.width = `${sourceRect.width}px`;
  ghostEl.style.height = `${sourceRect.height}px`;
  ghostEl.style.opacity = "0.8";
  ghostEl.style.pointerEvents = "none";
  ghostEl.style.zIndex = "9999";
  ghostEl.style.transform = "scale(0.96)";
  ghostEl.style.boxShadow = "0 10px 20px rgba(2, 6, 23, 0.4)";
  document.body.appendChild(ghostEl);

  touchDragState = {
    pointerId: event.pointerId,
    payload,
    kind,
    ghostEl
  };
  activeDragPayload = payload;

  updateTouchDragGhost(event.clientX, event.clientY);
  document.addEventListener("pointermove", onTouchDragMove, { passive: false });
  document.addEventListener("pointerup", onTouchDragEnd, { passive: false });
  document.addEventListener("pointercancel", onTouchDragCancel, { passive: false });
}

function updateTouchDragGhost(clientX, clientY) {
  if (!touchDragState?.ghostEl) {
    return;
  }
  const ghostRect = touchDragState.ghostEl.getBoundingClientRect();
  touchDragState.ghostEl.style.left = `${Math.round(clientX - ghostRect.width / 2)}px`;
  touchDragState.ghostEl.style.top = `${Math.round(clientY - ghostRect.height / 2)}px`;
}

function clearTouchDragHighlights() {
  playerSlotsEl.querySelectorAll(".tower-slot.over").forEach((slot) => slot.classList.remove("over"));
}

function onTouchDragMove(event) {
  if (!touchDragState || event.pointerId !== touchDragState.pointerId) {
    return;
  }
  event.preventDefault();
  updateTouchDragGhost(event.clientX, event.clientY);

  if (touchDragState.kind !== "tower") {
    return;
  }
  clearTouchDragHighlights();
  const slotEl = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tower-slot.player");
  if (slotEl && isPlayerInputAllowed()) {
    slotEl.classList.add("over");
  }
}

function endTouchDragInternal(clientX, clientY, shouldApplyDrop) {
  if (!touchDragState) {
    return;
  }

  if (touchDragState.ghostEl?.parentNode) {
    touchDragState.ghostEl.parentNode.removeChild(touchDragState.ghostEl);
  }
  clearTouchDragHighlights();

  if (shouldApplyDrop && isPlayerInputAllowed()) {
    if (touchDragState.kind === "tower" && touchDragState.payload.startsWith("tower:")) {
      const slotEl = document.elementFromPoint(clientX, clientY)?.closest(".tower-slot.player");
      if (slotEl) {
        const slotIndex = Number(slotEl.dataset.slotIndex);
        const towerId = touchDragState.payload.split(":")[1];
        if (Number.isInteger(slotIndex)) {
          placePlayerTower(slotIndex, towerId);
        }
      }
    } else if (touchDragState.kind === "attacker" && touchDragState.payload.startsWith("attacker:")) {
      const dropInsideArena = !!document.elementFromPoint(clientX, clientY)?.closest("#arena-drop-zone");
      if (dropInsideArena) {
        const attackerId = touchDragState.payload.split(":")[1];
        queuePlayerAttacker(attackerId);
      }
    }
  }

  touchDragState = null;
  activeDragPayload = "";
  document.removeEventListener("pointermove", onTouchDragMove);
  document.removeEventListener("pointerup", onTouchDragEnd);
  document.removeEventListener("pointercancel", onTouchDragCancel);
}

function onTouchDragEnd(event) {
  if (!touchDragState || event.pointerId !== touchDragState.pointerId) {
    return;
  }
  event.preventDefault();
  endTouchDragInternal(event.clientX, event.clientY, true);
}

function onTouchDragCancel(event) {
  if (!touchDragState || event.pointerId !== touchDragState.pointerId) {
    return;
  }
  event.preventDefault();
  endTouchDragInternal(event.clientX, event.clientY, false);
}

function isPlayerInputAllowed() {
  return state.screen === "game" && !state.gameOver && state.phase === "prep";
}

function placePlayerTower(slotIndex, towerId) {
  const towerDef = towerDefs.find((item) => item.id === towerId);
  if (!towerDef) {
    triggerPlacementHaptic("error");
    return;
  }

  const existingTower = state.playerTowers[slotIndex];
  if (existingTower && existingTower.id === towerDef.id && existingTower.level >= getTowerMaxLevel(towerDef.id)) {
    updateStatus(`${towerDef.name} tower is already at max level in slot ${slotIndex + 1}.`);
    triggerPlacementHaptic("error");
    return;
  }

  if (state.playerMana < towerDef.cost) {
    updateStatus("Not enough mana for that tower.");
    triggerPlacementHaptic("error");
    return;
  }

  state.playerMana -= towerDef.cost;
  const canUpgradeExisting = !!existingTower
    && existingTower.id === towerDef.id
    && existingTower.level < getTowerMaxLevel(towerDef.id);

  if (canUpgradeExisting) {
    const nextLevel = existingTower.level + 1;
    state.playerTowers[slotIndex] = createTowerInstance(towerDef, "player", nextLevel);
    updateStatus(`Upgraded ${towerDef.name} tower to level ${nextLevel} in slot ${slotIndex + 1}.`);
  } else if (existingTower) {
    state.playerTowers[slotIndex] = createTowerInstance(towerDef, "player", 1);
    updateStatus(`Replaced ${existingTower.name} tower with ${towerDef.name} tower in slot ${slotIndex + 1}.`);
  } else {
    state.playerTowers[slotIndex] = createTowerInstance(towerDef, "player", 1);
    updateStatus(`Placed ${towerDef.name} tower in slot ${slotIndex + 1}.`);
  }
  state.matchStats.towersPlaced += 1;
  markMatchUsage("towers", towerId, "player");
  triggerPlacementHaptic("impact");
  clearSelectedTower();
  refreshAllUI();
}

function canPlaceSelectedTowerInSlot(slotIndex) {
  if (!selectedTowerId || !isPlayerInputAllowed()) {
    return false;
  }
  const towerDef = towerDefs.find((item) => item.id === selectedTowerId);
  if (!towerDef || state.playerMana < towerDef.cost) {
    return false;
  }
  const existingTower = state.playerTowers[slotIndex];
  return !existingTower
    || existingTower.id !== towerDef.id
    || existingTower.level < getTowerMaxLevel(towerDef.id);
}

function queuePlayerAttacker(attackerId) {
  const attacker = attackerDefs.find((item) => item.id === attackerId);
  if (!attacker) {
    triggerPlacementHaptic("error");
    return;
  }
  if (state.playerMana < attacker.cost) {
    updateStatus("Not enough mana for that attacker.");
    triggerPlacementHaptic("error");
    return;
  }

  state.playerMana -= attacker.cost;
  state.playerQueue.push(attacker.id);
  state.playerQueueCounts[attacker.id] = (state.playerQueueCounts[attacker.id] || 0) + 1;
  state.matchStats.attackersQueued += 1;
  markMatchUsage("attackers", attacker.id, "player");
  updateStatus(`${attacker.name} added to next wave queue.`);
  refreshAllUI();
}

function setupArenaDrop() {
  arenaDropZoneEl.addEventListener("dragover", (event) => {
    if (!isPlayerInputAllowed()) {
      return;
    }
    event.preventDefault();
  });

  arenaDropZoneEl.addEventListener("drop", (event) => {
    if (!isPlayerInputAllowed()) {
      return;
    }
    const payload = event.dataTransfer.getData("text/plain") || activeDragPayload;
    if (!payload.startsWith("attacker:")) {
      return;
    }
    event.preventDefault();
    const attackerId = payload.split(":")[1];
    queuePlayerAttacker(attackerId);
  });
}

function clearSelectedTower() {
  selectedTowerId = null;
}

function refreshCardStates() {
  const towerCards = towerPanelEl.querySelectorAll(".card.tower");
  const attackerCards = attackerPanelEl.querySelectorAll(".card.attacker");

  towerCards.forEach((card) => {
    const cost = Number(card.dataset.cost);
    const towerId = card.dataset.towerId;
    const upgraded = (state.playerTowerUpgrades[towerId] || 0) > 0;
    const inShop = state.phase === "shop";
    card.classList.toggle("disabled", !inShop && (!isPlayerInputAllowed() || state.playerMana < cost));
    card.classList.toggle("selected", inShop
      ? state.shopSelectionType === "tower" && state.shopSelectionId === towerId
      : selectedTowerId === towerId);
    card.classList.toggle("shop-mode", inShop);
    card.classList.toggle("upgraded", upgraded);
  });

  attackerCards.forEach((card) => {
    const cost = Number(card.dataset.cost);
    const attackerId = card.dataset.attackerId;
    const queued = state.playerQueueCounts[attackerId] || 0;
    const upgraded = (state.playerAttackerUpgrades[attackerId] || 0) > 0;
    const inShop = state.phase === "shop";
    card.classList.toggle("disabled", !inShop && (!isPlayerInputAllowed() || state.playerMana < cost));
    card.classList.toggle("queued", !inShop && queued > 0);
    card.classList.toggle("selected", inShop && state.shopSelectionId === attackerId);
    card.classList.toggle("shop-mode", inShop);
    card.classList.toggle("upgraded", upgraded);
    card.dataset.queued = queued > 0 ? `x${queued}` : "";
  });
  updatePixiCardStates();
}

function refreshTowerSlots() {
  const enemySlots = enemySlotsEl.querySelectorAll(".tower-slot");
  const playerSlots = playerSlotsEl.querySelectorAll(".tower-slot");

  const towerMarkup = (tower, owner = "player") => {
    if (!tower) {
      return "";
    }
    const safeLevel = Math.max(1, Number(tower.level) || 1);
    const side = getOwnerVisualSide(owner);
    const towerPath = towerSpritePathSets[side]?.[tower.id] || towerSpritePaths[tower.id];
    return `<div class="slot-tower">
      <img class="tower-icon-slot level-${safeLevel}" src="${towerPath}" alt="${tower.name} tower" />
    </div>`;
  };

  for (let i = 0; i < 5; i += 1) {
    const playerSlot = playerSlots[i];
    const playerTower = state.playerTowers[i];
    playerSlot.innerHTML = playerTower ? towerMarkup(playerTower, "player") : `<span>${i + 1}</span>`;
    playerSlot.classList.toggle("filled", !!playerTower);
    playerSlot.classList.toggle("placement-target", canPlaceSelectedTowerInSlot(i));

    const enemySlot = enemySlots[i];
    const aiTower = state.aiTowers[i];
    enemySlot.innerHTML = aiTower ? towerMarkup(aiTower, "ai") : "";
    enemySlot.classList.toggle("filled", !!aiTower);
  }
}

function syncPauseButtons() {
  const label = state.paused ? "Resume" : "Pause";
  pauseBtnEl.textContent = label;
  if (floatingPauseBtnEl) {
    floatingPauseBtnEl.textContent = label;
    floatingPauseBtnEl.hidden = state.screen !== "game" || state.gameOver || multiplayerRole !== null;
  }
}

function refreshHUD() {
  playerScoreEl.textContent = String(state.playerScore);
  aiScoreEl.textContent = String(state.aiScore);
  waveNumberEl.textContent = String(state.waveNumber);
  playerManaEl.textContent = String(state.playerMana);
  if (shopManaValueEl) shopManaValueEl.textContent = String(state.playerMana);
  if (state.phase === "prep") {
    phaseLabelEl.textContent = "Prep";
  } else if (state.phase === "battle") {
    phaseLabelEl.textContent = "Battle";
  } else if (state.phase === "shop") {
    phaseLabelEl.textContent = "Shop";
  } else if (state.phase === "waiting") {
    phaseLabelEl.textContent = "Wait";
  } else {
    phaseLabelEl.textContent = "Round";
  }
  phaseLabelEl.classList.toggle("prep", state.phase === "prep");
  phaseLabelEl.classList.toggle("battle", state.phase === "battle");
  phaseTimerEl.textContent = state.phase === "prep" ? state.phaseTimer.toFixed(1) : "--";

  if (state.phase === "prep") {
    const ratio = clamp(state.phaseTimer / PREP_SECONDS, 0, 1);
    waveProgressFillEl.style.transform = `scaleY(${ratio})`;
  } else {
    waveProgressFillEl.style.transform = "scaleY(1)";
  }

  const canSkipToBattle = !state.gameOver && !state.paused && state.phase === "prep" && !state.battleSkipUsedThisRound;
  battleSkipBtnEl.disabled = !canSkipToBattle;
  battleSkipBtnEl.hidden = state.screen !== "game" || !canSkipToBattle;
  if (readyBtnEl) {
    readyBtnEl.disabled = !canSkipToBattle;
    readyBtnEl.hidden = state.screen !== "game" || !canSkipToBattle;
    readyBtnEl.textContent = multiplayerRole !== null && state.battleSkipUsedThisRound ? "Waiting" : "Ready";
  }
  // Pause is disabled in multiplayer — both players cannot pause a live match
  pauseBtnEl.hidden = multiplayerRole !== null;
  syncPauseButtons();
}

function refreshShopUI() {
  // Between-round upgrade flow is disabled for faster-paced matches.
  shopOverlayEl.classList.add("hidden");
}

function refreshMatchEndOverlay() {
  const showOverlay = state.gameOver;
  matchEndOverlayEl.classList.toggle("hidden", !showOverlay);
  if (!showOverlay) {
    return;
  }
  const summary = state.matchSummary || {
    title: "Match Complete",
    copy: state.winnerText,
    stats: [],
    nextGoal: getNextGoalText(getProfileStats())
  };
  const isGauntletResult = Boolean(pendingGauntletReturn);
  matchResultTitleEl.textContent = summary.title;
  matchResultCopyEl.textContent = summary.copy;
  matchResultEyebrowEl?.classList.toggle("hidden", isGauntletResult);
  matchResultCopyEl.classList.toggle("hidden", isGauntletResult);
  matchSummaryGridEl.innerHTML = summary.stats.map((item) => `
    <div class="match-stat">
      <strong>${item.value}</strong>
      <span>${item.label}</span>
    </div>
  `).join("");
  matchNextGoalEl.textContent = summary.nextGoal;
  const awaitingGauntletContinue = isGauntletResult;
  matchContinueBtnEl?.classList.toggle("hidden", !awaitingGauntletContinue);
  matchPlayAgainBtnEl?.classList.toggle("hidden", awaitingGauntletContinue);
  matchHomeBtnEl?.classList.toggle("hidden", awaitingGauntletContinue);
}

function refreshAllUI() {
  refreshHUD();
  refreshTowerSlots();
  refreshCardStates();
  refreshShopUI();
  refreshMatchEndOverlay();
  refreshMetaUI();
}

function registerNativeAppLifecycle() {
  const appPlugin = getCapacitorPlugin("App");
  if (!appPlugin?.addListener) {
    return;
  }

  appPlugin.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      wasPausedBeforeBackground = state.paused;
      if (state.hasActiveMatch && !state.gameOver) {
        state.paused = true;
        saveMatchStateNow();
        queueStatsSave();
      }
      pauseMusicForMenu();
      return;
    }

    previousTime = performance.now();
    if (state.hasActiveMatch && !state.gameOver) {
      state.paused = wasPausedBeforeBackground;
    }
    updateViewportHeight();
    resizeBattlefieldFrame();
    lockLandscapeOrientation();
    resumeAudioAfterBackground();
    refreshAllUI();
  });
}

function updateStatus(text) {
  statusTextEl.textContent = text;
}

function makeAttacker(owner, attackerId, sequenceOffset, fanSeedOverride) {
  const def = getAttackerDef(attackerId);
  const id = state.nextUnitId;
  state.nextUnitId += 1;
  // In multiplayer, opponent units use precomputed fanSeeds for determinism
  const fanSeed = (fanSeedOverride !== undefined) ? fanSeedOverride : (Math.random() * 2 - 1);
  const upgradeMultiplier = owner === "player"
    ? Math.pow(ATTACKER_UPGRADE_MULTIPLIER, state.playerAttackerUpgrades[attackerId] || 0)
    : Math.pow(ATTACKER_UPGRADE_MULTIPLIER, opponentAttackerUpgrades[attackerId] || 0);

  return {
    id,
    owner,
    defId: def.id,
    hp: def.hp * upgradeMultiplier,
    maxHp: def.hp * upgradeMultiplier,
    baseSpeed: def.speed * upgradeMultiplier,
    speed: def.speed * upgradeMultiplier,
    color: def.color,
    progress: -sequenceOffset,
    fanSeed,
    slowTimer: 0,
    poisonTimer: 0,
    poisonTicksRemaining: 0,
    poisonTickInterval: 1,
    poisonTickTimer: 0,
    poisonBaseDamage: 0,
    poisonSourceOwner: null,
    shootCooldown: 0,
    isDefeated: false
  };
}

function buildSpawnOffsets(queue) {
  const offsets = [];
  let cumulative = 0;
  for (let i = 0; i < queue.length; i += 1) {
    offsets.push(cumulative);
    const baseGap = 0.035;
    const leadGapBonus = queue[i] === "tank" ? 0.11 : 0;
    cumulative += baseGap + leadGapBonus;
  }
  return offsets;
}

function launchWave() {
  // In multiplayer: hand off to lobby.js to sync with opponent first
  if (multiplayerRole !== null && window.Lobby) {
    window.Lobby.submitPrepPhaseData();
    return;
  }
  finalizeAIMovesBeforeBattle();
  _doLaunchWave();
}

// Internal battle launch — called directly in singleplayer, or by lobby.js
// after both players have submitted their prep data.
function _doLaunchWave() {
  state.phase = "battle";
  state.aiDraftDone = false;
  clearSelectedTower();

  const aiFanSeeds = state._aiFanSeeds || [];
  const playerOffsets = buildSpawnOffsets(state.playerQueue);
  const aiOffsets = buildSpawnOffsets(state.aiQueue);
  state.attackersPlayer = state.playerQueue.map((attackerId, idx) => makeAttacker("player", attackerId, playerOffsets[idx]));
  state.attackersAI     = state.aiQueue.map((attackerId, idx)    => makeAttacker("ai", attackerId, aiOffsets[idx], aiFanSeeds[idx]));
  state._aiFanSeeds = [];

  state.projectiles = [];
  state.fireBursts = [];
  state.towerFlashes = [];
  state.towerFireAnimations = [];
  state.deathParticles = [];
  state.deathEffects = [];

  state.playerQueue = [];
  state.aiQueue = [];
  state.playerQueueCounts = {};

  updateStatus("Wave launched. Towers firing.");
  refreshAllUI();
}

window.addEventListener("resize", updateViewportHeight);
window.addEventListener("orientationchange", () => {
  updateViewportHeight();
  lockLandscapeOrientation();
});
if (window.visualViewport?.addEventListener) {
  window.visualViewport.addEventListener("resize", updateViewportHeight);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    lastAppHiddenAt = performance.now();
    wasPausedBeforeBackground = state.paused;
    if (state.hasActiveMatch && !state.gameOver) {
      state.paused = true;
      saveMatchStateNow();
      queueStatsSave();
    }
    pauseMusicForMenu();
    return;
  }

  updateViewportHeight();
  lockLandscapeOrientation();
  previousTime = performance.now();
  if (state.hasActiveMatch && !state.gameOver) {
    state.paused = wasPausedBeforeBackground;
    saveMatchStateNow();
  }
  resumeAudioAfterBackground();
});
document.addEventListener("touchmove", preventBrowserGestures, { passive: false });
document.addEventListener("contextmenu", preventBrowserGestures);
document.addEventListener("pointerdown", unlockAudioFromGesture, { passive: true });

function beginPrepPhase() {
  clearTowerFireAnimations();
  state.phase = "prep";
  state.phaseTimer = PREP_SECONDS;
  state.aiDraftDone = false;
  clearSelectedTower();

  if (multiplayerRole !== null) {
    // Opponent IS the AI — suppress local AI draft; aiDraftDone stays false
    // until set true below so updateGame() doesn't try to run prepareAIMoves()
    state.aiDraftDone = true;
  } else {
    prepareAIMoves();
  }
  refreshAllUI();
  updateStatus(`Round ${state.waveNumber} prep. Queue attackers and place towers.`);
}

function beginRoundBanner() {
  clearTowerFireAnimations();
  state.phase = "banner";
  state.roundBannerTimer = ROUND_BANNER_SECONDS;
  state.roundBannerText = `Round ${state.waveNumber}`;
  state.battleSkipUsedThisRound = false;
  clearSelectedTower();
  refreshAllUI();
  updateStatus(`${state.roundBannerText} is about to begin.`);
}

function openRoundShop() {
  const gain = 9 + state.waveNumber;
  state.playerMana = clamp(state.playerMana + gain, 0, MANA_CAP);
  state.aiMana = clamp(state.aiMana + gain + getAIManaBonusPerRound(), 0, MANA_CAP);
  state.roundManaBonusPending.player = 0;
  state.roundManaBonusPending.ai = 0;
  state.waveNumber += 1;
  beginRoundBanner();
  updateStatus(`Round ${state.waveNumber} begins soon.`);
}

function buildMatchSummary() {
  const margin = state.playerScore - state.aiScore;
  const profile = getProfileStats();
  const opponentLabel = multiplayerRole !== null ? multiplayerOpponentName : "AI";
  let title = "Battle Report";
  let copy = `Final score ${state.playerScore} to ${state.aiScore}.`;

  if (state.matchWinner === "player") {
    title = "Victory";
    copy = margin > 1
      ? `You secured the lane ${state.playerScore} to ${state.aiScore} and closed the match with room to spare.`
      : `You edged out ${opponentLabel} ${state.playerScore} to ${state.aiScore} in a tight final round.`;
  } else if (state.matchWinner === "ai") {
    title = "Defeat";
    copy = `${opponentLabel} held the lane ${state.aiScore} to ${state.playerScore}. Review your records, then adjust your next build.`;
  } else {
    title = "Draw";
    copy = `Both commanders finished level at ${state.playerScore}. A sharper lane plan can swing the rematch.`;
  }

  return {
    title,
    copy,
    stats: [
      { label: "Scoreline", value: `${state.playerScore}-${state.aiScore}` },
      { label: "Towers Placed", value: state.matchStats.towersPlaced },
      { label: "Attackers Queued", value: state.matchStats.attackersQueued },
      { label: "Career Matches", value: profile.matchesPlayed }
    ],
    nextGoal: getNextGoalText(profile)
  };
}

function finishMatch() {
  clearTowerFireAnimations();
  fadeOutMatchMusic(true);
  state.phase = "gameover";
  state.gameOver = true;
  if (state.playerScore === state.aiScore) {
    state.matchWinner = "draw";
    state.winnerText = "Draw match.";
  } else if (state.playerScore > state.aiScore) {
    state.matchWinner = "player";
    state.winnerText = "Player wins the match.";
  } else {
    state.matchWinner = "ai";
    state.winnerText = "AI wins the match.";
  }

  const profile = getProfileStats();
  profile.matchesPlayed += 1;
  if (state.matchWinner === "player") {
    profile.wins += 1;
    profile.currentWinStreak += 1;
    profile.bestWinStreak = Math.max(profile.bestWinStreak, profile.currentWinStreak);
  } else if (state.matchWinner === "ai") {
    profile.losses += 1;
    profile.currentWinStreak = 0;
  } else {
    profile.draws += 1;
    profile.currentWinStreak = 0;
  }

  commitMatchUsageStats();
  queueStatsSave();
  state.hasActiveMatch = false;
  const gauntletRun = state.gauntletRun;
  const isGauntletMatch = Boolean(gauntletRun);
  const isGauntletVictory = Boolean(gauntletRun && state.matchWinner === "player");
  if (isGauntletMatch) {
    recordCurrentGauntletResult(isGauntletVictory);
  }
  const gauntletAdvanced = isGauntletVictory && advanceGauntletAfterVictory(gauntletRun.stageIndex);
  state.matchSummary = buildMatchSummary();
  if (gauntletRun) {
    state.matchSummary.nextGoal = gauntletAdvanced
      ? `Gauntlet advanced from battle ${gauntletRun.stageIndex + 1} to battle ${gauntletProgress.unlockedStage + 1}.`
      : state.matchWinner === "player"
        ? `Battle ${gauntletRun.stageIndex + 1} is cleared.`
        : `Gauntlet holds at battle ${gauntletRun.stageIndex + 1}.`;
    state.matchSummary.stats = [
      ...state.matchSummary.stats.map((item) => item.label === "Career Matches"
        ? { label: "Gauntlet Progress", value: `${gauntletProgress.completedWins} of ${GAUNTLET_STAGES.length}` }
        : item),
      { label: "Current Gauntlet Win %", value: `${getCurrentGauntletWinRate()}%` }
    ];
  }
  pendingGauntletReturn = isGauntletMatch
    ? {
        fromStageIndex: gauntletRun.stageIndex,
        toStageIndex: gauntletProgress.unlockedStage,
        advanced: gauntletAdvanced
      }
    : null;
  if (isGauntletVictory) {
    playGauntletVictorySfx();
  }
  state.gauntletRun = null;
  state.aiDifficultyOverride = "";
  state.aiStrategyOverride = "";
  clearSavedMatchState();
  updateStatus(isGauntletMatch
    ? `${state.winnerText} Review the battle report, then continue the gauntlet.`
    : `${state.winnerText} Review the battle report or start a new match.`);
  refreshAllUI();
}

function continueFromMatchResults() {
  if (!pendingGauntletReturn) {
    return;
  }
  pendingGauntletReturn = null;
  setScreen("gauntlet");
  refreshAllUI();
}
window.continueFromMatchResults = continueFromMatchResults;

let _battleResolving = false;
function onBattleFinished() {
  if (_battleResolving) {
    return;
  }
  _battleResolving = true;
  clearTowerFireAnimations();
  const clearFlag = () => { _battleResolving = false; };
  if (multiplayerRole !== null && window.Lobby) {
    Promise.resolve(window.Lobby.onMultiplayerBattleFinished()).finally(clearFlag);
    return;
  }
  try {
    state.completedRounds = clamp((Number(state.completedRounds) || 0) + 1, 0, MAX_ROUNDS);
    if (state.completedRounds >= MAX_ROUNDS) {
      finishMatch();
      return;
    }
    openRoundShop();
  } finally {
    clearFlag();
  }
}

function applyTowerUpgradeToPlacedTowers(towerId) {
  for (let i = 0; i < state.playerTowers.length; i += 1) {
    const tower = state.playerTowers[i];
    if (!tower || tower.id !== towerId) {
      continue;
    }
    tower.damage *= TOWER_UPGRADE_MULTIPLIER;
    tower.range *= TOWER_UPGRADE_MULTIPLIER;
    tower.fireRate /= TOWER_UPGRADE_MULTIPLIER;
  }
}

function upgradeSelectedAttacker() {
  const attackerId = state.shopSelectionId;
  if (state.phase !== "shop") {
    return;
  }
  if ((state.playerAttackerUpgrades[attackerId] || 0) > 0) {
    updateStatus(`${getAttackerDef(attackerId).name} is already upgraded.`);
    refreshAllUI();
    return;
  }
  if (state.playerMana < SHOP_UPGRADE_COST) {
    updateStatus("Not enough mana for that upgrade.");
    triggerPlacementHaptic("error");
    refreshAllUI();
    return;
  }

  state.playerMana -= SHOP_UPGRADE_COST;
  state.playerAttackerUpgrades[attackerId] = 1;
  state.matchStats.upgradesBought += 1;
  updateStatus(`${getAttackerDef(attackerId).name} upgraded for the rest of the match.`);
  triggerPlacementHaptic("success");
  refreshAllUI();
}

function upgradeSelectedTower() {
  const towerId = state.shopSelectionId;
  if (state.phase !== "shop") {
    return;
  }
  if ((state.playerTowerUpgrades[towerId] || 0) >= MAX_TOWER_UPGRADES) {
    updateStatus(`${getTowerDef(towerId).name} is already at max level.`);
    triggerPlacementHaptic("error");
    refreshAllUI();
    return;
  }
  if (state.playerMana < TOWER_UPGRADE_COST) {
    updateStatus("Not enough mana for that upgrade.");
    triggerPlacementHaptic("error");
    refreshAllUI();
    return;
  }

  state.playerMana -= TOWER_UPGRADE_COST;
  state.playerTowerUpgrades[towerId] += 1;
  state.matchStats.upgradesBought += 1;
  applyTowerUpgradeToPlacedTowers(towerId);
  updateStatus(`${getTowerDef(towerId).name} upgraded to level ${getPlayerTowerUpgradeLevel(towerId)} for the rest of the match.`);
  triggerPlacementHaptic("success");
  refreshAllUI();
}

function totalDefenseScore(towers) {
  return towers.reduce((sum, tower) => sum + towerPowerScore(tower), 0);
}

function countPlacedTowers(towers) {
  return towers.reduce((count, tower) => count + (tower ? 1 : 0), 0);
}

function getTowerTargetFromPlan(plan, waveNumber) {
  let target = 0;
  for (const step of plan) {
    if (waveNumber >= step.round) {
      target = step.towers;
    }
  }
  return target;
}

function getAIMinTowerTarget(waveNumber) {
  const stageSettings = getAIGauntletStageSettings();
  if (stageSettings?.towerPlan) {
    return getTowerTargetFromPlan(stageSettings.towerPlan, waveNumber);
  }

  const difficulty = state.aiDifficultyOverride || gameOptions.difficulty;
  const defaultPlans = {
    purple: [{ round: 1, towers: 1 }, { round: 5, towers: 2 }, { round: 8, towers: 3 }],
    yellow: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 6, towers: 3 }],
    red: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 8, towers: 4 }],
    green: [{ round: 1, towers: 1 }, { round: 3, towers: 2 }, { round: 5, towers: 3 }, { round: 7, towers: 4 }],
    blue: [{ round: 1, towers: 1 }, { round: 2, towers: 2 }, { round: 4, towers: 3 }, { round: 6, towers: 4 }]
  };
  return getTowerTargetFromPlan(defaultPlans[difficulty] || defaultPlans.yellow, waveNumber);
}

function countIds(ids) {
  return ids.reduce((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
}

function analyzePlayerPlan(playerDefenseScore) {
  const towerCounts = countIds(state.playerTowers.filter(Boolean).map((tower) => tower.id));
  const queuedCounts = countIds(state.playerQueue);
  const towerTotal = state.playerTowers.filter(Boolean).length;
  const queueTotal = state.playerQueue.length;
  const emptySlots = Math.max(0, state.playerTowers.length - towerTotal);
  const antiFast = (towerCounts.violet || 0) * 0.8 + (towerCounts.yellow || 0) * 1.3 + (towerCounts.blue || 0) * 0.55;
  const antiSwarm = (towerCounts.red || 0) * 1.15 + (towerCounts.yellow || 0) * 0.8 + (towerCounts.blue || 0) * 1.45;
  const antiTank = (towerCounts.red || 0) * 1.15 + (towerCounts.green || 0) * 1.45 + (towerCounts.blue || 0) * 0.8;
  const pressureDefense = Math.max(0, playerDefenseScore - 8) * 0.08;
  const fastGap = clamp(2.35 - antiFast + emptySlots * 0.35, 0, 3.2);
  const swarmGap = clamp(2.2 - antiSwarm + emptySlots * 0.3, 0, 3.2);
  const tankGap = clamp(2.35 - antiTank + pressureDefense, 0, 3.2);
  const queuedFast = (queuedCounts.runner || 0) + (queuedCounts.wisp || 0);
  const queuedSwarm = queuedCounts.imp || 0;
  const queuedHeavy = (queuedCounts.brute || 0) + (queuedCounts.tank || 0);
  const scoreDeficit = Math.max(0, state.playerScore - state.aiScore);
  const scoreLead = Math.max(0, state.aiScore - state.playerScore);

  return {
    playerDefenseScore,
    towerCounts,
    queuedCounts,
    towerTotal,
    queueTotal,
    emptySlots,
    fastGap,
    swarmGap,
    tankGap,
    weakDefense: playerDefenseScore < 6 || towerTotal <= 1,
    overbuiltDefense: playerDefenseScore > 10.5 && queueTotal <= 1,
    playerRush: queueTotal >= 4 || queuedFast + queuedSwarm >= 3,
    queuedFast,
    queuedSwarm,
    queuedHeavy,
    scoreDeficit,
    scoreLead
  };
}

function getAIAttackerCounterScore(attackerId, playerPlan) {
  const pressureBonus = playerPlan.weakDefense ? 0.75 : 0;
  const overbuildBonus = playerPlan.overbuiltDefense ? 0.45 : 0;
  const behindBonus = playerPlan.scoreDeficit * 0.16;
  const scoreById = {
    imp: playerPlan.swarmGap * 1.2 + pressureBonus + overbuildBonus + behindBonus,
    runner: playerPlan.fastGap * 1.25 + pressureBonus + behindBonus,
    brute: playerPlan.tankGap * 0.9 + overbuildBonus + playerPlan.playerDefenseScore * 0.035,
    wisp: playerPlan.fastGap * 0.65 + playerPlan.tankGap * 0.55 + behindBonus * 0.7,
    tank: playerPlan.tankGap * 1.3 + overbuildBonus + playerPlan.playerDefenseScore * 0.045
  };
  return scoreById[attackerId] || 0;
}

function getAITowerCounterScore(towerId, playerPlan) {
  const scoreById = {
    violet: playerPlan.queuedFast * 0.45 + playerPlan.queuedSwarm * 0.25 + playerPlan.playerRush * 0.35,
    yellow: playerPlan.queuedFast * 0.85 + playerPlan.queuedSwarm * 0.45 + playerPlan.playerRush * 0.55,
    red: playerPlan.queuedSwarm * 0.9 + playerPlan.queuedHeavy * 0.5,
    green: playerPlan.queuedHeavy * 0.9 + playerPlan.queueTotal * 0.18,
    blue: playerPlan.queuedSwarm * 0.75 + playerPlan.queuedFast * 0.45 + playerPlan.queueTotal * 0.22
  };
  return scoreById[towerId] || 0;
}

function rankAIAttackers(playerPlan, mana, waveNumber) {
  const difficulty = getAIDifficultySettings();
  const strategy = getAIStrategySettings();
  const stageSettings = getAIGauntletStageSettings();
  return attackerDefs
    .filter((attacker) => attacker.cost <= mana)
    .map((attacker) => {
      const hpValue = attacker.hp / attacker.cost;
      const speedValue = attacker.speed * 6;
      const strategyBias = strategy.fallbackBias?.[attacker.id] || 1;
      const stageBias = 1 + (stageSettings?.attackerBias?.[attacker.id] || 0);
      const counterValue = getAIAttackerCounterScore(attacker.id, playerPlan) * (difficulty.adaptation || 0) * strategy.counterScale;
      const earlyTankPenalty = attacker.id === "tank" && waveNumber < 7 && !(stageSettings?.attackerBias?.tank > 0.3) ? 1.4 : 0;
      return {
        attacker,
        score: (hpValue + speedValue) * strategyBias * stageBias + counterValue - attacker.cost * 0.05 - earlyTankPenalty
      };
    })
    .sort((a, b) => b.score - a.score);
}

function pickBestAITowerPlacement(mana, defenseBudget, playerPlan, waveNumber) {
  const difficulty = getAIDifficultySettings();
  const strategy = getAIStrategySettings();
  const stageSettings = getAIGauntletStageSettings();
  const usedTowerTypes = new Set();
  const towerCounts = {};
  for (const tower of state.aiTowers) {
    if (tower) {
      usedTowerTypes.add(tower.id);
      towerCounts[tower.id] = (towerCounts[tower.id] || 0) + 1;
    }
  }
  const missingTowerTypes = towerDefs
    .map((tower) => tower.id)
    .filter((towerId) => !usedTowerTypes.has(towerId));
  const maxAffordableCost = Math.min(mana, defenseBudget);
  const hasAffordableMissingTower = towerDefs.some((tower) => missingTowerTypes.includes(tower.id) && tower.cost <= maxAffordableCost);
  const forceTowerDiversity = missingTowerTypes.length > 0 && hasAffordableMissingTower;

  let best = null;
  for (let slotIndex = 0; slotIndex < state.aiTowers.length; slotIndex += 1) {
    const existing = state.aiTowers[slotIndex];
    const existingPower = towerPowerScore(existing);

    for (const candidate of towerDefs) {
      if (candidate.cost > mana || candidate.cost > defenseBudget) {
        continue;
      }
      const canUpgrade = !!existing
        && existing.id === candidate.id
        && existing.level < getTowerMaxLevel(candidate.id);
      if (forceTowerDiversity && !missingTowerTypes.includes(candidate.id) && !(difficulty.considerTowerUpgrades && canUpgrade)) {
        continue;
      }
      const nextLevel = canUpgrade ? existing.level + 1 : 1;
      if (existing && existing.id === candidate.id && !canUpgrade) {
        continue;
      }

      const candidateTower = createTowerInstance(candidate, "ai", nextLevel);
      const candidatePower = towerPowerScore(candidateTower);
      const improvement = existing ? candidatePower - existingPower : candidatePower + 0.9;
      if (existing && improvement < 0.1) {
        continue;
      }

      const diversityPenalty = (towerCounts[candidate.id] || 0) * 0.85;
      const expensiveEarlyPenalty = waveNumber <= 2 && candidate.cost >= 9 ? 1.3 : 0;
      const counterBoost = playerPlan.playerDefenseScore > 9 ? candidate.range * 2.1 : candidate.damage * 0.2;
      const playerQueueCounter = getAITowerCounterScore(candidate.id, playerPlan) * (difficulty.adaptation || 0) * strategy.counterScale;
      const emptyBonus = existing ? 0 : 0.8;
      const diversityPriority = forceTowerDiversity ? 1.35 : 0;
      const upgradeBias = canUpgrade ? 0.65 + strategy.upgradeBias : 0;
      const difficultyBias = difficulty.towerWeights[candidate.id] || 0;
      const strategyBias = strategy.towerBias?.[candidate.id] || 0;
      const stageBias = stageSettings?.towerBias?.[candidate.id] || 0;
      const value = improvement + counterBoost + playerQueueCounter + emptyBonus + diversityPriority + upgradeBias + difficultyBias + strategyBias + stageBias - diversityPenalty - candidate.cost * 0.09 - expensiveEarlyPenalty + Math.random() * difficulty.randomTowerNoise;

      if (!best || value > best.value) {
        best = { slotIndex, tower: candidate, value, nextLevel };
      }
    }
  }

  return best;
}

function chooseAIBatchPattern(playerPlan, waveNumber, mana) {
  const difficulty = getAIDifficultySettings();
  const strategy = getAIStrategySettings();
  const adaptation = difficulty.adaptation || 0;

  if (adaptation >= 0.45) {
    const ranked = rankAIAttackers(playerPlan, mana, waveNumber).map((entry) => entry.attacker.id);
    if (ranked.length > 0) {
      const preferred = ranked[0];
      const secondary = ranked[1] || preferred;
      const tertiary = ranked[2] || secondary;
      const burst = waveNumber % strategy.burstInterval === 0 || playerPlan.scoreDeficit > 0;
      return burst
        ? [preferred, secondary, preferred, tertiary, preferred, secondary, preferred]
        : [preferred, secondary, preferred, tertiary, secondary];
    }
  }

  if (difficulty.attackerPatterns?.length) {
    if (playerPlan.playerDefenseScore < 6 || waveNumber <= 2) {
      return difficulty.attackerPatterns[0];
    }
    if (playerPlan.playerDefenseScore > 10 && difficulty.attackerPatterns[2]) {
      return difficulty.attackerPatterns[2];
    }
    return difficulty.attackerPatterns[1] || difficulty.attackerPatterns[0];
  }

  if (playerPlan.playerDefenseScore < 6 || waveNumber <= 2) {
    return ["runner", "runner", "imp", "runner", "imp"];
  }
  if (playerPlan.playerDefenseScore > 10) {
    return ["tank", "brute", "wisp", "imp"];
  }
  return ["imp", "runner", "brute", "wisp", "runner"];
}

function queueAIBatch(pattern, attackBudget) {
  let spent = 0;
  let sent = 0;
  let cursor = 0;

  while (cursor < pattern.length) {
    const attacker = attackerDefs.find((item) => item.id === pattern[cursor]);
    if (!attacker) {
      cursor += 1;
      continue;
    }
    if (spent + attacker.cost > attackBudget || state.aiMana < attacker.cost) {
      cursor += 1;
      continue;
    }
    state.aiMana -= attacker.cost;
    spent += attacker.cost;
    sent += 1;
    state.aiQueue.push(attacker.id);
    markMatchUsage("attackers", attacker.id, "ai");
    cursor += 1;
  }

  return sent;
}

function chooseAIAttackerByDefense(playerPlan, mana, waveNumber) {
  const difficulty = getAIDifficultySettings();
  const strategy = getAIStrategySettings();
  const options = attackerDefs.filter((attacker) => attacker.cost <= mana);
  if (options.length === 0) {
    return null;
  }

  if ((difficulty.adaptation || 0) >= 0.45) {
    return rankAIAttackers(playerPlan, mana, waveNumber)[0]?.attacker || options[0];
  }

  for (const attackerId of difficulty.fallbackOrder || []) {
    const attacker = options.find((item) => item.id === attackerId);
    if (attacker) {
      return attacker;
    }
  }

  const pressure = playerPlan.playerDefenseScore / Math.max(1, waveNumber);
  const weightById = {
    imp: pressure < 1.8 ? 1.25 : 0.75,
    runner: pressure < 1.8 ? 1.35 : 0.8,
    brute: pressure > 2.2 ? 1.25 : 0.9,
    wisp: pressure > 2.6 ? 1.2 : 1,
    tank: pressure > 2.1 ? 1.4 : 0.85
  };

  let best = options[0];
  let bestScore = -Infinity;
  for (const attacker of options) {
    const hpValue = attacker.hp / attacker.cost;
    const speedValue = attacker.speed * 6;
    const score = (hpValue + speedValue) * (weightById[attacker.id] || 1) * (strategy.fallbackBias?.[attacker.id] || 1);
    if (score > bestScore) {
      bestScore = score;
      best = attacker;
    }
  }
  return best;
}

function prepareAIMoves() {
  if (state.aiDraftDone || state.gameOver) {
    return;
  }

  const difficulty = getAIDifficultySettings();
  const playerDefenseScore = totalDefenseScore(state.playerTowers);
  const playerPlan = analyzePlayerPlan(playerDefenseScore);
  const strategy = getAIStrategySettings();
  const minAttackerCost = Math.min(...attackerDefs.map((item) => item.cost));
  const burstInterval = Math.max(2, strategy.burstInterval || 3);
  const isSpikeSaveRound = state.waveNumber % burstInterval === 0 || (state.waveNumber >= 6 && playerDefenseScore > 9);
  const pressureStateScale = 1 + playerPlan.scoreDeficit * 0.08 * strategy.forceAttackWhenBehind - playerPlan.scoreLead * 0.025;
  const baseReserveTarget = isSpikeSaveRound
    ? clamp(10 + state.waveNumber * 1.9, 12, 36)
    : clamp(7 + state.waveNumber * 1.5, 9, 30);
  const reserveTarget = clamp(baseReserveTarget * difficulty.reserveScale * strategy.reserveScale, 3, 54);
  const playerRushDefenseScale = playerPlan.playerRush ? 1.25 : 1;
  const defenseRatio = (isSpikeSaveRound ? 0.12 : 0.22) * difficulty.defenseRatioScale * strategy.defenseBudgetScale * playerRushDefenseScale;
  const attackBiasFloor = Math.max(0, state.aiMana - reserveTarget);
  let defenseBudget = Math.min(Math.max(0, state.aiMana * defenseRatio), attackBiasFloor);
  let placementCount = 0;
  const maxPlacements = isSpikeSaveRound && strategy.label !== "Fortress" ? 1 : difficulty.maxPlacements;
  const minTowerTarget = getAIMinTowerTarget(state.waveNumber);
  const mandatoryReserve = strategy.label === "Fortress" ? 3 : 1;

  while (countPlacedTowers(state.aiTowers) < minTowerTarget && placementCount < Math.max(1, difficulty.maxPlacements)) {
    const mandatoryDefenseBudget = Math.max(defenseBudget, state.aiMana - mandatoryReserve);
    const bestPlacement = pickBestAITowerPlacement(state.aiMana, mandatoryDefenseBudget, playerPlan, state.waveNumber);
    if (!bestPlacement) {
      break;
    }
    if (bestPlacement.tower.cost > state.aiMana || bestPlacement.tower.cost > mandatoryDefenseBudget) {
      break;
    }
    state.aiMana -= bestPlacement.tower.cost;
    defenseBudget = Math.max(0, defenseBudget - bestPlacement.tower.cost);
    state.aiTowers[bestPlacement.slotIndex] = createTowerInstance(bestPlacement.tower, "ai", bestPlacement.nextLevel || 1);
    markMatchUsage("towers", bestPlacement.tower.id, "ai");
    placementCount += 1;
  }

  while (placementCount < maxPlacements) {
    const bestPlacement = pickBestAITowerPlacement(state.aiMana, defenseBudget, playerPlan, state.waveNumber);
    if (!bestPlacement) {
      break;
    }
    if (bestPlacement.tower.cost > state.aiMana || bestPlacement.tower.cost > defenseBudget) {
      break;
    }
    state.aiMana -= bestPlacement.tower.cost;
    defenseBudget -= bestPlacement.tower.cost;
    state.aiTowers[bestPlacement.slotIndex] = createTowerInstance(bestPlacement.tower, "ai", bestPlacement.nextLevel || 1);
    markMatchUsage("towers", bestPlacement.tower.id, "ai");
    placementCount += 1;
  }

  const postDefenseReserve = isSpikeSaveRound
    ? clamp(reserveTarget * 0.28, 2, 12)
    : clamp(reserveTarget * 0.55 * difficulty.postReserveScale, 2, 24);
  let sentCount = 0;
  const attackScale = difficulty.minAttackBudgetScale * strategy.attackBudgetScale * clamp(pressureStateScale, 0.7, 1.65) * (isSpikeSaveRound ? 1 + difficulty.burstPressure * 0.22 : 1);
  let attackBudget = Math.max(0, (state.aiMana - postDefenseReserve) * attackScale);
  const pattern = chooseAIBatchPattern(playerPlan, state.waveNumber, state.aiMana);

  while (attackBudget >= minAttackerCost) {
    const sentInBatch = queueAIBatch(pattern, attackBudget);
    if (sentInBatch === 0) {
      break;
    }
    sentCount += sentInBatch;
    attackBudget = Math.max(0, (state.aiMana - postDefenseReserve) * attackScale);
  }

  if (sentCount === 0 && state.aiMana >= minAttackerCost) {
    const fallback = chooseAIAttackerByDefense(playerPlan, state.aiMana, state.waveNumber) || attackerDefs[0];
    state.aiMana -= fallback.cost;
    state.aiQueue.push(fallback.id);
    markMatchUsage("attackers", fallback.id, "ai");
  }

  state.aiDraftDone = true;
}

function finalizeAIMovesBeforeBattle() {
  if (state.gameOver || multiplayerRole !== null) {
    return;
  }
  if (!state.aiDraftDone) {
    prepareAIMoves();
  }

  const difficulty = getAIDifficultySettings();
  if ((difficulty.adaptation || 0) < 0.45) {
    return;
  }

  const strategy = getAIStrategySettings();
  const playerPlan = analyzePlayerPlan(totalDefenseScore(state.playerTowers));
  const minAttackerCost = Math.min(...attackerDefs.map((item) => item.cost));

  if ((playerPlan.queueTotal >= 2 || playerPlan.playerRush) && state.aiMana >= minAttackerCost + 2) {
    const defenseBudget = Math.max(0, (state.aiMana - minAttackerCost) * 0.38 * strategy.defenseBudgetScale);
    const bestPlacement = pickBestAITowerPlacement(state.aiMana, defenseBudget, playerPlan, state.waveNumber);
    if (bestPlacement && bestPlacement.tower.cost <= state.aiMana && bestPlacement.tower.cost <= defenseBudget) {
      state.aiMana -= bestPlacement.tower.cost;
      state.aiTowers[bestPlacement.slotIndex] = createTowerInstance(bestPlacement.tower, "ai", bestPlacement.nextLevel || 1);
      markMatchUsage("towers", bestPlacement.tower.id, "ai");
    }
  }

  const reserve = strategy.label === "Fortress" ? 5 : 2;
  const attackScale = difficulty.minAttackBudgetScale * strategy.attackBudgetScale * (playerPlan.scoreDeficit > 0 ? 0.8 : 0.55);
  const attackBudget = Math.max(0, (state.aiMana - reserve) * attackScale);
  if (attackBudget >= minAttackerCost) {
    queueAIBatch(chooseAIBatchPattern(playerPlan, state.waveNumber, state.aiMana), attackBudget);
  }
}

function attackerPosition(unit) {
  const start = laneStarts[unit.owner];
  const end = laneEnds[unit.owner];
  const p = clamp(unit.progress, 0, 1);
  const baseX = start.x + (end.x - start.x) * p;
  const baseY = start.y + (end.y - start.y) * p;
  const spread = 0.39 - 0.05 * p;
  const sway = Math.sin((p * Math.PI * 2) + unit.id * 0.37) * 0.025 * (1 - 0.5 * p);
  let x = baseX + unit.fanSeed * spread + sway;
  const yFan = (0.01 + 0.018 * p) * unit.fanSeed;
  const y = clamp(baseY + yFan, 0.04, 0.96);
  x = clamp(x, 0.05, 0.95);

  return {
    x,
    y
  };
}

function isUnitStatusActive(unit, statusType) {
  if (statusType === "slowed") {
    return unit.slowTimer > 0;
  }
  if (statusType === "poisoned") {
    return unit.poisonTimer > 0;
  }
  return false;
}

function getTowerCandidates(towerPos, incomingAttackers, range, coneHalfAngleCos) {
  const isPlayerTower = towerPos.y > 0.5;
  const dirX = 0;
  const dirY = isPlayerTower ? -1 : 1;
  const candidates = [];

  for (const unit of incomingAttackers) {
    const pos = attackerPosition(unit);
    const vx = pos.x - towerPos.x;
    const vy = pos.y - towerPos.y;
    const dist = Math.hypot(vx, vy);
    if (dist <= range) {
      if (dist === 0) {
        candidates.push({ unit, dist, progress: unit.progress });
        continue;
      }
      const cosAngle = (vx * dirX + vy * dirY) / dist;
      if (cosAngle >= coneHalfAngleCos) {
        candidates.push({ unit, dist, progress: unit.progress });
      }
    }
  }
  return candidates;
}

function chooseTargetByRule(candidates, towerId) {
  if (candidates.length === 0) {
    return null;
  }
  if (towerId === "yellow" || towerId === "green") {
    const statusType = towerId === "yellow" ? "slowed" : "poisoned";
    const freshTargets = candidates.filter((item) => !isUnitStatusActive(item.unit, statusType));
    const priorityPool = freshTargets.length > 0 ? freshTargets : candidates;
    priorityPool.sort((a, b) => {
      if (a.dist !== b.dist) {
        return a.dist - b.dist;
      }
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      return a.unit.id - b.unit.id;
    });
    return priorityPool[0].unit;
  }
  candidates.sort((a, b) => {
    if (b.progress !== a.progress) {
      return b.progress - a.progress;
    }
    if (a.dist !== b.dist) {
      return a.dist - b.dist;
    }
    return a.unit.id - b.unit.id;
  });
  return candidates[0].unit;
}

function targetsForTower(tower, towerPos, incomingAttackers) {
  const candidates = getTowerCandidates(
    towerPos,
    incomingAttackers,
    tower.range,
    tower.coneHalfAngleCos
  );
  if (candidates.length === 0) {
    return [];
  }
  const selected = [];
  const maxTargets = Math.max(1, tower.maxTargets || 1);
  let candidatePool = candidates.slice();
  for (let i = 0; i < maxTargets; i += 1) {
    const chosen = chooseTargetByRule(candidatePool, tower.id);
    if (!chosen) {
      break;
    }
    selected.push(chosen);
    candidatePool = candidatePool.filter((item) => item.unit.id !== chosen.id);
    if (candidatePool.length === 0) {
      break;
    }
  }
  return selected;
}

function spawnProjectile(fromPos, target, damage, color, towerId, owner, speedOverride = null, slowDurationOverride = null, poisonDotMultiplierOverride = null, shrapnelDamageMultiplierOverride = null) {
  const projectileId = state.nextProjectileId;
  state.nextProjectileId += 1;
  state.projectiles.push({
    id: projectileId,
    x: fromPos.x,
    y: fromPos.y,
    prevX: fromPos.x,
    prevY: fromPos.y,
    targetId: target.id,
    targetOwner: target.owner,
    damage,
    speed: speedOverride || 1.35,
    slowDuration: Number.isFinite(slowDurationOverride) ? slowDurationOverride : null,
    poisonDotMultiplier: Number.isFinite(poisonDotMultiplierOverride) ? poisonDotMultiplierOverride : 1,
    shrapnelDamageMultiplier: Number.isFinite(shrapnelDamageMultiplierOverride) ? shrapnelDamageMultiplierOverride : 1,
    color,
    towerId,
    owner,
    age: 0,
    trail: [{ x: fromPos.x, y: fromPos.y }]
  });
}

function spawnYellowLeapBolt(fromPos, toPos) {
  state.yellowLeaps.push({
    fromX: fromPos.x,
    fromY: fromPos.y,
    toX: toPos.x,
    toY: toPos.y,
    life: 0.12,
    maxLife: 0.12
  });
}

function findYellowLeapTarget(sourceUnit, maxDistancePx = 48) {
  const sourcePos = attackerPosition(sourceUnit);
  const enemyList = sourceUnit.owner === "player" ? state.attackersPlayer : state.attackersAI;
  let best = null;
  for (const unit of enemyList) {
    if (unit.id === sourceUnit.id || unit.isDefeated || unit.hp <= 0 || unit.progress >= 1) {
      continue;
    }
    const pos = attackerPosition(unit);
    const distance = Math.hypot((pos.x - sourcePos.x) * canvas.width, (pos.y - sourcePos.y) * canvas.height);
    if (distance <= maxDistancePx && (!best || distance < best.distance)) {
      best = { unit, pos, distance };
    }
  }
  return best;
}

function applyProjectileDamage(target, damage, towerId, owner, allowAoe = true, slowDurationForHit = null, poisonDotMultiplierForHit = 1, shrapnelDamageMultiplierForHit = 1, allowYellowLeap = true) {
  if (!target || target.isDefeated || damage <= 0) {
    return;
  }
  target.hp -= damage;
  if (towerId === "yellow") {
    const appliedSlow = Number.isFinite(slowDurationForHit) ? slowDurationForHit : 1.2;
    target.slowTimer = Math.max(target.slowTimer, appliedSlow);
    if (allowYellowLeap && allowAoe) {
      const leap = findYellowLeapTarget(target, 48);
      if (leap) {
        spawnYellowLeapBolt(attackerPosition(target), leap.pos);
        applyProjectileDamage(leap.unit, damage * 0.5, towerId, owner, false, appliedSlow * 0.5, poisonDotMultiplierForHit, shrapnelDamageMultiplierForHit, false);
      }
    }
  }
  if (towerId === "green") {
    target.poisonTimer = 3;
    target.poisonTicksRemaining = 3;
    target.poisonTickInterval = 1;
    target.poisonTickTimer = 1;
    const appliedPoisonDotMultiplier = Number.isFinite(poisonDotMultiplierForHit) ? poisonDotMultiplierForHit : 1;
    target.poisonBaseDamage = damage * appliedPoisonDotMultiplier;
    target.poisonSourceOwner = owner;
  }
  if (towerId === "red" && allowAoe) {
    const appliedShrapnelMultiplier = Number.isFinite(shrapnelDamageMultiplierForHit) ? shrapnelDamageMultiplierForHit : 1;
    spawnRedAoeBursts(target, damage * 0.33 * appliedShrapnelMultiplier, target.id, owner);
  }
  if (target.hp <= 0 && !target.isDefeated) {
    target.isDefeated = true;
    if (getTowerDef(towerId)) {
      recordTowerKill(towerId, owner);
    }
  }
}

function getTankWeaponStats() {
  const violetDef = getTowerDef("violet");
  const range = (violetDef?.range || 0.416) * 0.5;
  const damage = (violetDef?.damage || 2) * 0.5;
  const coneHalfAngleRad = (180 * Math.PI) / 360;
  return {
    range,
    damage,
    fireRate: 1.1,
    coneHalfAngleCos: Math.cos(coneHalfAngleRad)
  };
}

function getTankTarget(tankUnit, enemyUnits, stats) {
  const origin = attackerPosition(tankUnit);
  const facingUp = tankUnit.owner === "player";
  const dirX = 0;
  const dirY = facingUp ? -1 : 1;
  const candidates = [];

  for (const enemy of enemyUnits) {
    if (enemy.hp <= 0 || enemy.isDefeated || enemy.progress >= 1) {
      continue;
    }
    const pos = attackerPosition(enemy);
    const vx = pos.x - origin.x;
    const vy = pos.y - origin.y;
    const dist = Math.hypot(vx, vy);
    if (dist > stats.range) {
      continue;
    }
    if (dist === 0) {
      candidates.push({ unit: enemy, dist });
      continue;
    }
    const cosAngle = (vx * dirX + vy * dirY) / dist;
    if (cosAngle >= stats.coneHalfAngleCos) {
      candidates.push({ unit: enemy, dist });
    }
  }

  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.dist !== b.dist) {
      return a.dist - b.dist;
    }
    return b.unit.progress - a.unit.progress;
  });
  return candidates[0].unit;
}

function updateTankCreepFire(dt) {
  const tankStats = getTankWeaponStats();
  const shootFrom = (ownerUnits, enemyUnits, ownerName) => {
    for (const unit of ownerUnits) {
      if (unit.defId !== "tank" || unit.hp <= 0 || unit.isDefeated || unit.progress >= 1) {
        continue;
      }
      unit.shootCooldown -= dt;
      if (unit.shootCooldown > 0) {
        continue;
      }
      const target = getTankTarget(unit, enemyUnits, tankStats);
      if (!target) {
        continue;
      }
      spawnProjectile(attackerPosition(unit), target, tankStats.damage, "#14532d", "tank", ownerName, 1.15);
      unit.shootCooldown = tankStats.fireRate;
    }
  };
  shootFrom(state.attackersPlayer, state.attackersAI, "player");
  shootFrom(state.attackersAI, state.attackersPlayer, "ai");
}

function spawnRedAoeBursts(centerUnit, splashDamage, ignoreUnitId, sourceOwner) {
  const origin = attackerPosition(centerUnit);
  const groupId = state.nextFireBurstId;
  state.nextFireBurstId += 1;
  const directions = 6;
  const particlesPerDirection = 8;
  for (let d = 0; d < directions; d += 1) {
    const baseAngle = (Math.PI * 2 * d) / directions;
    for (let i = 0; i < particlesPerDirection; i += 1) {
      const angle = baseAngle + (Math.random() - 0.5) * 0.32;
      const distancePx = 200 + Math.random() * 100;
      const normDistance = distancePx / Math.max(canvas.width, 1);
      const speed = 1.35 + Math.random() * 0.55;
      const life = normDistance / speed;
      state.fireBursts.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        groupId,
        splashDamage,
        sourceOwner,
        ignoreUnitId,
        hitIds: []
      });
    }
  }
}

function ensureAudioContext() {
  if (!audioUnlocked && !audioCtx) {
    return null;
  }
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  ensureSfxMasterGain();
  return audioCtx;
}

function unlockAudioFromGesture() {
  audioUnlocked = true;
  ensureAudioContext();
}

function resumeAudioAfterBackground() {
  if (!audioUnlocked || !audioCtx) {
    return;
  }
  ensureAudioContext();
  syncMusicPlaybackForScreen();
}

function getVolumeScale(value) {
  return clamp(Number(value) || 0, 0, 100) / 100;
}

function ensureSfxMasterGain() {
  if (!audioCtx || sfxMasterGain) {
    return sfxMasterGain;
  }
  sfxMasterGain = audioCtx.createGain();
  sfxMasterGain.gain.value = getVolumeScale(gameOptions.sfxVolume);
  sfxMasterGain.connect(audioCtx.destination);
  return sfxMasterGain;
}

function connectSfxOutput(node) {
  const master = ensureSfxMasterGain();
  node.connect(master || audioCtx.destination);
}

function updateSfxVolume() {
  if (!sfxMasterGain || !audioCtx) {
    return;
  }
  sfxMasterGain.gain.setTargetAtTime(getVolumeScale(gameOptions.sfxVolume), audioCtx.currentTime, 0.02);
}

function ensureGauntletVictoryAudioElement() {
  if (gauntletVictoryAudioEl) {
    return gauntletVictoryAudioEl;
  }
  gauntletVictoryAudioEl = new Audio(GAUNTLET_VICTORY_SFX_SRC);
  gauntletVictoryAudioEl.preload = "auto";
  return gauntletVictoryAudioEl;
}

function playGauntletVictorySfx() {
  const audio = ensureGauntletVictoryAudioElement();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = getVolumeScale(gameOptions.sfxVolume);
  audio.play().catch(() => {});
}

function updateMusicVolume() {
  if (!musicAudioEl) {
    return;
  }
  musicAudioEl.volume = getVolumeScale(gameOptions.musicVolume);
}

function getSelectedMusicPack() {
  const selected = getMusicPackOption(gameOptions.musicPack);
  return selected.tracks?.length ? selected : null;
}

function stopMusicFade() {
  if (!musicFadeTimer) {
    return;
  }
  window.clearInterval(musicFadeTimer);
  musicFadeTimer = null;
}

function ensureMusicAudioElement() {
  if (musicAudioEl) {
    return musicAudioEl;
  }
  musicAudioEl = new Audio();
  musicAudioEl.preload = "auto";
  musicAudioEl.addEventListener("ended", playNextMusicTrack);
  updateMusicVolume();
  return musicAudioEl;
}

function prepareCurrentMusicTrack(pack) {
  const tracks = pack.tracks || [];
  if (!tracks.length) {
    return null;
  }
  if (activeMusicPackId !== pack.id) {
    activeMusicPackId = pack.id;
    activeMusicTrackIndex = 0;
  }
  activeMusicTrackIndex = ((activeMusicTrackIndex % tracks.length) + tracks.length) % tracks.length;
  return tracks[activeMusicTrackIndex];
}

function playCurrentMusicTrack() {
  const pack = getSelectedMusicPack();
  if (!pack || state.screen !== "game" || !state.hasActiveMatch || state.gameOver) {
    return;
  }
  const track = prepareCurrentMusicTrack(pack);
  if (!track) {
    return;
  }
  const audio = ensureMusicAudioElement();
  stopMusicFade();
  if (audio.src !== new URL(track.src, window.location.href).href) {
    audio.src = track.src;
    audio.currentTime = 0;
  }
  updateMusicVolume();
  audio.play().catch(() => {});
}

function playNextMusicTrack() {
  const pack = getSelectedMusicPack();
  if (!pack) {
    return;
  }
  activeMusicPackId = pack.id;
  activeMusicTrackIndex = (activeMusicTrackIndex + 1) % pack.tracks.length;
  if (state.screen === "game" && state.hasActiveMatch && !state.gameOver) {
    playCurrentMusicTrack();
  }
}

function advanceSelectedMusicTrack() {
  const pack = getSelectedMusicPack();
  if (!pack) {
    return;
  }
  activeMusicPackId = pack.id;
  activeMusicTrackIndex = (activeMusicTrackIndex + 1) % pack.tracks.length;
}

function pauseMusicForMenu() {
  stopMusicFade();
  if (musicAudioEl && !musicAudioEl.paused) {
    musicAudioEl.pause();
  }
}

function fadeOutMatchMusic(advanceAfterFade = true) {
  stopMusicFade();
  if (advanceAfterFade) {
    advanceSelectedMusicTrack();
  }
  if (!musicAudioEl || musicAudioEl.paused) {
    return;
  }
  const audio = musicAudioEl;
  const startVolume = audio.volume;
  const startTime = performance.now();
  musicFadeTimer = window.setInterval(() => {
    const progress = clamp((performance.now() - startTime) / 1000, 0, 1);
    audio.volume = startVolume * (1 - progress);
    if (progress < 1) {
      return;
    }
    stopMusicFade();
    audio.pause();
    audio.currentTime = 0;
    updateMusicVolume();
  }, 50);
}

function syncMusicPlaybackForScreen() {
  if (state.screen === "game" && state.hasActiveMatch && !state.gameOver && !state.paused) {
    playCurrentMusicTrack();
  } else {
    pauseMusicForMenu();
  }
}

function playTowerFireSfx(towerId) {
  const ctxAudio = ensureAudioContext();
  if (!ctxAudio) {
    return;
  }

  const now = ctxAudio.currentTime;

  if (towerId === "violet") {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    const wobble = ctxAudio.createOscillator();
    const wobbleGain = ctxAudio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);
    wobble.type = "sine";
    wobble.frequency.setValueAtTime(7, now);
    wobbleGain.gain.setValueAtTime(16, now);
    wobble.connect(wobbleGain);
    wobbleGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(gain);
    connectSfxOutput(gain);
    wobble.start(now);
    osc.start(now);
    wobble.stop(now + 0.12);
    osc.stop(now + 0.12);
    return;
  }

  if (towerId === "yellow") {
    const osc = ctxAudio.createOscillator();
    const gateLfo = ctxAudio.createOscillator();
    const gateGain = ctxAudio.createGain();
    const gain = ctxAudio.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(2600, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.06);
    gateLfo.type = "square";
    gateLfo.frequency.setValueAtTime(95, now);
    gateGain.gain.setValueAtTime(0.018, now);
    gateLfo.connect(gateGain);
    gateGain.connect(gain.gain);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.028, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    connectSfxOutput(gain);
    gateLfo.start(now);
    osc.start(now);
    gateLfo.stop(now + 0.075);
    osc.stop(now + 0.075);
    return;
  }

  if (towerId === "red") {
    const osc = ctxAudio.createOscillator();
    const toneGain = ctxAudio.createGain();
    const noise = ctxAudio.createBufferSource();
    const noiseGain = ctxAudio.createGain();
    const mix = ctxAudio.createGain();
    const filter = ctxAudio.createBiquadFilter();
    const duration = 0.2;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + duration);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.08, now + 0.016);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const sampleRate = ctxAudio.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctxAudio.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + duration);
    filter.Q.value = 0.9;

    mix.gain.setValueAtTime(0.9, now);
    osc.connect(toneGain);
    toneGain.connect(filter);
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(mix);
    connectSfxOutput(mix);

    osc.start(now);
    noise.start(now);
    osc.stop(now + duration);
    noise.stop(now + duration);
    return;
  }

  if (towerId === "green") {
    const osc = ctxAudio.createOscillator();
    const lfo = ctxAudio.createOscillator();
    const lfoGain = ctxAudio.createGain();
    const gain = ctxAudio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(460, now + 0.06);
    osc.frequency.linearRampToValueAtTime(300, now + 0.12);
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(18, now);
    lfoGain.gain.setValueAtTime(26, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    connectSfxOutput(gain);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.14);
    osc.stop(now + 0.14);
    return;
  }

  if (towerId === "blue") {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    const filter = ctxAudio.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.12);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.Q.value = 1.5;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(filter);
    filter.connect(gain);
    connectSfxOutput(gain);
    osc.start(now);
    osc.stop(now + 0.14);
  }
}

function playBonusManaSfx(source = "kill") {
  const ctxAudio = ensureAudioContext();
  if (!ctxAudio) {
    return;
  }
  const now = ctxAudio.currentTime;

  if (source === "score") {
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(760, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    connectSfxOutput(gain);
    osc.start(now);
    osc.stop(now + 0.13);
    return;
  }

  const osc = ctxAudio.createOscillator();
  const filter = ctxAudio.createBiquadFilter();
  const gain = ctxAudio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(130, now + 0.055);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(320, now);
  filter.Q.value = 0.9;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(filter);
  filter.connect(gain);
  connectSfxOutput(gain);
  osc.start(now);
  osc.stop(now + 0.095);
}

function spawnTowerFlash(pos, color) {
  state.towerFlashes.push({
    x: pos.x,
    y: pos.y,
    color,
    life: 0.11,
    maxLife: 0.11
  });
}

function spawnTowerFireAnimation(owner, slotIndex, towerId) {
  const cfg = towerFireSheetConfig[towerId];
  if (!cfg) {
    return;
  }
  const key = `${owner}:${slotIndex}`;
  state.towerFireAnimations = state.towerFireAnimations.filter((anim) => anim.key !== key);
  state.towerFireAnimations.push({
    key,
    owner,
    slotIndex,
    towerId,
    life: cfg.duration || 0.24,
    maxLife: cfg.duration || 0.24
  });
  pixiState.lastTowerSignature = "";
}

function spawnDeathParticles(unit) {
  const origin = attackerPosition(unit);
  if (creepKillEffectConfig) {
    state.deathEffects.push({
      x: origin.x,
      y: origin.y,
      life: (creepKillEffectConfig.frames || 1) / Math.max(1, creepKillEffectConfig.fps || 12),
      maxLife: (creepKillEffectConfig.frames || 1) / Math.max(1, creepKillEffectConfig.fps || 12)
    });
    return;
  }
  const particleCount = 12;
  for (let i = 0; i < particleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.25;
    const speed = 0.08 + Math.random() * 0.14;
    state.deathParticles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.34 + Math.random() * 0.18,
      maxLife: 0.52,
      size: 1.5 + Math.random() * 2.4,
      color: unit.color
    });
  }
}

function spawnProjectileImpactParticles(x, y, color, particleCount) {
  for (let i = 0; i < particleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.45;
    const speed = 0.045 + Math.random() * 0.09;
    state.deathParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.12 + Math.random() * 0.08,
      maxLife: 0.2,
      size: 1.1 + Math.random() * 1.9,
      color
    });
  }
}

function updateTowerFire(dt) {
  for (let i = 0; i < state.playerTowers.length; i += 1) {
    const tower = state.playerTowers[i];
    if (!tower) {
      continue;
    }
    tower.cooldown -= dt;
    if (tower.cooldown > 0) {
      continue;
    }
    const targets = targetsForTower(tower, towerPosPlayer[i], state.attackersAI);
    if (targets.length === 0) {
      continue;
    }
    for (const target of targets) {
      spawnProjectile(
        towerPosPlayer[i],
        target,
        tower.damage,
        tower.color,
        tower.id,
        "player",
        null,
        tower.slowDuration,
        tower.poisonDotMultiplier,
        tower.shrapnelDamageMultiplier
      );
    }
    spawnTowerFlash(towerPosPlayer[i], tower.color);
    spawnTowerFireAnimation("player", i, tower.id);
    if ((tower.id === "violet" || tower.id === "yellow" || tower.id === "red" || tower.id === "green" || tower.id === "blue") && state.soundCooldowns[tower.id] <= 0) {
      playTowerFireSfx(tower.id);
      state.soundCooldowns[tower.id] = tower.id === "blue" ? 0.08 : tower.id === "red" ? 0.075 : tower.id === "violet" ? 0.07 : 0.06;
    }
    tower.cooldown = tower.fireRate;
  }

  for (let i = 0; i < state.aiTowers.length; i += 1) {
    const tower = state.aiTowers[i];
    if (!tower) {
      continue;
    }
    tower.cooldown -= dt;
    if (tower.cooldown > 0) {
      continue;
    }
    const targets = targetsForTower(tower, towerPosAI[i], state.attackersPlayer);
    if (targets.length === 0) {
      continue;
    }
    for (const target of targets) {
      spawnProjectile(
        towerPosAI[i],
        target,
        tower.damage,
        tower.color,
        tower.id,
        "ai",
        null,
        tower.slowDuration,
        tower.poisonDotMultiplier,
        tower.shrapnelDamageMultiplier
      );
    }
    spawnTowerFlash(towerPosAI[i], tower.color);
    spawnTowerFireAnimation("ai", i, tower.id);
    if ((tower.id === "violet" || tower.id === "yellow" || tower.id === "red" || tower.id === "green" || tower.id === "blue") && state.soundCooldowns[tower.id] <= 0) {
      playTowerFireSfx(tower.id);
      state.soundCooldowns[tower.id] = tower.id === "blue" ? 0.08 : tower.id === "red" ? 0.075 : tower.id === "violet" ? 0.07 : 0.06;
    }
    tower.cooldown = tower.fireRate;
  }
}

function findUnitById(owner, id) {
  const list = owner === "player" ? state.attackersPlayer : state.attackersAI;
  return list.find((unit) => unit.id === id) || null;
}

function updateProjectiles(dt) {
  const stillActive = [];

  for (const projectile of state.projectiles) {
    const target = findUnitById(projectile.targetOwner, projectile.targetId);
    if (!target || target.isDefeated) {
      continue;
    }

    const targetPos = attackerPosition(target);
    const dx = targetPos.x - projectile.x;
    const dy = targetPos.y - projectile.y;
    const dist = Math.hypot(dx, dy);

    projectile.age += dt;
    projectile.prevX = projectile.x;
    projectile.prevY = projectile.y;

    if (dist <= 0.012) {
      applyProjectileDamage(
        target,
        projectile.damage,
        projectile.towerId,
        projectile.owner,
        true,
        projectile.slowDuration,
        projectile.poisonDotMultiplier,
        projectile.shrapnelDamageMultiplier
      );
      if (projectile.towerId === "blue") {
        spawnProjectileImpactParticles(projectile.x, projectile.y, "#93c5fd", 8);
      }
      continue;
    }

    const move = Math.min(dist, projectile.speed * dt);
    const invDist = dist > 0 ? 1 / dist : 0;
    projectile.x += dx * invDist * move;
    projectile.y += dy * invDist * move;
    projectile.trail.push({ x: projectile.x, y: projectile.y });
    if (projectile.trail.length > 10) {
      projectile.trail.shift();
    }
    stillActive.push(projectile);
  }

  state.projectiles = stillActive;
}

function updateFireBursts(dt) {
  const active = [];
  for (const burst of state.fireBursts) {
    burst.life -= dt;
    if (burst.life <= 0) {
      continue;
    }
    burst.x += burst.vx * dt;
    burst.y += burst.vy * dt;
    if (burst.x < 0.02 || burst.x > 0.98 || burst.y < 0.02 || burst.y > 0.98) {
      continue;
    }
    const enemyList = burst.sourceOwner === "player" ? state.attackersAI : state.attackersPlayer;
    let collided = false;
    for (const unit of enemyList) {
      if (unit.isDefeated || burst.hitIds.includes(unit.id)) {
        continue;
      }
      if (unit.id === burst.ignoreUnitId) {
        continue;
      }
      const pos = attackerPosition(unit);
      const dx = pos.x - burst.x;
      const dy = pos.y - burst.y;
      if (Math.hypot(dx, dy) <= 0.02) {
        burst.hitIds.push(unit.id);
        applyProjectileDamage(unit, burst.splashDamage, "red", burst.sourceOwner, false);
        collided = true;
      }
    }
    if (!collided) {
      active.push(burst);
    }
  }
  state.fireBursts = active;
}

function updateTowerFlashes(dt) {
  const active = [];
  for (const flash of state.towerFlashes) {
    flash.life -= dt;
    if (flash.life > 0) {
      active.push(flash);
    }
  }
  state.towerFlashes = active;
}

function updateTowerFireAnimations(dt) {
  const active = [];
  for (const anim of state.towerFireAnimations) {
    anim.life -= dt;
    if (anim.life > 0) {
      active.push(anim);
    }
  }
  if (active.length !== state.towerFireAnimations.length) {
    pixiState.lastTowerSignature = "";
  }
  state.towerFireAnimations = active;
}

function clearTowerFireAnimations() {
  if (!state.towerFireAnimations.length) {
    return;
  }
  state.towerFireAnimations = [];
  pixiState.lastTowerSignature = "";
  updatePixiTowers();
}

function updateYellowLeaps(dt) {
  const active = [];
  for (const leap of state.yellowLeaps) {
    leap.life -= dt;
    if (leap.life > 0) {
      active.push(leap);
    }
  }
  state.yellowLeaps = active;
}

function updateDeathParticles(dt) {
  const active = [];
  for (const particle of state.deathParticles) {
    particle.life -= dt;
    if (particle.life <= 0) {
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    active.push(particle);
  }
  state.deathParticles = active;
}

function updateDeathEffects(dt) {
  if (!state.deathEffects.length) {
    return;
  }
  const active = [];
  for (const effect of state.deathEffects) {
    effect.life -= dt;
    if (effect.life > 0) {
      active.push(effect);
    }
  }
  state.deathEffects = active;
}

function updateAttackers(dt) {
  let playerScored = 0;
  let aiScored = 0;

  for (const unit of state.attackersPlayer) {
    unit.slowTimer = Math.max(0, unit.slowTimer - dt);
    unit.speed = unit.slowTimer > 0 ? unit.baseSpeed * 0.7 : unit.baseSpeed;
    unit.poisonTimer = Math.max(0, unit.poisonTimer - dt);
    if (unit.poisonTicksRemaining > 0) {
      unit.poisonTickTimer -= dt;
      if (unit.poisonTickTimer <= 0) {
        const step = 4 - unit.poisonTicksRemaining;
        const ratios = [0.3, 0.2, 0.1];
        const dotDamage = unit.poisonBaseDamage * ratios[Math.min(step, ratios.length - 1)];
        unit.hp -= dotDamage;
        unit.poisonTicksRemaining -= 1;
        unit.poisonTickTimer += unit.poisonTickInterval;
      }
    }
    if (unit.hp <= 0) {
      continue;
    }
    unit.progress += unit.speed * dt;
    if (unit.progress >= 1) {
      playerScored += 1;
      recordUnitScore(unit.defId, "player");
    }
  }
  for (const unit of state.attackersAI) {
    unit.slowTimer = Math.max(0, unit.slowTimer - dt);
    unit.speed = unit.slowTimer > 0 ? unit.baseSpeed * 0.7 : unit.baseSpeed;
    unit.poisonTimer = Math.max(0, unit.poisonTimer - dt);
    if (unit.poisonTicksRemaining > 0) {
      unit.poisonTickTimer -= dt;
      if (unit.poisonTickTimer <= 0) {
        const step = 4 - unit.poisonTicksRemaining;
        const ratios = [0.3, 0.2, 0.1];
        const dotDamage = unit.poisonBaseDamage * ratios[Math.min(step, ratios.length - 1)];
        unit.hp -= dotDamage;
        unit.poisonTicksRemaining -= 1;
        unit.poisonTickTimer += unit.poisonTickInterval;
      }
    }
    if (unit.hp <= 0) {
      continue;
    }
    unit.progress += unit.speed * dt;
    if (unit.progress >= 1) {
      aiScored += 1;
      recordUnitScore(unit.defId, "ai");
    }
  }

  for (const unit of state.attackersPlayer) {
    if (unit.hp <= 0 && !unit.isDefeated) {
      unit.isDefeated = true;
      if (unit.poisonSourceOwner) {
        recordTowerKill("green", unit.poisonSourceOwner);
      }
    }
    if (unit.hp <= 0) {
      spawnDeathParticles(unit);
    }
  }
  for (const unit of state.attackersAI) {
    if (unit.hp <= 0 && !unit.isDefeated) {
      unit.isDefeated = true;
      if (unit.poisonSourceOwner) {
        recordTowerKill("green", unit.poisonSourceOwner);
      }
    }
    if (unit.hp <= 0) {
      spawnDeathParticles(unit);
    }
  }

  state.attackersPlayer = state.attackersPlayer.filter((unit) => unit.hp > 0 && unit.progress < 1);
  state.attackersAI = state.attackersAI.filter((unit) => unit.hp > 0 && unit.progress < 1);

  state.playerScore += playerScored;
  state.aiScore += aiScored;
  if (playerScored > 0) {
    grantRoundManaBonus("player", playerScored, "score");
  }
  if (aiScored > 0) {
    grantRoundManaBonus("ai", aiScored, "score");
  }
}

function updateGame(dt) {
  if (state.gameOver || state.paused) {
    return;
  }
  state.animationClock += dt;
  state.soundCooldowns.violet = Math.max(0, state.soundCooldowns.violet - dt);
  state.soundCooldowns.yellow = Math.max(0, state.soundCooldowns.yellow - dt);
  state.soundCooldowns.red = Math.max(0, state.soundCooldowns.red - dt);
  state.soundCooldowns.green = Math.max(0, state.soundCooldowns.green - dt);
  state.soundCooldowns.blue = Math.max(0, state.soundCooldowns.blue - dt);

  if (state.phase === "banner") {
    state.roundBannerTimer -= dt;
    if (state.roundBannerTimer <= 0) {
      state.roundBannerTimer = 0;
      beginPrepPhase();
    }
    return;
  }

  if (state.phase === "shop") {
    return;
  }

  // Multiplayer: waiting for opponent to submit prep data — freeze the game loop
  if (state.phase === "waiting") {
    return;
  }

  if (state.phase === "prep") {
    if (!state.aiDraftDone) {
      prepareAIMoves();
    }

    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      state.phaseTimer = 0;
      launchWave();
    }
  } else {
    updateAttackers(dt);
    updateTowerFire(dt);
    updateTankCreepFire(dt);
  updateProjectiles(dt);
  updateFireBursts(dt);
  updateTowerFlashes(dt);
  updateTowerFireAnimations(dt);
  updateYellowLeaps(dt);
  updateDeathParticles(dt);
  updateDeathEffects(dt);

    if (
      state.attackersPlayer.length === 0 &&
      state.attackersAI.length === 0 &&
      state.projectiles.length === 0 &&
      state.fireBursts.length === 0 &&
      state.yellowLeaps.length === 0 &&
      state.deathParticles.length === 0 &&
      state.deathEffects.length === 0
    ) {
      onBattleFinished();
    }
  }
}

function resizePixiRendererToLayout() {
  if (!pixiState.app?.renderer || !gameFrameLayout.visibleLogicalWidth || !gameFrameLayout.visibleLogicalHeight) {
    return;
  }
  const width = Math.max(1, Math.round(gameFrameLayout.visibleLogicalWidth));
  const height = Math.max(1, Math.round(gameFrameLayout.visibleLogicalHeight));
  if (pixiState.app.renderer.width !== width || pixiState.app.renderer.height !== height) {
    pixiState.app.renderer.resize(width, height);
  }
  positionPixiScene();
}

function positionPixiScene() {
  if (!pixiState.app) {
    return;
  }
  const safeX = gameFrameLayout.safeOffsetLogicalX || 0;
  const safeY = gameFrameLayout.safeOffsetLogicalY || 0;

  if (pixiState.artboard) {
    pixiState.artboard.x = safeX - SAFE_AREA_OFFSET_X;
    pixiState.artboard.y = safeY - SAFE_AREA_OFFSET_Y;
  }

  if (pixiState.highZLayer) {
    pixiState.highZLayer.x = safeX - SAFE_AREA_OFFSET_X;
    pixiState.highZLayer.y = safeY - SAFE_AREA_OFFSET_Y;
  }

  for (const layer of [pixiState.markerLayer, pixiState.battlefieldLayer, pixiState.towerLayer, pixiState.dockIconLayer, pixiState.textLayer]) {
    if (layer) {
      layer.x = safeX;
      layer.y = safeY;
    }
  }

  if (pixiState.battlefieldMask) {
    pixiState.battlefieldMask
      .clear()
      .rect(
        safeX + BATTLEFIELD_BOUNDS.x,
        safeY + BATTLEFIELD_BOUNDS.y,
        BATTLEFIELD_BOUNDS.width,
        BATTLEFIELD_BOUNDS.height
      )
      .fill(0xffffff);
  }
}

function ensurePixiViewport() {
  if (pixiState.app || !window.PIXI) {
    return;
  }
  const host = document.getElementById("pixi-viewport");
  if (!host) {
    return;
  }

  const app = new PIXI.Application();
  pixiState.app = app;
  app.init({
    width: LOGICAL_CANVAS_WIDTH,
    height: LOGICAL_CANVAS_HEIGHT,
    backgroundAlpha: 0,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  }).then(async () => {
    host.innerHTML = "";
    host.appendChild(app.canvas);
    try {
      await buildPixiScene();
      pixiState.ready = true;
      updatePixiCardStates(true);
      document.documentElement.classList.remove("pixi-failed");
    } catch (error) {
      console.error("Unable to build Pixi scene", error);
      document.documentElement.classList.add("pixi-failed");
    }
  }).catch((error) => {
    console.error("Unable to initialize Pixi viewport", error);
  });
}

function pixiText(text, style = {}) {
  const node = new PIXI.Text({
    text,
    style: {
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: 14,
      fontWeight: "800",
      fill: "#0f172a",
      align: "center",
      ...style
    }
  });
  node.anchor.set(0.5);
  return node;
}

function loadImageTexture(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(PIXI.Texture.from(img));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Unable to load image asset: ${path}`));
    img.src = path;
  });
}

async function buildPixiScene() {
  const { app } = pixiState;
  if (!app) {
    return;
  }

  app.stage.removeChildren();
  const templateTextures = await Promise.all(
    PIXI_TEMPLATE_LAYERS.map((filename) => loadImageTexture(`${PIXI_LAYER_ASSET_ROOT}/${filename}`))
  );
  const highZTexture = PIXI_HIGH_Z_LAYER ? await loadImageTexture(`${PIXI_LAYER_ASSET_ROOT}/${PIXI_HIGH_Z_LAYER}`) : null;
  const timerFillTexture = PIXI_TIMER_FILL_LAYER ? await loadImageTexture(`${PIXI_LAYER_ASSET_ROOT}/${PIXI_TIMER_FILL_LAYER}`) : null;
  const markerTexture = await loadImageTexture(BATTLEFIELD_TOWER_MARKER_PATH);
  const towerTextureSets = { player: {}, ai: {} };
  for (const side of ["player", "ai"]) {
    for (const [towerId, path] of Object.entries(towerSpritePathSets[side] || {})) {
      towerTextureSets[side][towerId] = await loadImageTexture(path);
    }
  }
  const towerFireTextureSets = { player: {}, ai: {} };
  for (const side of ["player", "ai"]) {
    for (const [towerId, cfg] of Object.entries(towerFireSheetConfigSets[side] || {})) {
      towerFireTextureSets[side][towerId] = await loadImageTexture(cfg.path);
    }
  }
  const attackerTextureSets = { player: {}, ai: {} };
  for (const side of ["player", "ai"]) {
    for (const [attackerId, cfg] of Object.entries(attackerSpriteConfigSets[side] || {})) {
      attackerTextureSets[side][attackerId] = cfg ? await loadImageTexture(cfg.path) : null;
    }
  }
  pixiState.towerTextureSets = towerTextureSets;
  pixiState.towerTextures = towerTextureSets.player;
  pixiState.towerFireTextureSets = towerFireTextureSets;
  pixiState.towerFireTextures = towerFireTextureSets.player;
  pixiState.attackerTextureSets = attackerTextureSets;
  pixiState.attackerTextures = attackerTextureSets.player;

  const artboard = new PIXI.Container();
  pixiState.artboard = artboard;
  app.stage.addChild(artboard);

  for (const texture of templateTextures) {
    const sprite = new PIXI.Sprite(texture);
    sprite.x = 0;
    sprite.y = 0;
    sprite.width = ARTBOARD_WIDTH;
    sprite.height = ARTBOARD_HEIGHT;
    artboard.addChild(sprite);
  }

  const markerLayer = new PIXI.Container();
  pixiState.markerLayer = markerLayer;
  pixiState.markerTexture = markerTexture;
  pixiState.lastMarkerSignature = "";
  app.stage.addChild(markerLayer);

  const battlefieldLayer = new PIXI.Container();
  const battlefieldMask = new PIXI.Graphics();
  battlefieldLayer.mask = battlefieldMask;
  pixiState.battlefieldLayer = battlefieldLayer;
  pixiState.battlefieldMask = battlefieldMask;
  app.stage.addChild(battlefieldLayer);
  app.stage.addChild(battlefieldMask);

  pixiState.legacyTexture = PIXI.Texture.from(canvas);
  pixiState.legacySprite = new PIXI.Sprite(pixiState.legacyTexture);
  pixiState.legacySprite.x = 0;
  pixiState.legacySprite.y = 0;
  pixiState.legacySprite.width = LOGICAL_CANVAS_WIDTH;
  pixiState.legacySprite.height = LOGICAL_CANVAS_HEIGHT;
  battlefieldLayer.addChild(pixiState.legacySprite);

  pixiState.towerLayer = new PIXI.Container();
  app.stage.addChild(pixiState.towerLayer);

  pixiState.highZLayer = new PIXI.Container();
  app.stage.addChild(pixiState.highZLayer);
  if (highZTexture) {
    const highZSprite = new PIXI.Sprite(highZTexture);
    highZSprite.x = 0;
    highZSprite.y = 0;
    highZSprite.width = ARTBOARD_WIDTH;
    highZSprite.height = ARTBOARD_HEIGHT;
    pixiState.highZLayer.addChild(highZSprite);
  }

  pixiState.dockIconLayer = new PIXI.Container();
  app.stage.addChild(pixiState.dockIconLayer);

  pixiState.textLayer = new PIXI.Container();
  app.stage.addChild(pixiState.textLayer);

  buildPixiDockCards();
  buildPixiHudText(timerFillTexture);
  resizePixiRendererToLayout();
}

function buildPixiHudText(timerFillTexture = null) {
  pixiState.textLayer.removeChildren();
  pixiState.timerFillSprite = null;
  if (timerFillTexture) {
    pixiState.timerFill = new PIXI.Sprite(timerFillTexture);
    pixiState.timerFill.x = -SAFE_AREA_OFFSET_X;
    pixiState.timerFill.y = -SAFE_AREA_OFFSET_Y;
    pixiState.timerFill.width = ARTBOARD_WIDTH;
    pixiState.timerFill.height = ARTBOARD_HEIGHT;
    pixiState.timerFillSprite = pixiState.timerFill;
  } else {
    pixiState.timerFill = new PIXI.Graphics()
      .roundRect(TIMER_FILL_RECT.x, TIMER_FILL_RECT.y, TIMER_FILL_RECT.width, TIMER_FILL_RECT.height, 3)
      .fill({ color: 0x22c55e, alpha: 0.94 });
  }
  pixiState.timerMask = new PIXI.Graphics();
  pixiState.timerFill.mask = pixiState.timerMask;
  pixiState.textLayer.addChild(pixiState.timerFill);
  pixiState.textLayer.addChild(pixiState.timerMask);

  pixiState.hudText = {
    round: pixiText("1", { fontSize: 18, fill: "#ffffff" }),
    timer: pixiText("15.0", { fontSize: 18, fill: "#ffffff" }),
    aiScore: pixiText("0", { fontSize: 18, fill: "#ffffff" }),
    mana: pixiText("9", { fontSize: 24, fill: "#ffffff" }),
    playerScore: pixiText("0", { fontSize: 18, fill: "#ffffff" })
  };

  pixiState.hudText.round.position.set(32, 215);
  pixiState.hudText.timer.position.set(32, 384);
  pixiState.hudText.aiScore.position.set(387, 228);
  pixiState.hudText.mana.position.set(386, 304);
  pixiState.hudText.playerScore.position.set(387, 378);

  for (const node of Object.values(pixiState.hudText)) {
    pixiState.textLayer.addChild(node);
  }
}

function addFittedSprite(parent, texture, x, y, maxWidth, maxHeight, options = {}) {
  const sprite = new PIXI.Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  sprite.width = maxWidth;
  sprite.height = maxHeight;
  if (options.flipY) {
    sprite.scale.y *= -1;
  }
  parent.addChild(sprite);
  return sprite;
}

function addFittedSheetFrame(parent, texture, x, y, maxWidth, maxHeight, frameIndex, frameCount) {
  const frame = new PIXI.Container();
  frame.x = x;
  frame.y = y;
  const sprite = new PIXI.Sprite(texture);
  sprite.x = -maxWidth / 2 - frameIndex * maxWidth;
  sprite.y = -maxHeight / 2;
  sprite.width = maxWidth * frameCount;
  sprite.height = maxHeight;
  const mask = new PIXI.Graphics()
    .rect(-maxWidth / 2, -maxHeight / 2, maxWidth, maxHeight)
    .fill(0xffffff);
  frame.addChild(sprite);
  frame.addChild(mask);
  sprite.mask = mask;
  parent.addChild(frame);
  return frame;
}

function addSheetPreview(parent, attackerId, cfg, x, y, width, height) {
  const frame = new PIXI.Container();
  frame.x = x - width / 2;
  frame.y = y - height / 2;
  const mask = new PIXI.Graphics().rect(frame.x, frame.y, width, height).fill(0xffffff);
  const sprite = new PIXI.Sprite(pixiState.attackerTextures[attackerId] || PIXI.Texture.EMPTY);
  sprite.x = frame.x;
  sprite.y = frame.y;
  sprite.height = height;
  sprite.width = width * (cfg.frames || 4);
  parent.addChild(sprite);
  parent.addChild(mask);
  sprite.mask = mask;
  return sprite;
}

function addPixiCardHitArea(parent, x, y, width, height, onTap, onPointerDown = null) {
  const hitArea = new PIXI.Graphics()
    .rect(x - width / 2, y - height / 2, width, height)
    .fill({ color: 0xffffff, alpha: 0.001 });
  hitArea.eventMode = "static";
  hitArea.cursor = "pointer";
  hitArea.on("pointertap", onTap);
  if (onPointerDown) {
    hitArea.on("pointerdown", onPointerDown);
  }
  parent.addChild(hitArea);
  return hitArea;
}

function createPixiTowerDragGhost(tower) {
  const ghostEl = document.createElement("div");
  ghostEl.className = "pixi-drag-ghost";
  ghostEl.innerHTML = `<img src="${towerSpritePaths[tower.id]}" alt="" />`;
  ghostEl.style.position = "fixed";
  ghostEl.style.width = `${TOWER_RENDER_BOX_WIDTH}px`;
  ghostEl.style.height = `${TOWER_RENDER_BOX_HEIGHT}px`;
  ghostEl.style.opacity = "0.62";
  ghostEl.style.pointerEvents = "none";
  ghostEl.style.zIndex = "9999";
  ghostEl.style.transform = "translate(-50%, -50%)";
  ghostEl.style.filter = "drop-shadow(0 8px 14px rgba(2, 6, 23, 0.45))";
  const img = ghostEl.querySelector("img");
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  document.body.appendChild(ghostEl);
  return ghostEl;
}

function getPixiPointerClientPosition(event) {
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return { x: event.clientX, y: event.clientY };
  }
  const canvasRect = pixiState.app?.canvas?.getBoundingClientRect();
  if (!canvasRect || !event.global) {
    return { x: 0, y: 0 };
  }
  const scaleX = canvasRect.width / Math.max(1, pixiState.app.renderer.width);
  const scaleY = canvasRect.height / Math.max(1, pixiState.app.renderer.height);
  return {
    x: canvasRect.left + event.global.x * scaleX,
    y: canvasRect.top + event.global.y * scaleY
  };
}

function updatePixiTowerDragGhost(clientX, clientY) {
  if (!pixiTowerDragState?.ghostEl) {
    return;
  }
  pixiTowerDragState.ghostEl.style.left = `${clientX}px`;
  pixiTowerDragState.ghostEl.style.top = `${clientY}px`;
}

function startPixiTowerPointer(event, tower) {
  if (!isPlayerInputAllowed()) {
    return;
  }
  if (state.playerMana < tower.cost) {
    updateStatus("Not enough mana for that tower.");
    triggerPlacementHaptic("error");
    return;
  }
  const client = getPixiPointerClientPosition(event);
  pixiTowerDragState = {
    pointerId: event.pointerId,
    tower,
    startX: client.x,
    startY: client.y,
    hasMoved: false,
    ghostEl: null
  };
  document.addEventListener("pointermove", onPixiTowerPointerMove, { passive: false });
  document.addEventListener("pointerup", onPixiTowerPointerEnd, { passive: false });
  document.addEventListener("pointercancel", onPixiTowerPointerCancel, { passive: false });
}

function onPixiTowerPointerMove(event) {
  if (!pixiTowerDragState || event.pointerId !== pixiTowerDragState.pointerId) {
    return;
  }
  const dx = event.clientX - pixiTowerDragState.startX;
  const dy = event.clientY - pixiTowerDragState.startY;
  if (!pixiTowerDragState.hasMoved && Math.hypot(dx, dy) < 6) {
    return;
  }
  event.preventDefault();
  pixiTowerDragState.hasMoved = true;
  if (!pixiTowerDragState.ghostEl) {
    pixiTowerDragState.ghostEl = createPixiTowerDragGhost(pixiTowerDragState.tower);
    activeDragPayload = `tower:${pixiTowerDragState.tower.id}`;
  }
  updatePixiTowerDragGhost(event.clientX, event.clientY);
  clearTouchDragHighlights();
  const slotEl = document.elementFromPoint(event.clientX, event.clientY)?.closest(".tower-slot.player");
  if (slotEl && isPlayerInputAllowed()) {
    slotEl.classList.add("over");
  }
}

function finishPixiTowerPointer(clientX, clientY, shouldApplyDrop) {
  if (!pixiTowerDragState) {
    return;
  }
  const dragState = pixiTowerDragState;
  if (dragState.ghostEl?.parentNode) {
    dragState.ghostEl.parentNode.removeChild(dragState.ghostEl);
  }
  clearTouchDragHighlights();
  if (dragState.hasMoved) {
    suppressNextPixiTowerTap = true;
    window.setTimeout(() => {
      suppressNextPixiTowerTap = false;
    }, 0);
  }
  if (shouldApplyDrop && dragState.hasMoved && isPlayerInputAllowed()) {
    const slotEl = document.elementFromPoint(clientX, clientY)?.closest(".tower-slot.player");
    if (slotEl) {
      const slotIndex = Number(slotEl.dataset.slotIndex);
      if (Number.isInteger(slotIndex)) {
        placePlayerTower(slotIndex, dragState.tower.id);
      }
    }
  }
  pixiTowerDragState = null;
  activeDragPayload = "";
  document.removeEventListener("pointermove", onPixiTowerPointerMove);
  document.removeEventListener("pointerup", onPixiTowerPointerEnd);
  document.removeEventListener("pointercancel", onPixiTowerPointerCancel);
}

function onPixiTowerPointerEnd(event) {
  if (!pixiTowerDragState || event.pointerId !== pixiTowerDragState.pointerId) {
    return;
  }
  finishPixiTowerPointer(event.clientX, event.clientY, true);
}

function onPixiTowerPointerCancel(event) {
  if (!pixiTowerDragState || event.pointerId !== pixiTowerDragState.pointerId) {
    return;
  }
  finishPixiTowerPointer(event.clientX, event.clientY, false);
}

function onTowerCardActivated(tower) {
  if (suppressNextPixiTowerTap) {
    suppressNextPixiTowerTap = false;
    return;
  }
  if (state.phase === "shop") {
    state.shopSelectionType = "tower";
    state.shopSelectionId = tower.id;
    refreshAllUI();
    return;
  }
  if (!isPlayerInputAllowed()) {
    return;
  }
  if (state.playerMana < tower.cost) {
    updateStatus("Not enough mana for that tower.");
    triggerPlacementHaptic("error");
    return;
  }
  selectedTowerId = selectedTowerId === tower.id ? null : tower.id;
  refreshCardStates();
  updateStatus(selectedTowerId
    ? `Selected ${tower.name}. Tap a slot to place, upgrade, or replace.`
    : "Tower selection cleared.");
}

function onAttackerCardActivated(attacker) {
  if (state.phase === "shop") {
    state.shopSelectionType = "attacker";
    state.shopSelectionId = attacker.id;
    refreshAllUI();
    return;
  }
  if (!isPlayerInputAllowed()) {
    return;
  }
  if (state.playerMana < attacker.cost) {
    updateStatus("Not enough mana for that attacker.");
    triggerPlacementHaptic("error");
    return;
  }
  flashPixiCard("attacker", attacker.id);
  queuePlayerAttacker(attacker.id);
}

function buildPixiDockCards() {
  pixiState.dockIconLayer.removeChildren();
  pixiState.cardSprites = [];
  pixiState.cardText = [];
  pixiState.cardEntries = [];

  const towerOrder = towerDefs.slice().reverse();
  towerOrder.forEach((tower, index) => {
    const center = TOWER_CARD_CENTERS[index];
    const x = center.x - SAFE_AREA_OFFSET_X - 5;
    const y = center.y - SAFE_AREA_OFFSET_Y;
    const sprite = addFittedSprite(pixiState.dockIconLayer, pixiState.towerTextures[tower.id], x, y, 58, 70);
    pixiState.cardSprites.push(sprite);
    const costText = pixiText(String(tower.cost), { fontSize: 15, fill: "#111827" });
    costText.position.set(center.x - SAFE_AREA_OFFSET_X + 24, center.y - SAFE_AREA_OFFSET_Y + 18);
    pixiState.dockIconLayer.addChild(costText);
    pixiState.cardText.push(costText);
    const overlay = new PIXI.Graphics()
      .roundRect(center.x - SAFE_AREA_OFFSET_X - 37, center.y - SAFE_AREA_OFFSET_Y - 39, 74, 78, 2)
      .fill({ color: 0x5b6472, alpha: 0.58 });
    overlay.eventMode = "none";
    overlay.visible = false;
    pixiState.dockIconLayer.addChild(overlay);
    const flash = createPixiCardFlash(center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 78);
    pixiState.dockIconLayer.addChild(flash);
    const selection = createPixiCardSelection(center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 78);
    pixiState.dockIconLayer.addChild(selection);
    pixiState.cardEntries.push({ type: "tower", id: tower.id, manaCost: tower.cost, sprite, costText, overlay, flash, selection });
    addPixiCardHitArea(pixiState.dockIconLayer, center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 78, () => {
      onTowerCardActivated(tower);
    }, (event) => {
      startPixiTowerPointer(event, tower);
    });
  });

  attackerDefs.forEach((attacker, index) => {
    const center = CREEP_CARD_CENTERS[index];
    const x = center.x - SAFE_AREA_OFFSET_X - 5;
    const y = center.y - SAFE_AREA_OFFSET_Y;
    const cfg = attackerSpriteConfig[attacker.id];
    let sprite = null;
    if (cfg) {
      sprite = addSheetPreview(pixiState.dockIconLayer, attacker.id, cfg, x, y, 58, 58);
    }
    const costText = pixiText(String(attacker.cost), { fontSize: 15, fill: "#111827" });
    costText.position.set(center.x - SAFE_AREA_OFFSET_X + 24, center.y - SAFE_AREA_OFFSET_Y + 18);
    pixiState.dockIconLayer.addChild(costText);
    pixiState.cardText.push(costText);
    const overlay = new PIXI.Graphics()
      .roundRect(center.x - SAFE_AREA_OFFSET_X - 37, center.y - SAFE_AREA_OFFSET_Y - 32, 74, 64, 2)
      .fill({ color: 0x5b6472, alpha: 0.58 });
    overlay.eventMode = "none";
    overlay.visible = false;
    pixiState.dockIconLayer.addChild(overlay);
    const flash = createPixiCardFlash(center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 64);
    pixiState.dockIconLayer.addChild(flash);
    const selection = createPixiCardSelection(center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 64);
    pixiState.dockIconLayer.addChild(selection);
    const queueText = pixiText("", {
      fontSize: 21,
      fill: "#ffffff",
      stroke: { color: "#0f172a", width: 4 }
    });
    queueText.position.set(center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y - 2);
    queueText.visible = false;
    pixiState.dockIconLayer.addChild(queueText);
    pixiState.cardEntries.push({ type: "attacker", id: attacker.id, manaCost: attacker.cost, sprite, costText, overlay, flash, selection, queueText });
    addPixiCardHitArea(pixiState.dockIconLayer, center.x - SAFE_AREA_OFFSET_X, center.y - SAFE_AREA_OFFSET_Y, 74, 64, () => {
      onAttackerCardActivated(attacker);
    });
  });
  updatePixiCardStates(true);
}

function createPixiCardFlash(x, y, width, height) {
  const flash = new PIXI.Graphics()
    .roundRect(x - width / 2, y - height / 2, width, height, 2)
    .fill({ color: 0xffffff, alpha: 0.44 })
    .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
  flash.eventMode = "none";
  flash.visible = false;
  return flash;
}

function createPixiCardSelection(x, y, width, height) {
  const selection = new PIXI.Graphics()
    .roundRect(x - width / 2, y - height / 2, width, height, 2)
    .stroke({ color: 0xfff7c2, width: 3, alpha: 0.95 });
  selection.eventMode = "none";
  selection.visible = false;
  return selection;
}

function flashPixiCard(type, id) {
  const entry = pixiState.cardEntries.find((item) => item.type === type && item.id === id);
  if (!entry?.flash) {
    return;
  }
  if (entry.flashTimeouts) {
    for (const timeoutId of entry.flashTimeouts) {
      window.clearTimeout(timeoutId);
    }
  }
  entry.flash.visible = true;
  entry.flash.alpha = 1;
  entry.flashTimeouts = [
    window.setTimeout(() => {
      entry.flash.visible = false;
    }, 85),
    window.setTimeout(() => {
      entry.flash.visible = true;
      entry.flash.alpha = 0.72;
    }, 145),
    window.setTimeout(() => {
      entry.flash.visible = false;
      entry.flash.alpha = 1;
      entry.flashTimeouts = null;
    }, 230)
  ];
}

function updatePixiTimerFill() {
  if (!pixiState.ready || !pixiState.timerFill || !pixiState.timerMask) {
    return;
  }
  const ratio = state.phase === "prep" ? clamp(state.phaseTimer / PREP_SECONDS, 0, 1) : 0;
  const visibleHeight = TIMER_FILL_RECT.height * ratio;
  const visibleY = TIMER_FILL_RECT.y + TIMER_FILL_RECT.height - visibleHeight;
  pixiState.timerFill.visible = ratio > 0;
  pixiState.timerMask
    .clear()
    .rect(TIMER_FILL_RECT.x, visibleY, TIMER_FILL_RECT.width, visibleHeight)
    .fill(0xffffff);
}

function updatePixiCardStates(force = false) {
  if (!pixiState.ready || !pixiState.cardEntries.length) {
    return;
  }
  const signature = [
    state.phase,
    state.playerMana,
    selectedTowerId || "",
    state.shopSelectionType || "",
    state.shopSelectionId || "",
    JSON.stringify(state.playerQueueCounts || {}),
    isPlayerInputAllowed() ? "input" : "locked"
  ].join("|");
  if (!force && signature === pixiState.lastCardSignature) {
    return;
  }
  pixiState.lastCardSignature = signature;

  for (const entry of pixiState.cardEntries) {
    const inShop = state.phase === "shop";
    const affordable = inShop || (isPlayerInputAllowed() && state.playerMana >= entry.manaCost);
    if (entry.sprite) {
      entry.sprite.alpha = affordable ? 1 : 0.34;
      entry.sprite.tint = affordable ? 0xffffff : 0x8b93a0;
    }
    if (entry.costText) {
      entry.costText.alpha = affordable ? 1 : 0.48;
      entry.costText.style.fill = affordable ? "#111827" : "#475569";
    }
    if (entry.overlay) {
      entry.overlay.visible = !affordable;
    }
    if (entry.selection) {
      entry.selection.visible = entry.type === "tower"
        ? (inShop
          ? state.shopSelectionType === "tower" && state.shopSelectionId === entry.id
          : selectedTowerId === entry.id)
        : inShop && state.shopSelectionType === "attacker" && state.shopSelectionId === entry.id;
    }
    if (entry.queueText) {
      const queued = state.playerQueueCounts[entry.id] || 0;
      entry.queueText.text = queued > 0 ? `x${queued}` : "";
      entry.queueText.visible = !inShop && queued > 0;
    }
  }
}

function updatePixiHudText() {
  if (!pixiState.ready) {
    return;
  }
  const signature = [
    state.waveNumber,
    state.phase,
    state.phaseTimer.toFixed(1),
    state.playerMana,
    state.playerScore,
    state.aiScore
  ].join("|");
  if (signature === pixiState.lastHudSignature) {
    return;
  }
  pixiState.lastHudSignature = signature;
  pixiState.hudText.round.text = String(state.waveNumber);
  pixiState.hudText.timer.text = phaseTimerEl.textContent || state.phaseTimer.toFixed(1);
  pixiState.hudText.aiScore.text = String(state.aiScore);
  pixiState.hudText.mana.text = String(state.playerMana);
  pixiState.hudText.playerScore.text = String(state.playerScore);
}

function updatePixiMarkers() {
  if (!pixiState.ready || !pixiState.markerLayer || !pixiState.markerTexture) {
    return;
  }
  const signature = JSON.stringify({
    player: state.playerTowers.map((tower) => (tower ? "1" : "0")),
    ai: state.aiTowers.map((tower) => (tower ? "1" : "0"))
  });
  if (signature === pixiState.lastMarkerSignature) {
    return;
  }
  pixiState.lastMarkerSignature = signature;
  pixiState.markerLayer.removeChildren();

  const drawMarker = (pos) => {
    addFittedSprite(
      pixiState.markerLayer,
      pixiState.markerTexture,
      pos.x * LOGICAL_CANVAS_WIDTH,
      pos.y * LOGICAL_CANVAS_HEIGHT,
      BATTLEFIELD_TOWER_MARKER_SIZE,
      BATTLEFIELD_TOWER_MARKER_SIZE
    );
  };

  for (let i = 0; i < 5; i += 1) {
    if (!state.aiTowers[i]) {
      drawMarker(towerPosAI[i]);
    }
    if (!state.playerTowers[i]) {
      drawMarker(towerPosPlayer[i]);
    }
  }
}

function updatePixiTowers() {
  if (!pixiState.ready) {
    return;
  }
  const signature = JSON.stringify({
    player: state.playerTowers.map((tower) => tower ? `${tower.id}:${tower.level || 1}` : ""),
    ai: state.aiTowers.map((tower) => tower ? `${tower.id}:${tower.level || 1}` : ""),
    fire: state.towerFireAnimations.map((anim) => `${anim.key}:${anim.towerId}:${anim.life.toFixed(2)}`)
  });
  if (signature === pixiState.lastTowerSignature) {
    return;
  }
  pixiState.lastTowerSignature = signature;
  pixiState.towerLayer.removeChildren();

  const activeFireAnimations = new Map(state.towerFireAnimations.map((anim) => [anim.key, anim]));

  const drawTowerSprite = (tower, pos, options = {}) => {
    if (!tower) {
      return;
    }
    const side = getOwnerVisualSide(options.owner);
    const towerTextures = pixiState.towerTextureSets[side] || pixiState.towerTextures;
    const towerFireTextures = pixiState.towerFireTextureSets[side] || pixiState.towerFireTextures;
    const sideFireConfig = towerFireSheetConfigSets[side] || towerFireSheetConfig;
    const levelScale = Math.max(1, Number(tower.level) || 1) > 1 ? 1.16 : 1;
    const fireAnim = options.fireKey ? activeFireAnimations.get(options.fireKey) : null;
    const fireCfg = fireAnim ? sideFireConfig[tower.id] : null;
    if (fireAnim && fireCfg && towerFireTextures[tower.id]) {
      const frameCount = fireCfg.frames || 4;
      const progress = clamp(1 - fireAnim.life / fireAnim.maxLife, 0, 0.999);
      const frameIndex = Math.min(frameCount - 1, Math.floor(progress * frameCount));
      addFittedSheetFrame(
        pixiState.towerLayer,
        towerFireTextures[tower.id],
        pos.x * LOGICAL_CANVAS_WIDTH,
        pos.y * LOGICAL_CANVAS_HEIGHT + (options.yOffset || 0),
        TOWER_RENDER_BOX_WIDTH * levelScale,
        TOWER_RENDER_BOX_HEIGHT * levelScale,
        frameIndex,
        frameCount
      );
      return;
    }
    addFittedSprite(
      pixiState.towerLayer,
      towerTextures[tower.id],
      pos.x * LOGICAL_CANVAS_WIDTH,
      pos.y * LOGICAL_CANVAS_HEIGHT + (options.yOffset || 0),
      TOWER_RENDER_BOX_WIDTH * levelScale,
      TOWER_RENDER_BOX_HEIGHT * levelScale,
      { flipY: !!options.flipY }
    );
  };

  for (let i = 0; i < 5; i += 1) {
    drawTowerSprite(state.aiTowers[i], towerPosAI[i], { owner: "ai", fireKey: `ai:${i}` });
    drawTowerSprite(state.playerTowers[i], towerPosPlayer[i], { owner: "player", yOffset: -6, fireKey: `player:${i}` });
  }
}

function updatePixiDynamicTexture() {
  if (!pixiState.ready || !pixiState.legacyTexture) {
    return;
  }
  pixiState.legacyTexture.source.update();
}

function drawLane() {
  const w = canvas.width;
  const h = canvas.height;
  if (pixiState.ready) {
    ctx.clearRect(0, 0, w, h);
    return;
  }
  if (battlefieldBackgroundImage.complete && battlefieldBackgroundImage.naturalWidth > 0) {
    ctx.drawImage(battlefieldBackgroundImage, 0, 0, w, h);
    return;
  }
  if (!laneBackgroundCanvas || laneBackgroundCanvas.width !== w || laneBackgroundCanvas.height !== h) {
    laneBackgroundCanvas = createOffscreenCanvas(w, h);
    const laneCtx = laneBackgroundCanvas.getContext("2d");
    laneCtx.fillStyle = "#6f6a78";
    laneCtx.fillRect(0, 0, w, h);

    laneCtx.fillStyle = "rgba(255,255,255,0.07)";
    laneCtx.fillRect(0, 0, w, h * 0.48);

    laneCtx.fillStyle = "rgba(0,0,0,0.07)";
    laneCtx.fillRect(0, h * 0.52, w, h * 0.48);

    laneCtx.strokeStyle = "rgba(255,255,255,0.2)";
    laneCtx.lineWidth = 2;
    laneCtx.beginPath();
    laneCtx.moveTo(w * 0.02, h * 0.5);
    laneCtx.lineTo(w * 0.98, h * 0.5);
    laneCtx.stroke();
  }

  ctx.drawImage(laneBackgroundCanvas, 0, 0);
}

function drawTowerRanges() {
  const drawTower = (tower, pos) => {
    if (!tower) {
      return;
    }
    const x = canvas.width * pos.x;
    const y = canvas.height * pos.y;
    const range = tower.range * canvas.width;
    const facingUp = pos.y > 0.5;
    const baseAngle = facingUp ? -Math.PI / 2 : Math.PI / 2;
    const halfAngle = tower.coneHalfAngleRad || ((BASE_TOWER_CONE_DEGREES * Math.PI) / 360);
    const startAngle = baseAngle - halfAngle;
    const endAngle = baseAngle + halfAngle;

    ctx.fillStyle = `${tower.color}33`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  };

  for (let i = 0; i < 5; i += 1) {
    drawTower(state.playerTowers[i], towerPosPlayer[i]);
    drawTower(state.aiTowers[i], towerPosAI[i]);
  }
}

function getBattlefieldDepth(yNorm) {
  const y = yNorm * LOGICAL_CANVAS_HEIGHT;
  const top = BATTLEFIELD_BOUNDS.y;
  const bottom = BATTLEFIELD_BOUNDS.y + BATTLEFIELD_BOUNDS.height;
  return 1 - clamp((y - top) / Math.max(1, bottom - top), 0, 1);
}

function drawSoftOvalShadow(x, y, width, height, alpha) {
  const color = OBJECT_SHADOWS.color;
  ctx.save();
  ctx.fillStyle = `rgba(${color}, ${alpha * 0.48})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width * 0.62, height * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(${color}, ${alpha * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width * 0.82, height * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawObjectShadow(xNorm, yNorm, renderWidth, renderHeight, kind) {
  const cfg = OBJECT_SHADOWS[kind] || OBJECT_SHADOWS.creep;
  const depth = Math.min(getBattlefieldDepth(yNorm), cfg.maxDepth ?? 1);
  const widthScale = OBJECT_SHADOWS.minWidthScale + (OBJECT_SHADOWS.maxWidthScale - OBJECT_SHADOWS.minWidthScale) * depth;
  const heightScale = OBJECT_SHADOWS.minHeightScale + (OBJECT_SHADOWS.maxHeightScale - OBJECT_SHADOWS.minHeightScale) * depth;
  const alpha = OBJECT_SHADOWS.minAlpha + (OBJECT_SHADOWS.maxAlpha - OBJECT_SHADOWS.minAlpha) * depth;
  const x = canvas.width * xNorm;
  const y = canvas.height * yNorm + renderHeight * cfg.yOffsetRatio;
  const width = renderWidth * cfg.widthRatio * widthScale;
  const height = renderHeight * cfg.heightRatio * heightScale;
  drawSoftOvalShadow(x, y, width, height, alpha);
}

function drawTowerShadows() {
  const drawTowerShadow = (tower, pos, yOffset = 0) => {
    if (!tower) {
      return;
    }
    const levelScale = Math.max(1, Number(tower.level) || 1) > 1 ? 1.16 : 1;
    drawObjectShadow(
      pos.x,
      (pos.y * LOGICAL_CANVAS_HEIGHT + yOffset) / LOGICAL_CANVAS_HEIGHT,
      TOWER_RENDER_BOX_WIDTH * levelScale,
      TOWER_RENDER_BOX_HEIGHT * levelScale,
      "tower"
    );
  };

  for (let i = 0; i < 5; i += 1) {
    drawTowerShadow(state.aiTowers[i], towerPosAI[i]);
    drawTowerShadow(state.playerTowers[i], towerPosPlayer[i], -6);
  }
}

function drawAttackerShadows(units) {
  for (const unit of units) {
    const pos = attackerPosition(unit);
    const side = getOwnerVisualSide(unit.owner);
    const spriteCfg = attackerSpriteConfigSets[side]?.[unit.defId] || attackerSpriteConfig[unit.defId];
    drawObjectShadow(
      pos.x,
      pos.y,
      spriteCfg?.renderWidth || 42,
      spriteCfg?.renderHeight || 42,
      "creep"
    );
  }
}

function drawAttackers(units) {
  for (const unit of units) {
    const pos = attackerPosition(unit);
    const x = canvas.width * pos.x;
    const y = canvas.height * pos.y;
    const side = getOwnerVisualSide(unit.owner);
    const spriteCfg = attackerSpriteConfigSets[side]?.[unit.defId] || attackerSpriteConfig[unit.defId];
    const renderWidth = spriteCfg?.renderWidth || 42;
    const renderHeight = spriteCfg?.renderHeight || 42;

    const spriteImg = attackerSpriteSets[side]?.[unit.defId] || attackerSprites[unit.defId];
    if (spriteCfg && spriteImg && spriteImg.complete) {
      const frame = Math.floor(state.animationClock * spriteCfg.fps) % spriteCfg.frames;
      const shouldInvertForAI = unit.owner === "ai" && (unit.defId === "wisp" || unit.defId === "tank");
      if (shouldInvertForAI) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, -1);
        ctx.drawImage(
          spriteImg,
          frame * spriteCfg.frameWidth,
          0,
          spriteCfg.frameWidth,
          spriteCfg.frameHeight,
          -renderWidth / 2,
          -renderHeight / 2,
          renderWidth,
          renderHeight
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          spriteImg,
          frame * spriteCfg.frameWidth,
          0,
          spriteCfg.frameWidth,
          spriteCfg.frameHeight,
          x - renderWidth / 2,
          y - renderHeight / 2,
          renderWidth,
          renderHeight
        );
      }
    } else {
      ctx.fillStyle = unit.color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const hpRatio = clamp(unit.hp / unit.maxHp, 0, 1);
    const hpBarY = y - (renderHeight / 2) - 6;
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 10, hpBarY, 20, 3);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 10, hpBarY, 20 * hpRatio, 3);

    if (unit.poisonTimer > 0) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.38)";
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i += 1) {
        const a = state.animationClock * 5 + unit.id * 0.7 + i;
        ctx.fillStyle = "rgba(134, 239, 172, 0.7)";
        ctx.fillRect(
          x + Math.cos(a) * (4 + i * 0.7),
          y + Math.sin(a * 1.3) * (4 + i * 0.6),
          2,
          2
        );
      }
    }
  }
}

function drawTankCreepRanges() {
  const stats = getTankWeaponStats();
  const halfAngle = (180 * Math.PI) / 360;
  const drawForUnits = (units, facingUp) => {
    const baseAngle = facingUp ? -Math.PI / 2 : Math.PI / 2;
    const startAngle = baseAngle - halfAngle;
    const endAngle = baseAngle + halfAngle;
    for (const unit of units) {
      if (unit.defId !== "tank" || unit.hp <= 0 || unit.isDefeated || unit.progress >= 1) {
        continue;
      }
      const pos = attackerPosition(unit);
      const x = canvas.width * pos.x;
      const y = canvas.height * pos.y;
      const rangePx = stats.range * canvas.width;
      ctx.fillStyle = "rgba(20, 83, 45, 0.16)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, rangePx, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }
  };
  drawForUnits(state.attackersPlayer, true);
  drawForUnits(state.attackersAI, false);
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    const x = canvas.width * projectile.x;
    const y = canvas.height * projectile.y;
    if (projectile.towerId === "violet") {
      const trail = projectile.trail;
      const pNow = trail[trail.length - 1] || { x: projectile.x, y: projectile.y };
      const pPrev = trail[Math.max(0, trail.length - 4)] || { x: projectile.prevX, y: projectile.prevY };
      const x0 = canvas.width * pPrev.x;
      const y0 = canvas.height * pPrev.y;
      const x1 = canvas.width * pNow.x;
      const y1 = canvas.height * pNow.y;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const streak = 18;
      const backX = x1 - ux * streak;
      const backY = y1 - uy * streak;

      ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(backX, backY);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.strokeStyle = "rgba(233, 213, 255, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(backX + ux * 3, backY + uy * 3);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      continue;
    }

    if (projectile.towerId === "yellow") {
      const trail = projectile.trail;
      if (trail.length > 1) {
        ctx.lineCap = "round";
        for (let i = 1; i < trail.length; i += 1) {
          const p0 = trail[i - 1];
          const p1 = trail[i];
          const x0 = canvas.width * p0.x;
          const y0 = canvas.height * p0.y;
          const x1 = canvas.width * p1.x;
          const y1 = canvas.height * p1.y;
          const midX = (x0 + x1) * 0.5;
          const midY = (y0 + y1) * 0.5;
          const jitter = ((projectile.id + i) % 2 === 0 ? 1 : -1) * 3;

          ctx.strokeStyle = "rgba(250, 204, 21, 0.42)";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(midX + jitter, midY - jitter);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(x, y, 3.1, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (projectile.towerId === "red") {
      const pulse = 0.85 + 0.2 * Math.sin(state.animationClock * 25 + projectile.id);
      const radius = 3.1 * pulse;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fca5a5";
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 0.8, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 4; i += 1) {
        const angle = state.animationClock * 9 + projectile.id * 0.3 + i * (Math.PI / 2);
        const sx = x + Math.cos(angle) * 4.2;
        const sy = y + Math.sin(angle) * 4.2;
        ctx.fillStyle = i % 2 === 0 ? "#fb7185" : "#f97316";
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      continue;
    }

    if (projectile.towerId === "green") {
      const trail = projectile.trail;
      const pNow = trail[trail.length - 1] || { x: projectile.x, y: projectile.y };
      const pPrev = trail[Math.max(0, trail.length - 3)] || { x: projectile.prevX, y: projectile.prevY };
      const x0 = canvas.width * pPrev.x;
      const y0 = canvas.height * pPrev.y;
      const x1 = canvas.width * pNow.x;
      const y1 = canvas.height * pNow.y;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;

      const trailLen = 14;
      ctx.strokeStyle = "rgba(74, 222, 128, 0.55)";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.2) {
        const bx = x1 - ux * trailLen * t;
        const by = y1 - uy * trailLen * t;
        const twist = Math.sin((state.animationClock * 40) + projectile.id + t * 8) * (2.2 * (1 - t));
        const tx = bx + px * twist;
        const ty = by + py * twist;
        if (t === 0) {
          ctx.moveTo(tx, ty);
        } else {
          ctx.lineTo(tx, ty);
        }
      }
      ctx.stroke();

      const tipX = x1;
      const tipY = y1;
      const backX = tipX - ux * 8;
      const backY = tipY - uy * 8;
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(backX + px * 3.4, backY + py * 3.4);
      ctx.lineTo(backX - px * 3.4, backY - py * 3.4);
      ctx.closePath();
      ctx.fill();
      continue;
    }

    if (projectile.towerId === "blue") {
      ctx.fillStyle = "rgba(96, 165, 250, 0.28)";
      ctx.beginPath();
      ctx.arc(x, y, 7.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(x, y, 6.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath();
      ctx.arc(x - 1.2, y - 1.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (projectile.towerId === "tank") {
      ctx.fillStyle = "rgba(20, 83, 45, 0.45)";
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14532d";
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(x, y, 3.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFireBursts() {
  for (const burst of state.fireBursts) {
    const x = canvas.width * burst.x;
    const y = canvas.height * burst.y;
    const t = clamp(burst.life / burst.maxLife, 0, 1);
    ctx.globalAlpha = 0.45 + t * 0.45;
    ctx.fillStyle = t > 0.5 ? "#fb923c" : "#fca5a5";
    ctx.fillRect(x - 1.25, y - 1.25, 2.5, 2.5);
    ctx.globalAlpha = 1;
  }
}

function drawYellowLeaps() {
  for (const leap of state.yellowLeaps) {
    const t = clamp(leap.life / leap.maxLife, 0, 1);
    const x0 = canvas.width * leap.fromX;
    const y0 = canvas.height * leap.fromY;
    const x1 = canvas.width * leap.toX;
    const y1 = canvas.height * leap.toY;
    const midX = (x0 + x1) * 0.5;
    const midY = (y0 + y1) * 0.5;
    const jitter = Math.sin(state.animationClock * 80 + leap.fromX * 17) * 4;

    ctx.globalAlpha = 0.25 + t * 0.75;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.86)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(midX + jitter, midY - jitter);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    ctx.strokeStyle = "rgba(254, 249, 195, 0.95)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(midX - jitter * 0.4, midY + jitter * 0.4);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawTowerFlashes() {
  for (const flash of state.towerFlashes) {
    const t = clamp(flash.life / flash.maxLife, 0, 1);
    const x = canvas.width * flash.x;
    const y = canvas.height * flash.y;
    const radius = 10 + (1 - t) * 18;
    ctx.fillStyle = `${flash.color}${Math.round(80 + t * 100).toString(16).padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDeathParticles() {
  for (const particle of state.deathParticles) {
    const x = canvas.width * particle.x;
    const y = canvas.height * particle.y;
    const t = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = t;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawDeathEffects() {
  const cfg = creepKillEffectConfig;
  const sprite = creepKillEffectSprite;
  if (!cfg || !sprite?.complete || sprite.naturalWidth <= 0) {
    return;
  }
  const frameCount = cfg.frames || 1;
  const frameWidth = cfg.frameWidth || Math.floor(sprite.naturalWidth / frameCount);
  const frameHeight = cfg.frameHeight || sprite.naturalHeight;
  const renderWidth = cfg.renderWidth || frameWidth;
  const renderHeight = cfg.renderHeight || frameHeight;
  for (const effect of state.deathEffects) {
    const progress = clamp(1 - effect.life / effect.maxLife, 0, 0.999);
    const frame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
    const x = canvas.width * effect.x;
    const y = canvas.height * effect.y;
    ctx.drawImage(
      sprite,
      frame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      x - renderWidth / 2,
      y - renderHeight / 2,
      renderWidth,
      renderHeight
    );
  }
}

function drawRoundBanner() {
  if (state.phase !== "banner" || state.roundBannerTimer <= 0) {
    return;
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "rgba(15, 23, 42, 0.42)";
  ctx.fillRect(w * 0.12, h * 0.41, w * 0.76, h * 0.18);
  ctx.strokeStyle = "rgba(226, 232, 240, 0.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.12, h * 0.41, w * 0.76, h * 0.18);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Prepare Yourself", w * 0.5, h * 0.47);
  ctx.font = "700 40px Trebuchet MS";
  ctx.fillText(state.roundBannerText, w * 0.5, h * 0.535);
}

function drawBoard() {
  ensurePixiViewport();
  drawLane();
  if (SHOW_RANGE_ARCS) {
    drawTowerRanges();
    drawTankCreepRanges();
  }
  drawTowerShadows();
  drawAttackerShadows(state.attackersPlayer);
  drawAttackerShadows(state.attackersAI);
  drawAttackers(state.attackersPlayer);
  drawAttackers(state.attackersAI);
  drawProjectiles();
  drawFireBursts();
  drawYellowLeaps();
  drawTowerFlashes();
  drawDeathParticles();
  drawDeathEffects();
  drawRoundBanner();
  updatePixiDynamicTexture();
  updatePixiMarkers();
  updatePixiTowers();
  updatePixiTimerFill();
  updatePixiCardStates();
  updatePixiHudText();
}

let previousTime = performance.now();
function gameLoop(timestamp) {
  const dt = clamp((timestamp - previousTime) / 1000, 0, 0.25);
  previousTime = timestamp;

  if (state.screen === "game") {
    updateGame(dt);
    drawBoard();
    refreshHUD();
  }

  requestAnimationFrame(gameLoop);
}

function returnToMenuFromMatch() {
  if (state.hasActiveMatch && !state.gameOver) {
    if (multiplayerRole !== null) {
      window.Lobby && Lobby.endSession();
      clearSavedMatchState();
      state.hasActiveMatch = false;
    } else {
      state.paused = true;
      updateStatus("Match paused from the menu.");
      saveMatchStateNow();
    }
  }
  setScreen("menu");
}

replayBtnEl.addEventListener("click", () => {
  returnToMenuFromMatch();
});

function submitReadyForBattle() {
  if (state.phase !== "prep" || state.gameOver || state.paused || state.battleSkipUsedThisRound) {
    return;
  }
  state.battleSkipUsedThisRound = true;
  state.phaseTimer = 0;
  refreshHUD();
  updateStatus(multiplayerRole !== null ? "Ready. Waiting for opponent..." : "Ready. Starting battle.");
  launchWave();
}

battleSkipBtnEl.addEventListener("click", submitReadyForBattle);
readyBtnEl?.addEventListener("click", submitReadyForBattle);

shopUpgradeBtnEl.addEventListener("click", () => {
  if (state.shopSelectionType === "tower") {
    upgradeSelectedTower();
  } else {
    upgradeSelectedAttacker();
  }
});

shopStartBtnEl.addEventListener("click", () => {
  if (state.phase !== "shop") {
    return;
  }
  if (multiplayerRole !== null && window.Lobby) {
    window.Lobby.onShopStart();
    return;
  }
  beginRoundBanner();
});

function togglePause() {
  if (state.gameOver || state.phase === "shop" || state.phase === "banner") {
    return;
  }
  state.paused = !state.paused;
  syncPauseButtons();
  syncMusicPlaybackForScreen();
  saveMatchStateNow();
  if (state.paused) {
    updateStatus("Paused.");
  } else {
    updateStatus(state.phase === "prep" ? "Prep resumed." : "Battle resumed.");
  }
}

pauseBtnEl.addEventListener("click", togglePause);
floatingPauseBtnEl?.addEventListener("click", togglePause);

playMatchBtnEl.addEventListener("click", () => {
  startNewMatch();
});

resumeMatchBtnEl.addEventListener("click", () => {
  if (!state.hasActiveMatch || state.gameOver || multiplayerRole !== null) {
    return;
  }
  state.paused = false;
  setScreen("game");
  lockLandscapeOrientation();
  refreshAllUI();
  updateStatus(state.phase === "prep" ? "Prep resumed." : "Battle resumed.");
});

openRecordsBtnEl.addEventListener("click", () => {
  setScreen("records");
});

openGauntletBtnEl.addEventListener("click", () => {
  setScreen("gauntlet");
});

gauntletBackBtnEl.addEventListener("click", () => {
  setScreen("menu");
});

gauntletStartBtnEl.addEventListener("click", () => {
  startGauntletChallenge();
});

openDifficultyOptionsBtnEl.addEventListener("click", () => {
  setScreen("difficultyOptions");
});

openMusicOptionsBtnEl.addEventListener("click", () => {
  setScreen("musicOptions");
});

openArtOptionsBtnEl.addEventListener("click", () => {
  setScreen("artOptions");
});

for (const optionsBackBtnEl of optionsBackBtnEls) {
  optionsBackBtnEl.addEventListener("click", () => {
    setScreen("menu");
  });
}

musicVolumeSliderEl.addEventListener("input", (event) => {
  setMusicVolume(event.target.value);
});

sfxVolumeSliderEl.addEventListener("input", (event) => {
  setSfxVolume(event.target.value);
});

difficultyListEl.addEventListener("click", (event) => {
  const option = event.target.closest(".difficulty-option");
  if (!option) {
    return;
  }
  setDifficulty(option.dataset.difficulty);
});

musicPackGridEl.addEventListener("click", (event) => {
  if (event.target.closest(".music-composer-link")) {
    return;
  }
  const option = event.target.closest(".music-pack-option");
  if (!option) {
    return;
  }
  setMusicPack(option.dataset.musicPack);
});

musicPackGridEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  const option = event.target.closest(".music-pack-option");
  if (!option) {
    return;
  }
  event.preventDefault();
  setMusicPack(option.dataset.musicPack);
});

artPackGridEl.addEventListener("click", (event) => {
  if (event.target.closest(".artist-social-link")) {
    return;
  }
  const option = event.target.closest(".art-pack-option");
  if (!option) {
    return;
  }
  setArtPack(option.dataset.artPack);
});

artPackGridEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  const option = event.target.closest(".art-pack-option");
  if (!option) {
    return;
  }
  event.preventDefault();
  setArtPack(option.dataset.artPack);
});

recordsBackBtnEl.addEventListener("click", () => {
  setScreen("menu");
});

progressBtnEl?.addEventListener("click", () => {
  if (state.hasActiveMatch && !state.gameOver) {
    if (multiplayerRole !== null) {
      window.Lobby && Lobby.endSession();
      clearSavedMatchState();
      state.hasActiveMatch = false;
    } else {
      state.paused = true;
      saveMatchStateNow();
    }
  }
  setScreen("records");
});

homeBtnEl?.addEventListener("click", () => {
  returnToMenuFromMatch();
});

matchPlayAgainBtnEl.addEventListener("click", () => {
  startNewMatch();
});

matchContinueBtnEl?.addEventListener("click", () => {
  continueFromMatchResults();
});

matchEndOverlayEl?.addEventListener("click", () => {
  if (!pendingGauntletReturn) {
    return;
  }
  continueFromMatchResults();
});

matchRecordsBtnEl?.addEventListener("click", () => {
  setScreen("records");
});

matchHomeBtnEl.addEventListener("click", () => {
  returnToMenuFromMatch();
});

createTowerSlots();
setupArenaDrop();
updateViewportHeight();
loadOptions();
initLoadingAnimatic();
loadGauntletProgress();
createCards();
loadPersistentStats();
resetMatch();
const restoredMatch = restoreSavedMatchState();
state.hasActiveMatch = restoredMatch;
state.paused = restoredMatch;
setScreen("menu");
lockLandscapeOrientation();
registerNativeAppLifecycle();
resizeBattlefieldFrame();
refreshAllUI();
ensurePixiViewport();
requestAnimationFrame(gameLoop);
