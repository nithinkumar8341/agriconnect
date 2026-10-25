// Common vegetables and fruits sold in Andhra Pradesh and Telangana.
// te and hi names are machine-written and listed in docs/translation-review.md for native review.
// shelfLifeDays is a conservative estimate at ambient temperature, used to warn about old listings.

const KG_PRESETS = [10, 25, 50, 100];
const BUNCH_PRESETS = [10, 25, 50, 100];
const DOZEN_PRESETS = [5, 10, 20, 50];
const PIECE_PRESETS = [5, 10, 20, 50];

function crop(category, slug, [en, te, hi], icon, shelfLifeDays, unitOptions) {
  return { slug, names: { en, te, hi }, category, icon, shelfLifeDays, ...unitOptions };
}

const byKg = {
  defaultUnit: 'kg',
  allowedUnits: ['kg'],
  quantityPresets: KG_PRESETS,
  quantityStep: 0.5,
};
const byBunch = {
  defaultUnit: 'bunch',
  allowedUnits: ['bunch'],
  quantityPresets: BUNCH_PRESETS,
  quantityStep: 1,
};
const byDozen = {
  defaultUnit: 'dozen',
  allowedUnits: ['dozen'],
  quantityPresets: DOZEN_PRESETS,
  quantityStep: 1,
};
const byPieceOrKg = {
  defaultUnit: 'piece',
  allowedUnits: ['piece', 'kg'],
  quantityPresets: PIECE_PRESETS,
  quantityStep: 1,
};

const vegetable = (slug, names, icon, days, units = byKg) =>
  crop('vegetable', slug, names, icon, days, units);
const leafy = (slug, names, icon, days) => crop('leafy', slug, names, icon, days, byBunch);
const fruit = (slug, names, icon, days, units = byKg) =>
  crop('fruit', slug, names, icon, days, units);

export const CROPS = [
  vegetable('tomato', ['Tomato', 'టమాటా', 'टमाटर'], '🍅', 5),
  vegetable('onion', ['Onion', 'ఉల్లిపాయ', 'प्याज'], '🧅', 30),
  vegetable('potato', ['Potato', 'బంగాళాదుంప', 'आलू'], '🥔', 30),
  vegetable('brinjal', ['Brinjal', 'వంకాయ', 'बैंगन'], '🍆', 4),
  vegetable('okra', ['Okra (Ladies finger)', 'బెండకాయ', 'भिंडी'], '🫛', 3),
  vegetable('green-chilli', ['Green chilli', 'పచ్చిమిర్చి', 'हरी मिर्च'], '🌶️', 6),
  vegetable('capsicum', ['Capsicum', 'క్యాప్సికమ్', 'शिमला मिर्च'], '🫑', 6),
  vegetable('cabbage', ['Cabbage', 'క్యాబేజీ', 'पत्तागोभी'], '🥬', 7),
  vegetable('cauliflower', ['Cauliflower', 'కాలీఫ్లవర్', 'फूलगोभी'], '🥦', 4, byPieceOrKg),
  vegetable('carrot', ['Carrot', 'క్యారెట్', 'गाजर'], '🥕', 10),
  vegetable('beetroot', ['Beetroot', 'బీట్‌రూట్', 'चुकंदर'], '🟣', 10),
  vegetable('radish', ['Radish', 'ముల్లంగి', 'मूली'], '🥕', 5),
  vegetable('bottle-gourd', ['Bottle gourd', 'సొరకాయ', 'लौकी'], '🥒', 6, byPieceOrKg),
  vegetable('ridge-gourd', ['Ridge gourd', 'బీరకాయ', 'तोरई'], '🥒', 4),
  vegetable('bitter-gourd', ['Bitter gourd', 'కాకరకాయ', 'करेला'], '🥒', 4),
  vegetable('snake-gourd', ['Snake gourd', 'పొట్లకాయ', 'चिचिंडा'], '🥒', 4),
  vegetable('ash-gourd', ['Ash gourd', 'బూడిద గుమ్మడికాయ', 'पेठा'], '🎃', 30, byPieceOrKg),
  vegetable('pumpkin', ['Pumpkin', 'గుమ్మడికాయ', 'कद्दू'], '🎃', 30, byPieceOrKg),
  vegetable('drumstick', ['Drumstick', 'మునగకాయ', 'सहजन'], '🌿', 5),
  vegetable('cluster-beans', ['Cluster beans', 'గోరుచిక్కుడు', 'ग्वार फली'], '🫛', 4),
  vegetable('french-beans', ['French beans', 'బీన్స్', 'फ्रेंच बीन्स'], '🫛', 4),
  vegetable('broad-beans', ['Broad beans (Dolichos)', 'చిక్కుడుకాయ', 'सेम'], '🫛', 4),
  vegetable('cucumber', ['Cucumber', 'దోసకాయ', 'खीरा'], '🥒', 5),
  vegetable('ivy-gourd', ['Ivy gourd', 'దొండకాయ', 'कुंदरू'], '🥒', 4),
  vegetable('raw-banana', ['Raw banana', 'అరటికాయ', 'कच्चा केला'], '🍌', 5),
  vegetable('colocasia', ['Colocasia (Arbi)', 'చేమదుంప', 'अरबी'], '🥔', 10),
  vegetable('sweet-potato', ['Sweet potato', 'చిలగడదుంప', 'शकरकंद'], '🍠', 14),
  vegetable('elephant-foot-yam', ['Elephant foot yam', 'కంద', 'जिमीकंद'], '🥔', 30),
  vegetable('ginger', ['Ginger', 'అల్లం', 'अदरक'], '🫚', 21),
  vegetable('garlic', ['Garlic', 'వెల్లుల్లి', 'लहसुन'], '🧄', 60),
  vegetable('green-peas', ['Green peas', 'పచ్చి బఠానీ', 'हरी मटर'], '🫛', 3),
  vegetable('sweet-corn', ['Sweet corn', 'మొక్కజొన్న', 'भुट्टा'], '🌽', 3, byPieceOrKg),

  leafy('spinach', ['Spinach', 'పాలకూర', 'पालक'], '🥬', 2),
  leafy('amaranth', ['Amaranth leaves', 'తోటకూర', 'चौलाई'], '🥬', 2),
  leafy('fenugreek-leaves', ['Fenugreek leaves', 'మెంతికూర', 'मेथी'], '🥬', 2),
  leafy('coriander', ['Coriander leaves', 'కొత్తిమీర', 'धनिया'], '🌿', 3),
  leafy('mint', ['Mint', 'పుదీనా', 'पुदीना'], '🌿', 3),
  leafy('curry-leaves', ['Curry leaves', 'కరివేపాకు', 'करी पत्ता'], '🌿', 5),
  leafy('gongura', ['Gongura (Sorrel leaves)', 'గోంగూర', 'गोंगुरा (अम्बाड़ी)'], '🥬', 2),
  leafy('spring-onion', ['Spring onion', 'ఉల్లికాడలు', 'हरा प्याज'], '🧅', 3),
  leafy('dill', ['Dill leaves', 'సోయకూర', 'सोआ'], '🌿', 2),
  leafy('drumstick-leaves', ['Drumstick leaves', 'మునగాకు', 'सहजन की पत्तियाँ'], '🌿', 2),

  fruit('banana', ['Banana', 'అరటిపండు', 'केला'], '🍌', 4, byDozen),
  fruit('mango', ['Mango', 'మామిడిపండు', 'आम'], '🥭', 6),
  fruit('papaya', ['Papaya', 'బొప్పాయి', 'पपीता'], '🍈', 4, byPieceOrKg),
  fruit('guava', ['Guava', 'జామపండు', 'अमरूद'], '🍐', 4),
  fruit('sapota', ['Sapota (Chikoo)', 'సపోటా', 'चीकू'], '🟤', 4),
  fruit('watermelon', ['Watermelon', 'పుచ్చకాయ', 'तरबूज'], '🍉', 10, byPieceOrKg),
  fruit('muskmelon', ['Muskmelon', 'కర్బూజ', 'खरबूजा'], '🍈', 5, byPieceOrKg),
  fruit('pomegranate', ['Pomegranate', 'దానిమ్మ', 'अनार'], '🍎', 14),
  fruit('sweet-lime', ['Sweet lime (Mosambi)', 'బత్తాయి', 'मौसमी'], '🍊', 10),
  fruit('lemon', ['Lemon', 'నిమ్మకాయ', 'नींबू'], '🍋', 10, {
    defaultUnit: 'piece',
    allowedUnits: ['piece', 'kg'],
    quantityPresets: [50, 100, 200, 500],
    quantityStep: 5,
  }),
  fruit('custard-apple', ['Custard apple', 'సీతాఫలం', 'शरीफा'], '🍏', 3),
  fruit('jackfruit', ['Jackfruit', 'పనసపండు', 'कटहल'], '🍈', 4, byPieceOrKg),
  fruit('coconut', ['Coconut', 'కొబ్బరికాయ', 'नारियल'], '🥥', 30, byPieceOrKg),
  fruit(
    'tender-coconut',
    ['Tender coconut', 'కొబ్బరి బొండం', 'कच्चा नारियल'],
    '🥥',
    7,
    byPieceOrKg,
  ),
  fruit('grapes', ['Grapes', 'ద్రాక్ష', 'अंगूर'], '🍇', 4),
  fruit('orange', ['Orange', 'నారింజ', 'संतरा'], '🍊', 10),
  fruit('jamun', ['Jamun (Indian blackberry)', 'నేరేడుపండు', 'जामुन'], '🫐', 2),
];
