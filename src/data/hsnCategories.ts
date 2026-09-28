import { Invoice, InventoryItem } from '../types';

export interface HsnDirectoryEntry {
  code: string;
  description: string;
  category: string;
  defaultGstRate: number;
  type: 'goods' | 'services';
  keywords: string[];
}

export interface HsnSuggestion {
  code: string;
  description: string;
  category: string;
  defaultGstRate: number;
  type: 'goods' | 'services';
  usageCount: number;
  frequencyBadge: 'Most Frequent' | 'Frequent' | 'Recommended' | 'Directory';
  isHistorical: boolean;
}

export const PRODUCT_CATEGORIES = [
  'Electronics & Electricals',
  'Computers, IT & Peripherals',
  'IT & Software Services (SAC)',
  'Industrial Machinery & Mechanical',
  'Iron, Steel & Hardware',
  'Automotive & Spare Parts',
  'Textiles, Apparel & Garments',
  'Furniture & Fixtures',
  'Construction, Paints & Sanitary',
  'Chemicals, Plastics & Packaging',
  'Healthcare & Pharmaceuticals',
  'Food, Beverages & FMCG',
  'Consulting & Professional Services (SAC)',
  'Logistics, Transport & Courier (SAC)',
  'Hospitality & Restaurant (SAC)',
  'Stationery & Office Supplies',
  'General Merchandise',
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// Comprehensive Statutory Directory of HSN/SAC Codes Mapped by Category
export const HSN_DIRECTORY: HsnDirectoryEntry[] = [
  // --- 1. Electronics & Electricals ---
  {
    code: '8536',
    description: 'Electrical apparatus for switching or protecting electrical circuits (switches, relays, fuses, plugs, sockets)',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['switch', 'relay', 'fuse', 'socket', 'plug', 'mcb', 'breaker', 'connector', 'board', 'electrical'],
  },
  {
    code: '8544',
    description: 'Insulated wire, cable and other insulated electric conductors; optical fibre cables',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['wire', 'cable', 'cord', 'copper wire', 'conduit', 'power cable', 'conductor'],
  },
  {
    code: '8517',
    description: 'Telephone sets, smartphones, cellular networks, telecommunication apparatus',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['phone', 'mobile', 'smartphone', 'router', 'modem', 'intercom', 'telecom'],
  },
  {
    code: '8528',
    description: 'Monitors, projectors, television receivers, LED displays',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['monitor', 'screen', 'tv', 'display', 'projector', 'led display', 'television'],
  },
  {
    code: '8504',
    description: 'Electrical transformers, static converters (rectifiers, inverters, chargers) and inductors',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['transformer', 'inverter', 'ups', 'charger', 'adapter', 'power supply', 'smps'],
  },
  {
    code: '8539',
    description: 'Electric filament or discharge lamps; LED lamps and LED light fittings',
    category: 'Electronics & Electricals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['led', 'bulb', 'light', 'lamp', 'tube', 'luminaire', 'lighting', 'panel light'],
  },
  {
    code: '8507',
    description: 'Electric accumulators, including separators; lead-acid, lithium-ion storage batteries',
    category: 'Electronics & Electricals',
    defaultGstRate: 28,
    type: 'goods',
    keywords: ['battery', 'accumulator', 'lithium', 'inverter battery', 'cell', 'powerbank'],
  },

  // --- 2. Computers, IT & Peripherals ---
  {
    code: '8471',
    description: 'Automatic data processing machines (computers, laptops, servers, tablets, microprocessors)',
    category: 'Computers, IT & Peripherals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['laptop', 'computer', 'pc', 'server', 'desktop', 'tablet', 'cpu', 'macbook', 'workstation'],
  },
  {
    code: '8443',
    description: 'Printing machinery, multifunction printers, scanners, photocopiers, printer cartridges',
    category: 'Computers, IT & Peripherals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['printer', 'scanner', 'copier', 'cartridge', 'toner', 'ink', 'plotter'],
  },
  {
    code: '8523',
    description: 'Discs, solid-state non-volatile storage (SSD, USB pendrives, memory cards, hard disks)',
    category: 'Computers, IT & Peripherals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['ssd', 'hard disk', 'hdd', 'pendrive', 'usb', 'memory card', 'drive', 'storage', 'flash drive'],
  },
  {
    code: '8473',
    description: 'Parts and accessories for automatic data processing machines (keyboards, mouse, motherboards, RAM)',
    category: 'Computers, IT & Peripherals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['keyboard', 'mouse', 'ram', 'motherboard', 'gpu', 'graphic card', 'accessories', 'webcam'],
  },
  {
    code: '8518',
    description: 'Microphones, loudspeakers, headphones, earphones and audio amplifiers',
    category: 'Computers, IT & Peripherals',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['headphone', 'headset', 'earphone', 'speaker', 'mic', 'microphone', 'audio'],
  },

  // --- 3. IT & Software Services (SAC) ---
  {
    code: '9983',
    description: 'Other professional, technical and business services; IT consultancy, software development, cloud hosting',
    category: 'IT & Software Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['software', 'development', 'it service', 'consulting', 'programming', 'app development', 'cloud', 'api', 'saas'],
  },
  {
    code: '9984',
    description: 'Telecommunications, internet telecommunication services and digital content transmission',
    category: 'IT & Software Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['internet', 'broadband', 'telecom service', 'bandwidth', 'sms', 'data transmission', 'hosting'],
  },
  {
    code: '9987',
    description: 'Maintenance, repair and installation of computers, office machinery and electronic equipment',
    category: 'IT & Software Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['amc', 'maintenance', 'repair', 'installation', 'it support', 'servicing', 'annual maintenance'],
  },
  {
    code: '998314',
    description: 'Information technology (IT) design and development services for applications and infrastructure',
    category: 'IT & Software Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['website design', 'ui/ux', 'app design', 'infrastructure design', 'cloud architecture'],
  },

  // --- 4. Industrial Machinery & Mechanical ---
  {
    code: '8414',
    description: 'Air or vacuum pumps, air or other gas compressors and fans; ventilating hoods',
    category: 'Industrial Machinery & Mechanical',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['compressor', 'fan', 'blower', 'exhaust', 'pump', 'air compressor', 'ventilation'],
  },
  {
    code: '8413',
    description: 'Pumps for liquids, whether or not fitted with a measuring device; liquid elevators',
    category: 'Industrial Machinery & Mechanical',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['water pump', 'submersible', 'motor pump', 'hydraulic pump', 'centrifugal pump'],
  },
  {
    code: '8481',
    description: 'Taps, cocks, valves and similar appliances for pipes, boiler shells, tanks, vats',
    category: 'Industrial Machinery & Mechanical',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['valve', 'ball valve', 'gate valve', 'cock', 'tap', 'regulator', 'flange'],
  },
  {
    code: '8483',
    description: 'Transmission shafts, cranks, bearing housings, gears and gearing, ball or roller screws',
    category: 'Industrial Machinery & Mechanical',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['gear', 'shaft', 'bearing', 'pulley', 'crankshaft', 'coupling', 'transmission'],
  },
  {
    code: '8421',
    description: 'Centrifuges, filtering or purifying machinery and apparatus for liquids or gases (RO water filters)',
    category: 'Industrial Machinery & Mechanical',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['filter', 'purifier', 'ro filter', 'strainer', 'separator', 'water purifier'],
  },

  // --- 5. Iron, Steel & Hardware ---
  {
    code: '7214',
    description: 'Other bars and rods of iron or non-alloy steel, not further worked (TMT re-bars, reinforcement steel)',
    category: 'Iron, Steel & Hardware',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['tmt', 'steel bar', 'rod', 'rebar', 'iron rod', 'sariya', 'billet'],
  },
  {
    code: '7306',
    description: 'Other tubes, pipes and hollow profiles of iron or steel (welded, riveted, GI pipes)',
    category: 'Iron, Steel & Hardware',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['pipe', 'steel pipe', 'tube', 'gi pipe', 'ms pipe', 'hollow section', 'square pipe'],
  },
  {
    code: '7318',
    description: 'Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, washers and similar articles of iron or steel',
    category: 'Iron, Steel & Hardware',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['bolt', 'nut', 'screw', 'washer', 'fastener', 'rivet', 'anchor', 'hardware'],
  },
  {
    code: '7606',
    description: 'Aluminium plates, sheets and strip, of a thickness exceeding 0.2 mm',
    category: 'Iron, Steel & Hardware',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['aluminium', 'sheet', 'plate', 'profile', 'extrusion', 'metal sheet'],
  },

  // --- 6. Automotive & Spare Parts ---
  {
    code: '8708',
    description: 'Parts and accessories of the motor vehicles of headings 8701 to 8705 (brakes, gearboxes, axles, shock absorbers)',
    category: 'Automotive & Spare Parts',
    defaultGstRate: 28,
    type: 'goods',
    keywords: ['auto part', 'brake', 'clutch', 'bumper', 'suspension', 'axle', 'gearbox', 'radiator', 'car part'],
  },
  {
    code: '4011',
    description: 'New pneumatic tyres, of rubber (car tyres, truck tyres, motorcycle tyres)',
    category: 'Automotive & Spare Parts',
    defaultGstRate: 28,
    type: 'goods',
    keywords: ['tyre', 'tire', 'rubber tyre', 'tube', 'tread'],
  },
  {
    code: '8714',
    description: 'Parts and accessories of vehicles of headings 8711 to 8713 (motorcycles, scooters, bicycles)',
    category: 'Automotive & Spare Parts',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['bike part', 'motorcycle part', 'scooter part', 'bicycle part', 'two wheeler'],
  },

  // --- 7. Textiles, Apparel & Garments ---
  {
    code: '6109',
    description: 'T-shirts, singlets and other vests, knitted or crocheted',
    category: 'Textiles, Apparel & Garments',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['t-shirt', 'tshirt', 'tee', 'vest', 'polo', 'garment', 'knitwear'],
  },
  {
    code: '6203',
    description: "Men's or boys' suits, ensembles, jackets, blazers, trousers, bib and brace overalls, breeches and shorts",
    category: 'Textiles, Apparel & Garments',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['shirt', 'pant', 'trouser', 'suit', 'jacket', 'blazer', 'jeans', 'menswear'],
  },
  {
    code: '6204',
    description: "Women's or girls' suits, ensembles, jackets, dresses, skirts, divided skirts, trousers",
    category: 'Textiles, Apparel & Garments',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['dress', 'saree', 'kurti', 'skirt', 'salwar', 'suit', 'womenswear', 'gown'],
  },
  {
    code: '6403',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather',
    category: 'Textiles, Apparel & Garments',
    defaultGstRate: 12,
    type: 'goods',
    keywords: ['shoe', 'footwear', 'leather shoe', 'sneaker', 'sandal', 'boot', 'slipper'],
  },
  {
    code: '5208',
    description: 'Woven fabrics of cotton, containing 85% or more by weight of cotton',
    category: 'Textiles, Apparel & Garments',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['cotton fabric', 'cloth', 'textile', 'fabric', 'yarn', 'woven'],
  },

  // --- 8. Furniture & Fixtures ---
  {
    code: '9403',
    description: 'Other furniture and parts thereof (metal furniture, wooden furniture, office desks, modular workstations)',
    category: 'Furniture & Fixtures',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['furniture', 'desk', 'table', 'chair', 'wardrobe', 'almirah', 'cabinet', 'bed', 'sofa', 'workstation'],
  },
  {
    code: '9401',
    description: 'Seats (other than those of heading 9402), whether or not convertible into beds, and parts thereof',
    category: 'Furniture & Fixtures',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['chair', 'seat', 'office chair', 'revolving chair', 'stool', 'bench', 'couch'],
  },
  {
    code: '4412',
    description: 'Plywood, veneered panels and similar laminated wood',
    category: 'Furniture & Fixtures',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['plywood', 'veneer', 'laminate', 'board', 'mdf', 'wood sheet', 'timber'],
  },

  // --- 9. Construction, Paints & Sanitary ---
  {
    code: '2523',
    description: 'Portland cement, aluminous cement, slag cement, supersulphate cement and similar hydraulic cements',
    category: 'Construction, Paints & Sanitary',
    defaultGstRate: 28,
    type: 'goods',
    keywords: ['cement', 'portland cement', 'concrete', 'clinker', 'white cement'],
  },
  {
    code: '6907',
    description: 'Ceramic flags and paving, hearth or wall tiles; ceramic mosaic cubes and the like',
    category: 'Construction, Paints & Sanitary',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['tile', 'ceramic', 'vitrified', 'floor tile', 'wall tile', 'granite', 'marble'],
  },
  {
    code: '3208',
    description: 'Paints and varnishes based on synthetic polymers or chemically modified natural polymers; enamels',
    category: 'Construction, Paints & Sanitary',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['paint', 'varnish', 'primer', 'enamel', 'distemper', 'emulsion', 'coating'],
  },
  {
    code: '9954',
    description: 'Construction services, general construction of buildings, civil engineering works',
    category: 'Construction, Paints & Sanitary',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['construction', 'civil work', 'contractor', 'building', 'fabrication', 'renovation', 'masonry'],
  },

  // --- 10. Chemicals, Plastics & Packaging ---
  {
    code: '3923',
    description: 'Articles for the conveyance or packing of goods, of plastics; stoppers, lids, caps and other closures',
    category: 'Chemicals, Plastics & Packaging',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['plastic bag', 'bottle', 'container', 'box', 'cap', 'lid', 'packaging', 'poly bag'],
  },
  {
    code: '4819',
    description: 'Cartons, boxes, cases, bags and other packing containers, of paper, paperboard, corrugated paper',
    category: 'Chemicals, Plastics & Packaging',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['corrugated box', 'carton', 'paper bag', 'packaging box', 'shipping box', 'packaging'],
  },
  {
    code: '3917',
    description: 'Tubes, pipes and hoses, and fittings therefor (joints, elbows, flanges), of plastics',
    category: 'Chemicals, Plastics & Packaging',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['pvc pipe', 'cpvc', 'upvc', 'hose', 'plastic pipe', 'plumbing'],
  },

  // --- 11. Healthcare & Pharmaceuticals ---
  {
    code: '3004',
    description: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses',
    category: 'Healthcare & Pharmaceuticals',
    defaultGstRate: 12,
    type: 'goods',
    keywords: ['medicine', 'pharma', 'tablet', 'capsule', 'syrup', 'injection', 'drug', 'pharmaceutical'],
  },
  {
    code: '9018',
    description: 'Instruments and appliances used in medical, surgical, dental or veterinary sciences',
    category: 'Healthcare & Pharmaceuticals',
    defaultGstRate: 12,
    type: 'goods',
    keywords: ['medical device', 'surgical', 'dental', 'syringe', 'bp monitor', 'stethoscope', 'implants'],
  },

  // --- 12. Food, Beverages & FMCG ---
  {
    code: '1006',
    description: 'Rice (semi-milled, wholly milled, polished, parboiled, basmati)',
    category: 'Food, Beverages & FMCG',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['rice', 'basmati', 'grain', 'paddy'],
  },
  {
    code: '1905',
    description: 'Bread, pastry, cakes, biscuits and other bakers wares; communion wafers, empty cachets',
    category: 'Food, Beverages & FMCG',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['biscuit', 'cookie', 'bread', 'cake', 'bakery', 'rusk', 'pastry', 'wafers'],
  },
  {
    code: '2106',
    description: 'Food preparations not elsewhere specified or included (protein powders, sharbats, instant mixes)',
    category: 'Food, Beverages & FMCG',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['food mix', 'health drink', 'protein', 'supplement', 'spice mix', 'instant mix'],
  },
  {
    code: '0902',
    description: 'Tea, whether or not flavoured',
    category: 'Food, Beverages & FMCG',
    defaultGstRate: 5,
    type: 'goods',
    keywords: ['tea', 'chai', 'green tea', 'tea leaves', 'black tea'],
  },

  // --- 13. Consulting & Professional Services (SAC) ---
  {
    code: '9982',
    description: 'Legal and accounting services; auditing, bookkeeping, taxation consultancy',
    category: 'Consulting & Professional Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['accounting', 'audit', 'taxation', 'legal', 'lawyer', 'consultancy', 'ca services', 'gst filing fee'],
  },
  {
    code: '9985',
    description: 'Support services; employment services, security services, cleaning services, office administration',
    category: 'Consulting & Professional Services (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['manpower', 'security', 'cleaning', 'facility management', 'staffing', 'recruitment', 'admin support'],
  },

  // --- 14. Logistics, Transport & Courier (SAC) ---
  {
    code: '9965',
    description: 'Goods transport services by road, rail, water, or air (GTA freight)',
    category: 'Logistics, Transport & Courier (SAC)',
    defaultGstRate: 5,
    type: 'services',
    keywords: ['freight', 'transport', 'transportation', 'truck', 'gta', 'cartage', 'carriage', 'delivery charge'],
  },
  {
    code: '9968',
    description: 'Postal and courier services; express parcel delivery',
    category: 'Logistics, Transport & Courier (SAC)',
    defaultGstRate: 18,
    type: 'services',
    keywords: ['courier', 'parcel', 'shipping', 'post', 'express cargo', 'dispatch'],
  },

  // --- 15. Stationery & Office Supplies ---
  {
    code: '4820',
    description: 'Registers, account books, note books, order books, receipt books, letter pads, diaries of paper',
    category: 'Stationery & Office Supplies',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['notebook', 'register', 'diary', 'stationery', 'pad', 'bill book', 'ledger book'],
  },
  {
    code: '9608',
    description: 'Ball point pens, felt tipped and other porous-tipped pens, fountain pens, markers',
    category: 'Stationery & Office Supplies',
    defaultGstRate: 18,
    type: 'goods',
    keywords: ['pen', 'ball pen', 'marker', 'pencil', 'highlighter', 'stationery'],
  },
  {
    code: '4802',
    description: 'Uncoated paper and paperboard, of a kind used for writing, printing or other graphic purposes (A4 paper)',
    category: 'Stationery & Office Supplies',
    defaultGstRate: 12,
    type: 'goods',
    keywords: ['a4 paper', 'photocopy paper', 'printing paper', 'paper ream', 'xerox paper'],
  },
];

// Helper: Intelligently infer product category based on text clues
export function inferCategoryFromItem(
  itemName?: string,
  description?: string,
  currentHsn?: string,
  explicitCategory?: string
): ProductCategory {
  if (explicitCategory && PRODUCT_CATEGORIES.includes(explicitCategory as ProductCategory)) {
    return explicitCategory as ProductCategory;
  }

  // 1. If HSN matches directory directly
  if (currentHsn) {
    const cleanHsn = currentHsn.trim();
    const found = HSN_DIRECTORY.find((e) => e.code === cleanHsn || cleanHsn.startsWith(e.code) || e.code.startsWith(cleanHsn));
    if (found) {
      return found.category as ProductCategory;
    }
  }

  // 2. Keyword matching on Item Name + Description
  const combinedText = `${itemName || ''} ${description || ''}`.toLowerCase();
  if (combinedText.trim()) {
    let bestMatch: ProductCategory | null = null;
    let highestScore = 0;

    for (const entry of HSN_DIRECTORY) {
      let score = 0;
      for (const kw of entry.keywords) {
        if (combinedText.includes(kw)) {
          score += kw.length > 4 ? 2 : 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry.category as ProductCategory;
      }
    }

    if (bestMatch && highestScore > 0) {
      return bestMatch;
    }
  }

  return 'Electronics & Electricals'; // Default fallback
}

// Compute frequency and rank HSN/SAC suggestions for a specific category
export function getHsnSuggestionsForCategory(
  category: string,
  invoices: Invoice[] = [],
  inventory: InventoryItem[] = [],
  searchQuery = ''
): HsnSuggestion[] {
  const normCategory = category.trim().toLowerCase();

  // 1. Calculate usage counts from existing invoices
  const invoiceHsnCounts: Record<string, number> = {};
  invoices.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      const code = (it.hsnCode || '').trim();
      if (code) {
        invoiceHsnCounts[code] = (invoiceHsnCounts[code] || 0) + 1;
      }
    });
  });

  // 2. Calculate counts from inventory master
  const inventoryHsnCounts: Record<string, number> = {};
  inventory.forEach((inv) => {
    const code = (inv.hsnCode || '').trim();
    if (code) {
      inventoryHsnCounts[code] = (inventoryHsnCounts[code] || 0) + 1;
    }
  });

  // 3. Filter directory entries for this specific category (or all if category is 'All')
  const matchedEntries = HSN_DIRECTORY.filter((entry) => {
    if (normCategory === 'all' || normCategory === 'general merchandise') return true;
    return entry.category.toLowerCase() === normCategory;
  });

  // Also include any user-created HSN codes from inventory or invoices that match this category
  const knownHsnSet = new Set(matchedEntries.map((e) => e.code));

  inventory.forEach((item) => {
    const code = (item.hsnCode || '').trim();
    const itemCat = (item.category || inferCategoryFromItem(item.name, item.description, item.hsnCode)).toLowerCase();
    if (code && !knownHsnSet.has(code) && (normCategory === 'all' || itemCat === normCategory)) {
      matchedEntries.push({
        code,
        description: item.name || 'User Custom Product Item',
        category: item.category || category,
        defaultGstRate: parseFloat(item.gstRate) || 18,
        type: 'goods',
        keywords: [item.name.toLowerCase()],
      });
      knownHsnSet.add(code);
    }
  });

  // 4. Map into HsnSuggestion with usage counts
  const suggestions: HsnSuggestion[] = matchedEntries.map((entry) => {
    const invCount = invoiceHsnCounts[entry.code] || 0;
    const invenCount = inventoryHsnCounts[entry.code] || 0;
    const totalUsage = invCount + invenCount;

    let frequencyBadge: 'Most Frequent' | 'Frequent' | 'Recommended' | 'Directory' = 'Directory';
    if (totalUsage >= 5) {
      frequencyBadge = 'Most Frequent';
    } else if (totalUsage >= 1) {
      frequencyBadge = 'Frequent';
    } else {
      frequencyBadge = 'Recommended';
    }

    return {
      code: entry.code,
      description: entry.description,
      category: entry.category,
      defaultGstRate: entry.defaultGstRate,
      type: entry.type,
      usageCount: totalUsage,
      frequencyBadge,
      isHistorical: totalUsage > 0,
    };
  });

  // 5. Filter by search query if user is typing
  let filtered = suggestions;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = suggestions.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }

  // 6. Sort: Highest usage count first, then by frequency badge priority, then code ascending
  return filtered.sort((a, b) => {
    if (b.usageCount !== a.usageCount) {
      return b.usageCount - a.usageCount;
    }
    const badgePriority: Record<string, number> = {
      'Most Frequent': 3,
      'Frequent': 2,
      'Recommended': 1,
      'Directory': 0,
    };
    const pDiff = (badgePriority[b.frequencyBadge] || 0) - (badgePriority[a.frequencyBadge] || 0);
    if (pDiff !== 0) return pDiff;
    return a.code.localeCompare(b.code);
  });
}
