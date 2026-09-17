// Ludhiana Geographic Resolver and Landmark Registry

export interface GeoLocationResult {
  lat: number;
  lng: number;
  ward_no: number | null;
  ward_name: string | null;
  zone: "A" | "B" | "C" | "D" | "Citywide";
  matched_name: string;
  is_exact_ward: boolean;
}

// Built-in Ludhiana Landmark & Locality Gazetteer
export const LUDHIANA_LANDMARKS: Record<string, { lat: number; lng: number; ward: number; zone: "A" | "B" | "C" | "D" }> = {
  // Zone D (West & South-West)
  "ghumar mandi": { lat: 30.9028, lng: 75.8285, ward: 56, zone: "D" },
  "sarabha nagar": { lat: 30.8856, lng: 75.8115, ward: 58, zone: "D" },
  "model town": { lat: 30.8872, lng: 75.8398, ward: 46, zone: "D" },
  "brs nagar": { lat: 30.8785, lng: 75.7950, ward: 62, zone: "D" },
  "bhai randhir singh nagar": { lat: 30.8785, lng: 75.7950, ward: 62, zone: "D" },
  "ferozepur road": { lat: 30.8950, lng: 75.8050, ward: 55, zone: "D" },
  "ferozepur rd": { lat: 30.8950, lng: 75.8050, ward: 55, zone: "D" },
  "aggar nagar": { lat: 30.8900, lng: 75.7950, ward: 57, zone: "D" },
  "pau": { lat: 30.9010, lng: 75.8150, ward: 54, zone: "D" },
  "punjab agricultural university": { lat: 30.9010, lng: 75.8150, ward: 54, zone: "D" },
  "gurdev nagar": { lat: 30.9000, lng: 75.8350, ward: 54, zone: "D" },
  "kitchlu nagar": { lat: 30.9120, lng: 75.8200, ward: 68, zone: "D" },
  "tagore nagar": { lat: 30.9080, lng: 75.8250, ward: 68, zone: "D" },
  "south city": { lat: 30.8920, lng: 75.7720, ward: 60, zone: "D" },
  "barewal": { lat: 30.8880, lng: 75.7800, ward: 61, zone: "D" },
  "barewal road": { lat: 30.8880, lng: 75.7800, ward: 61, zone: "D" },
  "ayali kalan": { lat: 30.8850, lng: 75.7600, ward: 61, zone: "D" },
  "dugri": { lat: 30.8650, lng: 75.8320, ward: 45, zone: "D" },
  "dugri road": { lat: 30.8680, lng: 75.8350, ward: 45, zone: "D" },
  "sidhwan canal": { lat: 30.8700, lng: 75.8250, ward: 48, zone: "D" },
  "canal road": { lat: 30.8750, lng: 75.8200, ward: 48, zone: "D" },
  "bhaiwala chowk": { lat: 30.8980, lng: 75.8220, ward: 55, zone: "D" },
  "aarti chowk": { lat: 30.8990, lng: 75.8260, ward: 55, zone: "D" },
  "malhar road": { lat: 30.8920, lng: 75.8230, ward: 58, zone: "D" },
  "pakhowal road": { lat: 30.8750, lng: 75.8150, ward: 59, zone: "D" },
  "sunet": { lat: 30.8720, lng: 75.7900, ward: 62, zone: "D" },

  // Zone A (North & Old City)
  "haibowal": { lat: 30.9205, lng: 75.8302, ward: 65, zone: "A" },
  "haibowal kalan": { lat: 30.9220, lng: 75.8280, ward: 65, zone: "A" },
  "haibowal khurd": { lat: 30.9190, lng: 75.8320, ward: 65, zone: "A" },
  "chander nagar": { lat: 30.9220, lng: 75.8150, ward: 66, zone: "A" },
  "deep nagar": { lat: 30.9200, lng: 75.8100, ward: 66, zone: "A" },
  "clock tower": { lat: 30.9125, lng: 75.8522, ward: 22, zone: "A" },
  "ghanta ghar": { lat: 30.9125, lng: 75.8522, ward: 22, zone: "A" },
  "chaura bazar": { lat: 30.9150, lng: 75.8550, ward: 21, zone: "A" },
  "mata rani chowk": { lat: 30.9100, lng: 75.8580, ward: 20, zone: "A" },
  "mcl zone a": { lat: 30.9100, lng: 75.8580, ward: 20, zone: "A" },
  "railway station": { lat: 30.9080, lng: 75.8600, ward: 20, zone: "A" },
  "daresi": { lat: 30.9240, lng: 75.8610, ward: 15, zone: "A" },
  "daresi ground": { lat: 30.9240, lng: 75.8610, ward: 15, zone: "A" },
  "shivpuri": { lat: 30.9280, lng: 75.8620, ward: 14, zone: "A" },
  "salem tabri": { lat: 30.9410, lng: 75.8450, ward: 5, zone: "A" },
  "jalandhar bypass": { lat: 30.9500, lng: 75.8350, ward: 4, zone: "A" },
  "buddha nullah": { lat: 30.9280, lng: 75.8400, ward: 64, zone: "A" },
  "buddha dariya": { lat: 30.9280, lng: 75.8400, ward: 64, zone: "A" },
  "sundar nagar": { lat: 30.9250, lng: 75.8680, ward: 16, zone: "A" },
  "madhopuri": { lat: 30.9210, lng: 75.8640, ward: 17, zone: "A" },
  "kundon puri": { lat: 30.9180, lng: 75.8480, ward: 22, zone: "A" },
  "civil lines": { lat: 30.9050, lng: 75.8420, ward: 52, zone: "A" },
  "dmc hospital": { lat: 30.9100, lng: 75.8320, ward: 67, zone: "A" },
  "ladhowal": { lat: 30.9800, lng: 75.8050, ward: 1, zone: "A" },
  "bharti colony": { lat: 30.9320, lng: 75.8420, ward: 3, zone: "A" },

  // Zone B (East & North-East)
  "samrala chowk": { lat: 30.9080, lng: 75.8850, ward: 28, zone: "B" },
  "cheema chowk": { lat: 30.9020, lng: 75.8810, ward: 29, zone: "B" },
  "focal point": { lat: 30.8845, lng: 75.9080, ward: 30, zone: "B" },
  "tajpur road": { lat: 30.9200, lng: 75.9100, ward: 12, zone: "B" },
  "central jail": { lat: 30.9230, lng: 75.9150, ward: 12, zone: "B" },
  "moti nagar": { lat: 30.8980, lng: 75.8950, ward: 27, zone: "B" },
  "transport nagar": { lat: 30.8920, lng: 75.8900, ward: 27, zone: "B" },
  "rahon road": { lat: 30.9320, lng: 75.8750, ward: 9, zone: "B" },
  "basti jodhewal": { lat: 30.9280, lng: 75.8720, ward: 11, zone: "B" },
  "shingar cinema": { lat: 30.9160, lng: 75.8720, ward: 18, zone: "B" },
  "shingar road": { lat: 30.9160, lng: 75.8720, ward: 18, zone: "B" },
  "tibba road": { lat: 30.9350, lng: 75.8900, ward: 10, zone: "B" },
  "subhash nagar": { lat: 30.9300, lng: 75.8880, ward: 10, zone: "B" },
  "mundian kalan": { lat: 30.9050, lng: 75.9350, ward: 25, zone: "B" },
  "mundian khurd": { lat: 30.9080, lng: 75.9400, ward: 25, zone: "B" },
  "kakowal road": { lat: 30.9450, lng: 75.8650, ward: 8, zone: "B" },
  "noorwala road": { lat: 30.9480, lng: 75.8700, ward: 8, zone: "B" },
  "guru gobind singh nagar": { lat: 30.9120, lng: 75.8920, ward: 26, zone: "B" },
  "chander nagar east": { lat: 30.9150, lng: 75.8900, ward: 26, zone: "B" },
  "sahnewal": { lat: 30.8400, lng: 75.9800, ward: 30, zone: "B" },

  // Zone C (South & South-East)
  "gill road": { lat: 30.8752, lng: 75.8610, ward: 40, zone: "C" },
  "shimlapuri": { lat: 30.8620, lng: 75.8550, ward: 42, zone: "C" },
  "barota road": { lat: 30.8580, lng: 75.8580, ward: 42, zone: "C" },
  "daba": { lat: 30.8650, lng: 75.8780, ward: 36, zone: "C" },
  "daba road": { lat: 30.8650, lng: 75.8780, ward: 36, zone: "C" },
  "giaspura": { lat: 30.8680, lng: 75.8920, ward: 33, zone: "C" },
  "sherpur chowk": { lat: 30.8880, lng: 75.8950, ward: 32, zone: "C" },
  "sherpur": { lat: 30.8880, lng: 75.8950, ward: 32, zone: "C" },
  "miller ganj": { lat: 30.8920, lng: 75.8600, ward: 38, zone: "C" },
  "vishwakarma chowk": { lat: 30.8950, lng: 75.8620, ward: 38, zone: "C" },
  "field ganj": { lat: 30.9020, lng: 75.8550, ward: 37, zone: "C" },
  "jagraon bridge": { lat: 30.9040, lng: 75.8580, ward: 37, zone: "C" },
  "dholewal chowk": { lat: 30.8960, lng: 75.8680, ward: 39, zone: "C" },
  "dholewal": { lat: 30.8960, lng: 75.8680, ward: 39, zone: "C" },
  "lohara": { lat: 30.8450, lng: 75.9050, ward: 31, zone: "C" },
  "dhandari kalan": { lat: 30.8520, lng: 75.9200, ward: 31, zone: "C" },
  // Additional Zone D landmarks
  "bus stand": { lat: 30.9020, lng: 75.8380, ward: 52, zone: "D" },
  "atam nagar": { lat: 30.8780, lng: 75.8450, ward: 44, zone: "D" },
  "model town market": { lat: 30.8872, lng: 75.8398, ward: 46, zone: "D" },
  "sarabha nagar market": { lat: 30.8856, lng: 75.8115, ward: 58, zone: "D" },
  "sarabha nagar police station": { lat: 30.8856, lng: 75.8115, ward: 58, zone: "D" },

  // Additional Zone A landmarks
  "chand cinema": { lat: 30.9250, lng: 75.8580, ward: 15, zone: "A" },
  "joshi nagar": { lat: 30.9220, lng: 75.8320, ward: 65, zone: "A" },
  "jassian road": { lat: 30.9350, lng: 75.8300, ward: 65, zone: "A" },
  "sangam chowk": { lat: 30.9120, lng: 75.8580, ward: 21, zone: "A" },
  "civil hospital": { lat: 30.9130, lng: 75.8620, ward: 20, zone: "A" },
  "budha nullah": { lat: 30.9280, lng: 75.8400, ward: 64, zone: "A" },
  "budha dariya": { lat: 30.9280, lng: 75.8400, ward: 64, zone: "A" },

  // Additional Zone B landmarks
  "dana mandi": { lat: 30.9320, lng: 75.8750, ward: 9, zone: "B" },
  "baldev nagar": { lat: 30.9350, lng: 75.8720, ward: 9, zone: "B" },
  "krishna colony": { lat: 30.9380, lng: 75.8780, ward: 9, zone: "B" },
  "meharban": { lat: 30.9420, lng: 75.8850, ward: 9, zone: "B" },
  "cmc hospital": { lat: 30.9160, lng: 75.8680, ward: 18, zone: "B" },

  // Additional Zone C landmarks
  "gill chowk": { lat: 30.8850, lng: 75.8610, ward: 40, zone: "C" },
  "chet singh nagar": { lat: 30.8720, lng: 75.8680, ward: 41, zone: "C" },
  "janakpuri": { lat: 30.9000, lng: 75.8720, ward: 35, zone: "C" },
  "industrial area a": { lat: 30.8980, lng: 75.8700, ward: 35, zone: "C" },
  "industrial area b": { lat: 30.8900, lng: 75.8750, ward: 34, zone: "C" }
};

// Fallback City Center coordinate (MCL HQ - Zone A)
export const MCL_HQ_COORDS = { lat: 30.9100, lng: 75.8580 };

// Resolves extracted location text string to coordinates and Ward
export function resolveLocation(
  whereText: string,
  headlineText: string = "",
  wardCentroids: Record<string, { ward_no: number; zone: "A" | "B" | "C" | "D"; lat: number; lng: number }> = {}
): GeoLocationResult {
  const combined = `${whereText} ${headlineText}`.toLowerCase();

  // 1. Direct Regex search for Ward number: "Ward 32", "Ward No 15", "Ward-4", "ਵਾਰਡ 12", "वार्ड 34"
  const wardRegex = /(?:ward|ward\s*no\.?|ward\s*number|ਵਾਰਡ|वार्ड)\s*[-:#]?\s*(\d{1,2})\b/i;
  const match = combined.match(wardRegex);
  if (match) {
    const wardNum = parseInt(match[1], 10);
    if (wardNum >= 1 && wardNum <= 95 && wardCentroids[String(wardNum)]) {
      const info = wardCentroids[String(wardNum)];
      return {
        lat: info.lat,
        lng: info.lng,
        ward_no: wardNum,
        ward_name: `Ward ${wardNum}`,
        zone: info.zone,
        matched_name: `Ward ${wardNum}`,
        is_exact_ward: true
      };
    }
  }

  // 2. Search against curated Ludhiana Gazetteer
  for (const [landmark, data] of Object.entries(LUDHIANA_LANDMARKS)) {
    if (combined.includes(landmark)) {
      // If we have accurate centroid for the associated ward from GeoJSON, prefer it
      let finalLat = data.lat;
      let finalLng = data.lng;
      if (wardCentroids[String(data.ward)]) {
        const c = wardCentroids[String(data.ward)];
        finalLat = c.lat > 50 ? c.lng : c.lat;
        finalLng = c.lng < 50 ? c.lat : c.lng;
      }
      return {
        lat: finalLat,
        lng: finalLng,
        ward_no: data.ward,
        ward_name: `Ward ${data.ward} (${landmark.toUpperCase()})`,
        zone: data.zone,
        matched_name: landmark.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
        is_exact_ward: false
      };
    }
  }

  // 3. Fallback: Check Zone mentions
  if (combined.includes("zone a") || combined.includes("zone-a")) {
    return { lat: 30.9150, lng: 75.8550, ward_no: null, ward_name: "Zone A (General)", zone: "A", matched_name: "Zone A", is_exact_ward: false };
  }
  if (combined.includes("zone b") || combined.includes("zone-b")) {
    return { lat: 30.9100, lng: 75.8950, ward_no: null, ward_name: "Zone B (General)", zone: "B", matched_name: "Zone B", is_exact_ward: false };
  }
  if (combined.includes("zone c") || combined.includes("zone-c")) {
    return { lat: 30.8750, lng: 75.8700, ward_no: null, ward_name: "Zone C (General)", zone: "C", matched_name: "Zone C", is_exact_ward: false };
  }
  if (combined.includes("zone d") || combined.includes("zone-d")) {
    return { lat: 30.8900, lng: 75.8150, ward_no: null, ward_name: "Zone D (General)", zone: "D", matched_name: "Zone D", is_exact_ward: false };
  }

  // 4. Default Citywide fallback
  return {
    lat: MCL_HQ_COORDS.lat,
    lng: MCL_HQ_COORDS.lng,
    ward_no: null,
    ward_name: "Ludhiana Citywide",
    zone: "Citywide",
    matched_name: whereText.trim() && whereText !== "Not specified" ? whereText : "MCL General",
    is_exact_ward: false
  };
}

// Keywords indicating active localized citizen grievances & physical failures
export const GRIEVANCE_ACTIONABLE_KEYWORDS = [
  "choke", "choked", "overflow", "leakage", "dirty water", "contaminated",
  "pothole", "crater", "caved", "broken", "dilapidated", "damaged", "unrepaired",
  "garbage", "dump", "trash", "waste", "filth", "unlifted", "stench", "foul",
  "encroachment", "illegal", "unauthorized", "demolition", "sealing", "violation",
  "dengue", "mosquito", "fogging", "waterlogging", "flood", "stagnant", "flooding",
  "stray dog", "dog bite", "cattle", "bribe", "corruption", "scam", "protest",
  "dharna", "agitation", "outrage", "complaint", "crisis", "accident", "death", "failure",
  "darkness", "streetlight", "wire", "park maintenance", "weed", "sludge", "nullah", "dariya",
  "sewer", "sewerage", "drain", "drainage", "water supply", "manhole", "pipe"
];

// Keywords indicating general administrative, ceremonial, or tax policy notices
export const ADMINISTRATIVE_GENERAL_KEYWORDS = [
  "meeting", "held meeting", "reviewed", "inaugurated", "felicitated", "plantation",
  "rebate", "tax scheme", "ots", "one time settlement", "budget", "awareness",
  "camp", "exhibition", "celebration", "ceremony", "sports", "seminar", "advisory",
  "appeal", "appealed", "guidelines", "holiday", "rally", "applauded", "transfer",
  "chargesheet", "posted", "f&cc", "general branch", "internal order"
];

export type ContentCategory = "civic_grievance" | "administrative_notice" | "policy_scheme";

// Classifies if an item represents an active physical ground grievance
export function isActionableGrievance(item: { headline: string; body?: string; summary?: any; severity?: string; department?: string }): boolean {
  // If summary already has explicit flag from pipeline
  if (typeof item.summary === "object" && item.summary !== null) {
    if (typeof item.summary.is_actionable_grievance === "boolean") {
      return item.summary.is_actionable_grievance;
    }
  }

  const what = typeof item.summary === "object" && item.summary !== null ? item.summary.what || "" : (typeof item.summary === "string" ? item.summary : "");
  const combined = `${item.headline} ${what} ${item.body || ""}`.toLowerCase();

  const hasGrievanceKw = GRIEVANCE_ACTIONABLE_KEYWORDS.some(k => combined.includes(k));
  const hasAdminKw = ADMINISTRATIVE_GENERAL_KEYWORDS.some(k => combined.includes(k));

  // High severity is almost always an urgent grievance
  if (item.severity === "High") {
    return true;
  }

  // Core municipal operations departments (O&M, SWM, B&R, Sanitation) are primarily grievances unless purely ceremonial
  const coreGrievanceDepts = [
    "Operations & Maintenance (O&M)",
    "Solid Waste Management (SWM)",
    "Bridges & Roads (B&R)",
    "Sanitation & Vector Control"
  ];

  if (coreGrievanceDepts.includes(item.department || "") && !hasAdminKw) {
    return true;
  }

  if (hasGrievanceKw) {
    return true;
  }

  return false;
}

// Determines granular content category
export function classifyContentCategory(item: { headline: string; body?: string; summary?: any; severity?: string; department?: string }): ContentCategory {
  const what = typeof item.summary === "object" && item.summary !== null ? item.summary.what || "" : (typeof item.summary === "string" ? item.summary : "");
  const combined = `${item.headline} ${what} ${item.body || ""}`.toLowerCase();

  if (combined.includes("tax") || combined.includes("rebate") || combined.includes("ots") || combined.includes("scheme") || combined.includes("discount") || combined.includes("exemption")) {
    return "policy_scheme";
  }

  if (isActionableGrievance(item)) {
    return "civic_grievance";
  }

  return "administrative_notice";
}

