// ─── Static fixture data for dev seed ────────────────────────────────────────
// All coordinates are real Helsinki locations.

// ─── Name pools ───────────────────────────────────────────────────────────────

export const FIRST_NAMES_M = [
  'Mikko', 'Juhani', 'Pekka', 'Antti', 'Matti', 'Jari', 'Kari', 'Timo',
  'Juha', 'Markku', 'Tapani', 'Hannu', 'Ville', 'Lauri', 'Sami', 'Tuomas',
  'Aleksi', 'Petri', 'Harri', 'Eetu', 'Olli', 'Joni', 'Riku', 'Niko',
];

export const FIRST_NAMES_F = [
  'Tiina', 'Marja', 'Anne', 'Liisa', 'Sari', 'Katja', 'Päivi', 'Leena',
  'Hanna', 'Aino', 'Siiri', 'Emilia', 'Laura', 'Kaisa', 'Sofia', 'Elina',
  'Maria', 'Riikka', 'Pirjo', 'Tuulikki', 'Jenni', 'Noora', 'Iida', 'Lotta',
];

export const LAST_NAMES = [
  'Virtanen', 'Korhonen', 'Mäkinen', 'Hämäläinen', 'Leinonen', 'Heikkinen',
  'Järvinen', 'Koskinen', 'Lehtonen', 'Saarinen', 'Nieminen', 'Turunen',
  'Laitinen', 'Toivonen', 'Pesonen', 'Koivisto', 'Rantanen', 'Halonen',
  'Väisänen', 'Hirvonen', 'Ahonen', 'Ojala', 'Huttunen', 'Leppänen',
  'Karjalainen', 'Tikkanen', 'Niskanen', 'Miettinen', 'Aaltonen', 'Rautio',
];

// ─── Helsinki neighbourhoods ──────────────────────────────────────────────────

export interface Neighbourhood {
  name: string;
  postalCode: string;
  lat: number;
  lng: number;
  streets: string[];
}

export const NEIGHBOURHOODS: Neighbourhood[] = [
  {
    name: 'Helsinki', postalCode: '00100',
    lat: 60.1688, lng: 24.9314,
    streets: ['Mannerheimintie', 'Simonkatu', 'Salomonkatu', 'Kampinkuja'],
  },
  {
    name: 'Helsinki', postalCode: '00530',
    lat: 60.1812, lng: 24.9497,
    streets: ['Fleminginkatu', 'Kolmas linja', 'Neljäs linja', 'Vaasankatu'],
  },
  {
    name: 'Helsinki', postalCode: '00250',
    lat: 60.1792, lng: 24.9210,
    streets: ['Töölönkatu', 'Museokatu', 'Caloniuksenkatu', 'Arkadiankatu'],
  },
  {
    name: 'Helsinki', postalCode: '00150',
    lat: 60.1618, lng: 24.9369,
    streets: ['Iso Roobertinkatu', 'Fredrikinkatu', 'Annankatu', 'Bulevardi'],
  },
  {
    name: 'Helsinki', postalCode: '00500',
    lat: 60.1878, lng: 24.9649,
    streets: ['Hämeentie', 'Sörnäisten rantatie', 'Vilhonvuorenkatu'],
  },
  {
    name: 'Helsinki', postalCode: '00170',
    lat: 60.1730, lng: 24.9520,
    streets: ['Snellmaninkatu', 'Aleksanterinkatu', 'Unioninkatu'],
  },
  {
    name: 'Helsinki', postalCode: '00200',
    lat: 60.1562, lng: 24.8823,
    streets: ['Lauttasaarentie', 'Isokaari', 'Otavantie'],
  },
  {
    name: 'Helsinki', postalCode: '00520',
    lat: 60.1989, lng: 24.9326,
    streets: ['Ratapihantie', 'Pasilanraitio', 'Veturitie'],
  },
  {
    name: 'Helsinki', postalCode: '00550',
    lat: 60.1937, lng: 24.9612,
    streets: ['Sturenkatu', 'Mäkelänkatu', 'Aleksis Kiven katu'],
  },
  {
    name: 'Helsinki', postalCode: '00130',
    lat: 60.1580, lng: 24.9484,
    streets: ['Ullanlinnankatu', 'Tehtaankatu', 'Puistokatu', 'Kasarmikatu'],
  },
  {
    name: 'Helsinki', postalCode: '00560',
    lat: 60.1902, lng: 24.9713,
    streets: ['Hermannin rantatie', 'Kaarlenkatu', 'Lautatarhankatu'],
  },
  {
    name: 'Helsinki', postalCode: '00300',
    lat: 60.2054, lng: 24.9183,
    streets: ['Paciuksenkatu', 'Haartmaninkatu', 'Mannerheimintie'],
  },
];

// ─── Merchant definitions ─────────────────────────────────────────────────────

export interface ProductDef {
  name: string;
  category: string;
  price_eur: number;
  dietary_flags: Record<string, boolean>;
}

export interface MerchantDef {
  name: string;
  slug: string;
  merchant_group: 'qsr' | 'restaurant' | 'darkstore' | 'other';
  lat: number;
  lng: number;
  address: string;
  commission_rate: number;
  delivery_fee_under_eur: number;
  delivery_fee_over_eur: number;
  free_delivery_threshold_eur: number;
  min_order_value_eur: number;
  prep_time_estimate_min: number;
  operating_hours: Record<string, { open: string; close: string } | null>;
  products: ProductDef[];
}

// ── Operating hours templates ──

const EVERY_DAY = (open = '10:00', close = '22:00') =>
  Object.fromEntries(
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => [d, { open, close }]),
  );

const WED_SUN = (open = '12:00', close = '22:00') => ({
  mon: null, tue: null,
  wed: { open, close }, thu: { open, close }, fri: { open, close },
  sat: { open, close }, sun: { open, close },
});

// ── QSR product templates ──

const QSR_PRODUCTS: ProductDef[] = [
  { name: 'Classic Burger', category: 'Burgers', price_eur: 8.90,  dietary_flags: {} },
  { name: 'Double Burger',  category: 'Burgers', price_eur: 11.90, dietary_flags: {} },
  { name: 'Chicken Burger', category: 'Burgers', price_eur: 9.50,  dietary_flags: {} },
  { name: 'Veggie Burger',  category: 'Burgers', price_eur: 9.50,  dietary_flags: { vegetarian: true } },
  { name: 'Small Fries',    category: 'Sides',   price_eur: 3.50,  dietary_flags: { vegan: true } },
  { name: 'Large Fries',    category: 'Sides',   price_eur: 4.90,  dietary_flags: { vegan: true } },
  { name: 'Soft Drink',     category: 'Drinks',  price_eur: 2.90,  dietary_flags: {} },
  { name: 'Milkshake',      category: 'Drinks',  price_eur: 4.90,  dietary_flags: {} },
  { name: 'Chicken Nuggets (6 pcs)', category: 'Sides', price_eur: 7.50, dietary_flags: {} },
  { name: 'Combo Meal',     category: 'Combos',  price_eur: 13.90, dietary_flags: {} },
];

// ── Restaurant product templates ──

const RESTAURANT_PRODUCTS: ProductDef[] = [
  { name: "Today's Soup",           category: 'Starters', price_eur: 9.50,  dietary_flags: { vegetarian: true } },
  { name: 'Salmon Carpaccio',        category: 'Starters', price_eur: 16.50, dietary_flags: { gluten_free: true } },
  { name: 'Finnish Beef Tartare',    category: 'Starters', price_eur: 18.90, dietary_flags: { gluten_free: true } },
  { name: 'Grilled Salmon',          category: 'Mains',    price_eur: 28.90, dietary_flags: { gluten_free: true } },
  { name: 'Beef Tenderloin',         category: 'Mains',    price_eur: 38.90, dietary_flags: { gluten_free: true } },
  { name: 'Reindeer Stew',           category: 'Mains',    price_eur: 32.90, dietary_flags: {} },
  { name: 'Mushroom Risotto',        category: 'Mains',    price_eur: 22.90, dietary_flags: { vegetarian: true } },
  { name: 'Warm Goat Cheese Salad',  category: 'Salads',   price_eur: 16.50, dietary_flags: { vegetarian: true } },
  { name: 'Warm Berry Tart',         category: 'Desserts', price_eur: 11.50, dietary_flags: { vegetarian: true } },
  { name: 'Chocolate Fondant',       category: 'Desserts', price_eur: 12.90, dietary_flags: { vegetarian: true } },
  { name: 'House Wine (glass)',      category: 'Drinks',   price_eur: 10.90, dietary_flags: {} },
  { name: 'Local Craft Beer',        category: 'Drinks',   price_eur: 8.50,  dietary_flags: {} },
];

// ── Darkstore product templates ──

const DARKSTORE_PRODUCTS: ProductDef[] = [
  { name: 'Whole Milk 1 L',          category: 'Dairy',      price_eur: 1.29, dietary_flags: {} },
  { name: 'Oat Milk 1 L',            category: 'Dairy',      price_eur: 2.49, dietary_flags: { vegan: true } },
  { name: 'Sourdough Bread',         category: 'Bakery',     price_eur: 3.49, dietary_flags: { vegetarian: true } },
  { name: 'Free-Range Eggs 6 pcs',   category: 'Dairy',      price_eur: 2.99, dietary_flags: { vegetarian: true } },
  { name: 'Finnish Butter 200 g',    category: 'Dairy',      price_eur: 2.79, dietary_flags: { vegetarian: true } },
  { name: 'Ground Coffee 250 g',     category: 'Beverages',  price_eur: 4.99, dietary_flags: { vegan: true } },
  { name: 'Sparkling Water 1.5 L',   category: 'Beverages',  price_eur: 1.19, dietary_flags: { vegan: true } },
  { name: 'Orange Juice 1 L',        category: 'Beverages',  price_eur: 2.99, dietary_flags: { vegan: true } },
  { name: 'Penne Pasta 500 g',       category: 'Pantry',     price_eur: 1.49, dietary_flags: { vegan: true } },
  { name: 'Jasmine Rice 1 kg',       category: 'Pantry',     price_eur: 2.99, dietary_flags: { vegan: true } },
  { name: 'Canned Tomatoes 400 g',   category: 'Pantry',     price_eur: 0.99, dietary_flags: { vegan: true } },
  { name: 'Chicken Breast 400 g',    category: 'Meat',       price_eur: 5.99, dietary_flags: { gluten_free: true } },
  { name: 'Finnish Minced Beef 400 g', category: 'Meat',     price_eur: 5.49, dietary_flags: { gluten_free: true } },
  { name: 'Smoked Salmon 200 g',     category: 'Fish',       price_eur: 7.99, dietary_flags: { gluten_free: true } },
  { name: 'Edam Cheese 300 g',       category: 'Dairy',      price_eur: 4.49, dietary_flags: { vegetarian: true } },
  { name: 'Greek Yoghurt 500 g',     category: 'Dairy',      price_eur: 2.99, dietary_flags: { vegetarian: true } },
  { name: 'Strawberries 250 g',      category: 'Produce',    price_eur: 3.49, dietary_flags: { vegan: true } },
  { name: 'Banana Bunch',            category: 'Produce',    price_eur: 1.49, dietary_flags: { vegan: true } },
  { name: 'Cucumber',                category: 'Produce',    price_eur: 0.99, dietary_flags: { vegan: true } },
  { name: 'Tomatoes 500 g',          category: 'Produce',    price_eur: 2.49, dietary_flags: { vegan: true } },
  { name: 'Kettle Chips 150 g',      category: 'Snacks',     price_eur: 2.99, dietary_flags: { vegan: true } },
  { name: 'Dark Chocolate 100 g',    category: 'Snacks',     price_eur: 2.49, dietary_flags: { vegetarian: true } },
  { name: 'Protein Bar',             category: 'Snacks',     price_eur: 2.99, dietary_flags: {} },
  { name: 'Domestic Beer 6-pack',    category: 'Alcohol',    price_eur: 9.99, dietary_flags: {} },
  { name: 'White Wine (bottle)',     category: 'Alcohol',    price_eur: 8.99, dietary_flags: { vegan: true } },
  { name: 'Dishwasher Tablets 30 pcs', category: 'Household', price_eur: 7.99, dietary_flags: {} },
  { name: 'Toilet Paper 8-roll',     category: 'Household',  price_eur: 4.99, dietary_flags: {} },
  { name: 'Toothpaste',              category: 'Personal Care', price_eur: 3.49, dietary_flags: {} },
  { name: 'Ibuprofen 400 mg 20 tabs', category: 'Pharmacy',  price_eur: 5.99, dietary_flags: {} },
  { name: 'Multivitamin 30 tabs',    category: 'Pharmacy',   price_eur: 7.49, dietary_flags: {} },
];

// ── Other product templates ──

const OTHER_PRODUCTS: ProductDef[] = [
  { name: 'Helsingin Sanomat',   category: 'Media',     price_eur: 3.99, dietary_flags: {} },
  { name: 'Energy Drink 330 ml', category: 'Beverages', price_eur: 2.49, dietary_flags: {} },
  { name: 'BLT Sandwich',        category: 'Food',      price_eur: 5.49, dietary_flags: {} },
  { name: 'Hot Dog',             category: 'Food',      price_eur: 3.99, dietary_flags: {} },
  { name: 'Croissant',           category: 'Food',      price_eur: 2.99, dietary_flags: { vegetarian: true } },
  { name: 'Ice Cream Bar',       category: 'Snacks',    price_eur: 2.49, dietary_flags: { vegetarian: true } },
  { name: 'Aspirin 500 mg',      category: 'Pharmacy',  price_eur: 4.99, dietary_flags: {} },
  { name: 'Hand Sanitizer 100 ml', category: 'Personal Care', price_eur: 3.99, dietary_flags: {} },
  { name: 'USB-C Cable 1 m',     category: 'Electronics', price_eur: 9.99, dietary_flags: {} },
  { name: 'Chewing Gum',         category: 'Snacks',    price_eur: 1.99, dietary_flags: {} },
  { name: 'Sunscreen SPF30',     category: 'Personal Care', price_eur: 7.99, dietary_flags: {} },
  { name: 'Sparkling Water 0.5 L', category: 'Beverages', price_eur: 1.99, dietary_flags: { vegan: true } },
  { name: 'Instant Noodles',     category: 'Food',      price_eur: 1.49, dietary_flags: { vegan: true } },
  { name: 'Mineral Water 1.5 L', category: 'Beverages', price_eur: 1.29, dietary_flags: { vegan: true } },
  { name: 'Trail Mix 200 g',     category: 'Snacks',    price_eur: 4.49, dietary_flags: { vegan: true } },
];

// ─── Merchant catalogue (16 merchants) ───────────────────────────────────────

export const MERCHANT_DEFS: MerchantDef[] = [
  // ── QSR ──
  {
    name: 'Hesburger Kamppi', slug: 'hesburger-kamppi',
    merchant_group: 'qsr', lat: 60.1688, lng: 24.9314,
    address: 'Salomonkatu 5, 00100 Helsinki',
    commission_rate: 0.10, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 8, prep_time_estimate_min: 10,
    operating_hours: EVERY_DAY('09:00', '23:00'),
    products: QSR_PRODUCTS,
  },
  {
    name: "McDonald's Helsinki", slug: 'mcdonalds-helsinki',
    merchant_group: 'qsr', lat: 60.1699, lng: 24.9384,
    address: 'Mannerheimintie 9, 00100 Helsinki',
    commission_rate: 0.10, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 8, prep_time_estimate_min: 12,
    operating_hours: EVERY_DAY('08:00', '23:00'),
    products: QSR_PRODUCTS,
  },
  {
    name: 'Burger King Sörnäinen', slug: 'burger-king-sornäinen',
    merchant_group: 'qsr', lat: 60.1878, lng: 24.9649,
    address: 'Hämeentie 7, 00500 Helsinki',
    commission_rate: 0.10, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 8, prep_time_estimate_min: 12,
    operating_hours: EVERY_DAY('10:00', '22:00'),
    products: QSR_PRODUCTS,
  },
  {
    name: 'KFC City Center', slug: 'kfc-city-center',
    merchant_group: 'qsr', lat: 60.1703, lng: 24.9416,
    address: 'Aleksanterinkatu 9, 00100 Helsinki',
    commission_rate: 0.10, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 8, prep_time_estimate_min: 14,
    operating_hours: EVERY_DAY('10:00', '22:00'),
    products: QSR_PRODUCTS,
  },
  {
    name: 'Rolls Wraps Helsinki', slug: 'rolls-wraps-helsinki',
    merchant_group: 'qsr', lat: 60.1650, lng: 24.9440,
    address: 'Bulevardi 12, 00120 Helsinki',
    commission_rate: 0.10, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 8, prep_time_estimate_min: 10,
    operating_hours: EVERY_DAY('10:00', '21:00'),
    products: QSR_PRODUCTS,
  },
  // ── Restaurant ──
  {
    name: 'Ravintola Savotta', slug: 'ravintola-savotta',
    merchant_group: 'restaurant', lat: 60.1730, lng: 24.9520,
    address: 'Aleksanterinkatu 22, 00170 Helsinki',
    commission_rate: 0.19, delivery_fee_under_eur: 0, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 20, prep_time_estimate_min: 25,
    operating_hours: WED_SUN('12:00', '22:00'),
    products: RESTAURANT_PRODUCTS,
  },
  {
    name: 'Sea Horse Helsinki', slug: 'sea-horse-helsinki',
    merchant_group: 'restaurant', lat: 60.1618, lng: 24.9484,
    address: 'Kapteeninkatu 11, 00140 Helsinki',
    commission_rate: 0.19, delivery_fee_under_eur: 0, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 20, prep_time_estimate_min: 30,
    operating_hours: WED_SUN('12:00', '22:00'),
    products: RESTAURANT_PRODUCTS,
  },
  {
    name: 'Zetor Restaurant', slug: 'zetor-restaurant',
    merchant_group: 'restaurant', lat: 60.1699, lng: 24.9416,
    address: 'Mannerheimintie 3–5, 00100 Helsinki',
    commission_rate: 0.19, delivery_fee_under_eur: 0, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 20, prep_time_estimate_min: 25,
    operating_hours: WED_SUN('11:00', '23:00'),
    products: RESTAURANT_PRODUCTS,
  },
  {
    name: 'Restaurant Olo', slug: 'restaurant-olo',
    merchant_group: 'restaurant', lat: 60.1669, lng: 24.9490,
    address: 'Pohjoisesplanadi 5, 00170 Helsinki',
    commission_rate: 0.22, delivery_fee_under_eur: 0, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 25, min_order_value_eur: 30, prep_time_estimate_min: 35,
    operating_hours: WED_SUN('17:00', '23:00'),
    products: RESTAURANT_PRODUCTS,
  },
  // ── Darkstore ──
  {
    name: 'EcoBite Dark Kallio', slug: 'ecobite-dark-kallio',
    merchant_group: 'darkstore', lat: 60.1812, lng: 24.9497,
    address: 'Fleminginkatu 34, 00530 Helsinki',
    commission_rate: 0.30, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 20, min_order_value_eur: 10, prep_time_estimate_min: 5,
    operating_hours: EVERY_DAY('07:00', '23:00'),
    products: DARKSTORE_PRODUCTS,
  },
  {
    name: 'EcoBite Dark Töölö', slug: 'ecobite-dark-toolo',
    merchant_group: 'darkstore', lat: 60.1792, lng: 24.9210,
    address: 'Töölönkatu 44, 00250 Helsinki',
    commission_rate: 0.30, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 20, min_order_value_eur: 10, prep_time_estimate_min: 5,
    operating_hours: EVERY_DAY('07:00', '23:00'),
    products: DARKSTORE_PRODUCTS,
  },
  {
    name: 'EcoBite Dark Punavuori', slug: 'ecobite-dark-punavuori',
    merchant_group: 'darkstore', lat: 60.1618, lng: 24.9369,
    address: 'Fredrikinkatu 58, 00100 Helsinki',
    commission_rate: 0.30, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 20, min_order_value_eur: 10, prep_time_estimate_min: 5,
    operating_hours: EVERY_DAY('07:00', '23:00'),
    products: DARKSTORE_PRODUCTS,
  },
  {
    name: 'EcoBite Dark Sörnäinen', slug: 'ecobite-dark-sornäinen',
    merchant_group: 'darkstore', lat: 60.1878, lng: 24.9649,
    address: 'Sörnäisten rantatie 25, 00500 Helsinki',
    commission_rate: 0.30, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 20, min_order_value_eur: 10, prep_time_estimate_min: 5,
    operating_hours: EVERY_DAY('07:00', '23:00'),
    products: DARKSTORE_PRODUCTS,
  },
  // ── Other ──
  {
    name: 'K-Express Delivery', slug: 'k-express-delivery',
    merchant_group: 'other', lat: 60.1892, lng: 24.9499,
    address: 'Sturenkatu 2, 00510 Helsinki',
    commission_rate: 0.115, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 30, min_order_value_eur: 5, prep_time_estimate_min: 8,
    operating_hours: EVERY_DAY('08:00', '22:00'),
    products: OTHER_PRODUCTS,
  },
  {
    name: 'R-Kioski Helsinki', slug: 'r-kioski-helsinki',
    merchant_group: 'other', lat: 60.1669, lng: 24.9384,
    address: 'Pohjoisesplanadi 33, 00100 Helsinki',
    commission_rate: 0.115, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 30, min_order_value_eur: 5, prep_time_estimate_min: 7,
    operating_hours: EVERY_DAY('07:00', '23:00'),
    products: OTHER_PRODUCTS,
  },
  {
    name: 'Lidl Express', slug: 'lidl-express',
    merchant_group: 'other', lat: 60.1580, lng: 24.9337,
    address: 'Lönnrotinkatu 20, 00120 Helsinki',
    commission_rate: 0.115, delivery_fee_under_eur: 4.90, delivery_fee_over_eur: 0,
    free_delivery_threshold_eur: 30, min_order_value_eur: 5, prep_time_estimate_min: 8,
    operating_hours: EVERY_DAY('08:00', '21:00'),
    products: OTHER_PRODUCTS,
  },
];

// ─── Courier names ────────────────────────────────────────────────────────────

export const COURIER_NAMES = [
  'Aleksi Virtanen', 'Mikko Korhonen', 'Janne Mäkinen', 'Sami Heikkinen',
  'Toni Järvinen', 'Petri Koskinen', 'Riku Lehtonen', 'Joni Saarinen',
  'Niko Nieminen', 'Lauri Turunen', 'Olli Pesonen', 'Eetu Laitinen',
  'Harri Toivonen', 'Jari Koivisto', 'Pekka Rantanen', 'Tuomas Halonen',
  'Antti Väisänen', 'Ville Ahonen', 'Matti Ojala', 'Juha Huttunen',
  'Markku Leppänen', 'Kari Miettinen', 'Tapani Aaltonen', 'Hanna Rautio',
  'Siiri Karjalainen',
];

export const VEHICLE_TYPES = ['bike', 'bike', 'bike', 'cargo_bike', 'scooter'] as const;
