// Open5e API response shapes

export interface Open5eWeaponDamageType {
  name: string;
  key: string;
}

export interface Open5eWeaponProperty {
  property: {
    name: string;
    type: string | null;
    desc: string;
  };
  detail: string | null;
}

export interface Open5eWeaponDetails {
  name: string;
  key: string;
  damage_dice: string | null;
  damage_type: Open5eWeaponDamageType | null;
  properties: Open5eWeaponProperty[];
  is_simple: boolean;
  is_martial: boolean;
  distance_unit: string;
}

export interface Open5eArmorDetails {
  name: string;
  category: string; // light / medium / heavy / shield
  ac_base: number;
  ac_display: string;
  ac_add_dexmod: boolean;
  ac_cap_dexmod: number | null;
  grants_stealth_disadvantage: boolean;
  strength_score_required: number | null;
}

export interface Open5eRarity {
  name: string;
  key: string;
  rank: number;
}

export interface Open5eCategory {
  name: string;
  key: string;
}

export interface Open5eItem {
  key: string;
  name: string;
  desc: string;
  category: Open5eCategory;
  rarity: Open5eRarity;
  weapon: Open5eWeaponDetails | null;
  armor: Open5eArmorDetails | null;
  weight: string;
  weight_unit: string;
  cost: string;
  requires_attunement: boolean;
  attunement_detail: string | null;
}

export interface Open5eListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Open5eItem[];
}

// Internal cache entry stored per item key
export interface CachedItemData {
  generatedDescription: string;
  imageFilename: string;
}

// Fully resolved item ready to render
export interface RenderedItem {
  item: Open5eItem;
  generatedDescription: string;
  imageFilename: string;
  categoryLabel: string;
}
