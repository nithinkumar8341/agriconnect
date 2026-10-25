// Districts of Andhra Pradesh (26, after the April 2022 reorganisation) and Telangana (33).
// `en` is the stored value (FarmerProfile.district); te and hi are display names, machine-written
// and listed in docs/translation-review.md. Mandals and villages are free text for now: a complete
// list should come from the official Local Government Directory (see ADR 0006).

const d = (en, te, hi) => ({ en, te, hi });

export const DISTRICTS = Object.freeze({
  'Andhra Pradesh': [
    d('Srikakulam', 'శ్రీకాకుళం', 'श्रीकाकुलम'),
    d('Vizianagaram', 'విజయనగరం', 'विजयनगरम'),
    d('Parvathipuram Manyam', 'పార్వతీపురం మన్యం', 'पार्वतीपुरम मन्यम'),
    d('Alluri Sitharama Raju', 'అల్లూరి సీతారామరాజు', 'अल्लूरी सीताराम राजू'),
    d('Visakhapatnam', 'విశాఖపట్నం', 'विशाखापत्तनम'),
    d('Anakapalli', 'అనకాపల్లి', 'अनकापल्ली'),
    d('Kakinada', 'కాకినాడ', 'काकीनाडा'),
    d('East Godavari', 'తూర్పు గోదావరి', 'पूर्वी गोदावरी'),
    d('Dr. B.R. Ambedkar Konaseema', 'డా. బి.ఆర్. అంబేద్కర్ కోనసీమ', 'डॉ. बी.आर. आंबेडकर कोनसीमा'),
    d('Eluru', 'ఏలూరు', 'एलुरु'),
    d('West Godavari', 'పశ్చిమ గోదావరి', 'पश्चिमी गोदावरी'),
    d('NTR', 'ఎన్టీఆర్', 'एनटीआर'),
    d('Krishna', 'కృష్ణా', 'कृष्णा'),
    d('Palnadu', 'పల్నాడు', 'पलनाडु'),
    d('Guntur', 'గుంటూరు', 'गुंटूर'),
    d('Bapatla', 'బాపట్ల', 'बापटला'),
    d('Prakasam', 'ప్రకాశం', 'प्रकाशम'),
    d(
      'Sri Potti Sriramulu Nellore',
      'శ్రీ పొట్టి శ్రీరాములు నెల్లూరు',
      'श्री पोट्टि श्रीरामुलु नेल्लोर',
    ),
    d('Kurnool', 'కర్నూలు', 'कुरनूल'),
    d('Nandyal', 'నంద్యాల', 'नंद्याल'),
    d('Anantapuramu', 'అనంతపురం', 'अनंतपुरम'),
    d('Sri Sathya Sai', 'శ్రీ సత్యసాయి', 'श्री सत्य साई'),
    d('YSR Kadapa', 'వైఎస్ఆర్ కడప', 'वाईएसआर कडपा'),
    d('Annamayya', 'అన్నమయ్య', 'अन्नमय्या'),
    d('Tirupati', 'తిరుపతి', 'तिरुपति'),
    d('Chittoor', 'చిత్తూరు', 'चित्तूर'),
  ],
  Telangana: [
    d('Adilabad', 'ఆదిలాబాద్', 'आदिलाबाद'),
    d('Komaram Bheem Asifabad', 'కొమరం భీమ్ ఆసిఫాబాద్', 'कोमरम भीम आसिफाबाद'),
    d('Mancherial', 'మంచిర్యాల', 'मंचेरियल'),
    d('Nirmal', 'నిర్మల్', 'निर्मल'),
    d('Nizamabad', 'నిజామాబాద్', 'निज़ामाबाद'),
    d('Jagtial', 'జగిత్యాల', 'जगतियाल'),
    d('Peddapalli', 'పెద్దపల్లి', 'पेद्दापल्ली'),
    d('Kamareddy', 'కామారెడ్డి', 'कामारेड्डी'),
    d('Rajanna Sircilla', 'రాజన్న సిరిసిల్ల', 'राजन्ना सिरसिल्ला'),
    d('Karimnagar', 'కరీంనగర్', 'करीमनगर'),
    d('Jayashankar Bhupalpally', 'జయశంకర్ భూపాలపల్లి', 'जयशंकर भूपालपल्ली'),
    d('Sangareddy', 'సంగారెడ్డి', 'संगारेड्डी'),
    d('Medak', 'మెదక్', 'मेदक'),
    d('Siddipet', 'సిద్దిపేట', 'सिद्दीपेट'),
    d('Jangaon', 'జనగామ', 'जनगांव'),
    d('Hanumakonda', 'హనుమకొండ', 'हनमकोंडा'),
    d('Warangal', 'వరంగల్', 'वरंगल'),
    d('Mulugu', 'ములుగు', 'मुलुगु'),
    d('Bhadradri Kothagudem', 'భద్రాద్రి కొత్తగూడెం', 'भद्राद्री कोठागुडेम'),
    d('Khammam', 'ఖమ్మం', 'खम्मम'),
    d('Mahabubabad', 'మహబూబాబాద్', 'महबूबाबाद'),
    d('Suryapet', 'సూర్యాపేట', 'सूर्यापेट'),
    d('Nalgonda', 'నల్గొండ', 'नलगोंडा'),
    d('Yadadri Bhuvanagiri', 'యాదాద్రి భువనగిరి', 'यादाद्री भुवनगिरी'),
    d('Medchal-Malkajgiri', 'మేడ్చల్ మల్కాజిగిరి', 'मेडचल मलकाजगिरी'),
    d('Hyderabad', 'హైదరాబాద్', 'हैदराबाद'),
    d('Rangareddy', 'రంగారెడ్డి', 'रंगारेड्डी'),
    d('Vikarabad', 'వికారాబాద్', 'विकाराबाद'),
    d('Narayanpet', 'నారాయణపేట', 'नारायणपेट'),
    d('Mahabubnagar', 'మహబూబ్‌నగర్', 'महबूबनगर'),
    d('Nagarkurnool', 'నాగర్‌కర్నూల్', 'नागरकुरनूल'),
    d('Wanaparthy', 'వనపర్తి', 'वनपर्ती'),
    d('Jogulamba Gadwal', 'జోగులాంబ గద్వాల', 'जोगुलाम्बा गदवाल'),
  ],
});

// Postal circles: Telangana pincodes start with 50, Andhra Pradesh with 51-53. Catches a mistyped
// first digit or a pincode from the wrong state before it breaks delivery matching.
const PINCODE_PREFIXES = { 'Andhra Pradesh': ['51', '52', '53'], Telangana: ['50'] };

export function isDistrictInState(state, district) {
  return (DISTRICTS[state] ?? []).some((entry) => entry.en === district);
}

export function isPincodeInState(state, pincode) {
  return (PINCODE_PREFIXES[state] ?? []).some((prefix) => pincode.startsWith(prefix));
}
