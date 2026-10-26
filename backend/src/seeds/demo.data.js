// Demo marketplace for local development and the demo environment. Every record created from
// this file gets isDemo: true. Locations are approximate town centres, not real farms or homes.
// The phone numbers are made up but could belong to real people: never use them with a real SMS gateway.

export const DEMO_AGENT = { phone: '+919999900001', language: 'te' };

export const DEMO_FARMERS = [
  {
    key: 'ramu',
    phone: '+919999900011',
    language: 'te',
    assistedByAgent: true,
    profile: {
      name: 'Ramu Naidu (Demo)',
      village: 'Kankipadu',
      mandal: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      location: { type: 'Point', coordinates: [80.7826, 16.4384] },
      deliveryRadiusKm: 20,
      deliveryDays: ['mon', 'wed', 'fri', 'sat'],
      verificationLevel: 'agent_verified',
    },
    products: [
      { crop: 'tomato', quantity: 100, pricePerUnit: 2500, harvestedDaysAgo: 0 },
      { crop: 'brinjal', quantity: 50, pricePerUnit: 4000 },
      { crop: 'okra', quantity: 40, pricePerUnit: 5000, harvestedDaysAgo: 0 },
      { crop: 'green-chilli', quantity: 20, pricePerUnit: 6000 },
      { crop: 'bitter-gourd', quantity: 30, pricePerUnit: 5500 },
      { crop: 'drumstick', quantity: 25, pricePerUnit: 8000 },
      { crop: 'curry-leaves', quantity: 40, pricePerUnit: 1000, harvestedDaysAgo: 0 },
      { crop: 'onion', quantity: 150, pricePerUnit: 3500, harvestedDaysAgo: 2 },
    ],
  },
  {
    key: 'lakshmi',
    phone: '+919999900012',
    language: 'te',
    profile: {
      name: 'Lakshmi Devi (Demo)',
      village: 'Tenali',
      mandal: 'Tenali',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      pincode: '522201',
      location: { type: 'Point', coordinates: [80.64, 16.243] },
      deliveryRadiusKm: 10,
      servicePincodes: ['522001', '522002'],
      deliveryDays: ['tue', 'thu', 'sat'],
    },
    products: [
      { crop: 'banana', quantity: 60, pricePerUnit: 6000 },
      { crop: 'spinach', quantity: 80, pricePerUnit: 1500, harvestedDaysAgo: 0 },
      { crop: 'gongura', quantity: 60, pricePerUnit: 1500, harvestedDaysAgo: 0 },
      { crop: 'papaya', quantity: 40, pricePerUnit: 4000 },
      { crop: 'guava', quantity: 50, pricePerUnit: 6000 },
      { crop: 'lemon', quantity: 500, pricePerUnit: 300 },
      { crop: 'coconut', quantity: 100, pricePerUnit: 3000, harvestedDaysAgo: 2 },
    ],
  },
  {
    key: 'srinivas',
    phone: '+919999900013',
    language: 'te',
    profile: {
      name: 'Srinivas Reddy (Demo)',
      village: 'Shamshabad',
      mandal: 'Shamshabad',
      district: 'Rangareddy',
      state: 'Telangana',
      pincode: '501218',
      location: { type: 'Point', coordinates: [78.4006, 17.2543] },
      deliveryRadiusKm: 25,
      deliveryDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      cutoffTime: '20:00',
    },
    products: [
      { crop: 'mango', quantity: 200, pricePerUnit: 8000 },
      { crop: 'cucumber', quantity: 60, pricePerUnit: 3000, harvestedDaysAgo: 0 },
      { crop: 'coriander', quantity: 100, pricePerUnit: 1000, harvestedDaysAgo: 0 },
      { crop: 'grapes', quantity: 80, pricePerUnit: 9000 },
      { crop: 'pomegranate', quantity: 60, pricePerUnit: 14000, harvestedDaysAgo: 2 },
      { crop: 'watermelon', quantity: 40, pricePerUnit: 6000 },
      { crop: 'sweet-lime', quantity: 100, pricePerUnit: 7000 },
    ],
  },
  {
    // No location: shows the pincode-only fallback for farmers who deny location permission.
    key: 'venkatesh',
    phone: '+919999900014',
    language: 'en',
    profile: {
      name: 'Venkatesh (Demo)',
      village: 'Moinabad',
      mandal: 'Moinabad',
      district: 'Rangareddy',
      state: 'Telangana',
      pincode: '501504',
      servicePincodes: ['500032', '500075', '501504'],
      deliveryDays: ['wed', 'sun'],
    },
    products: [
      { crop: 'carrot', quantity: 50, pricePerUnit: 5000 },
      { crop: 'cauliflower', quantity: 40, pricePerUnit: 3500 },
      { crop: 'ridge-gourd', quantity: 30, pricePerUnit: 4500, harvestedDaysAgo: 0 },
      { crop: 'cabbage', quantity: 60, pricePerUnit: 2500 },
      { crop: 'beetroot', quantity: 40, pricePerUnit: 4000, harvestedDaysAgo: 2 },
      { crop: 'capsicum', quantity: 30, pricePerUnit: 6000 },
    ],
  },
  {
    // New seller with no reviews yet: shows the New badge next to rated farmers.
    key: 'suresh',
    phone: '+919999900015',
    language: 'te',
    profile: {
      name: 'Suresh Babu (Demo)',
      village: 'Gannavaram',
      mandal: 'Gannavaram',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521101',
      location: { type: 'Point', coordinates: [80.8018, 16.5409] },
      deliveryRadiusKm: 25,
      deliveryDays: ['tue', 'thu', 'sat', 'sun'],
    },
    products: [
      { crop: 'potato', quantity: 120, pricePerUnit: 3000, harvestedDaysAgo: 2 },
      { crop: 'bottle-gourd', quantity: 40, pricePerUnit: 3000 },
      { crop: 'french-beans', quantity: 30, pricePerUnit: 6000, harvestedDaysAgo: 0 },
      { crop: 'pumpkin', quantity: 50, pricePerUnit: 2500 },
      { crop: 'sweet-corn', quantity: 60, pricePerUnit: 2000, harvestedDaysAgo: 0 },
      { crop: 'amaranth', quantity: 50, pricePerUnit: 1500, harvestedDaysAgo: 0 },
      { crop: 'mint', quantity: 40, pricePerUnit: 1000, harvestedDaysAgo: 0 },
      { crop: 'jackfruit', quantity: 15, pricePerUnit: 4000 },
    ],
  },
];

export const DEMO_BUYERS = [
  {
    key: 'vijayawada',
    phone: '+919999900021',
    language: 'te',
    profile: {
      name: 'Padma (Demo)',
      addresses: [
        {
          label: 'Home',
          landmark: 'Near Benz Circle',
          area: 'Vijayawada',
          pincode: '520010',
          location: { type: 'Point', coordinates: [80.648, 16.5062] },
          isDefault: true,
        },
      ],
    },
  },
  {
    key: 'guntur',
    phone: '+919999900022',
    language: 'en',
    profile: {
      name: 'Arjun (Demo)',
      addresses: [
        {
          label: 'Home',
          landmark: 'Opposite Brodipet park',
          area: 'Guntur',
          pincode: '522002',
          location: { type: 'Point', coordinates: [80.4365, 16.3067] },
          isDefault: true,
        },
      ],
    },
  },
  {
    // Pincode only: shows the buyer-side fallback when location permission is denied.
    key: 'hyderabad',
    phone: '+919999900023',
    language: 'hi',
    profile: {
      name: 'Sunita (Demo)',
      addresses: [
        {
          label: 'Flat',
          landmark: 'Gachibowli stadium road',
          area: 'Hyderabad',
          pincode: '500032',
          isDefault: true,
        },
      ],
    },
  },
];

// statusPath lists every status the order passed through, in order.
export const DEMO_ORDERS = [
  {
    buyer: 'vijayawada',
    farmer: 'ramu',
    items: [
      { crop: 'tomato', quantity: 2 },
      { crop: 'brinjal', quantity: 1 },
    ],
    paymentMethod: 'cod',
    statusPath: ['placed'],
    slotInDays: 1,
  },
  {
    buyer: 'vijayawada',
    farmer: 'ramu',
    items: [{ crop: 'okra', quantity: 1.5 }],
    paymentMethod: 'cod',
    statusPath: ['placed', 'accepted', 'out_for_delivery', 'delivered'],
    slotInDays: -1,
  },
  {
    buyer: 'guntur',
    farmer: 'lakshmi',
    items: [
      { crop: 'banana', quantity: 2 },
      { crop: 'gongura', quantity: 3 },
    ],
    paymentMethod: 'upi',
    statusPath: ['placed', 'accepted'],
    slotInDays: 2,
  },
  {
    buyer: 'hyderabad',
    farmer: 'srinivas',
    items: [{ crop: 'mango', quantity: 3 }],
    paymentMethod: 'cod',
    statusPath: ['placed', 'cancelled'],
    cancelReason: 'Ordered by mistake',
    slotInDays: 1,
  },
];

// Verified-purchase reviews: each gets its own delivered order first. Ramu, Lakshmi and Srinivas
// end up rated; Venkatesh and Suresh have none, so their listings show New.
export const DEMO_REVIEWS = [
  {
    buyer: 'vijayawada',
    farmer: 'ramu',
    crop: 'tomato',
    stars: 5,
    comment: 'Very fresh, delivered on time.',
  },
  {
    buyer: 'guntur',
    farmer: 'ramu',
    crop: 'brinjal',
    stars: 4,
    comment: 'Good quality, slightly late.',
  },
  {
    buyer: 'vijayawada',
    farmer: 'ramu',
    crop: 'okra',
    stars: 5,
    comment: 'Tender bhindi, will order again.',
  },
  {
    buyer: 'guntur',
    farmer: 'lakshmi',
    crop: 'spinach',
    stars: 5,
    comment: 'Clean leaves, good bunches.',
  },
  { buyer: 'vijayawada', farmer: 'lakshmi', crop: 'banana', stars: 4, comment: '' },
  {
    buyer: 'hyderabad',
    farmer: 'srinivas',
    crop: 'mango',
    stars: 5,
    comment: 'Sweet mangoes, well packed.',
  },
  {
    buyer: 'hyderabad',
    farmer: 'srinivas',
    crop: 'cucumber',
    stars: 3,
    comment: 'Okay, a few were soft.',
  },
];
