# Translation Review

Every Telugu (te) and Hindi (hi) string written by a machine (including Claude) is listed here until a native speaker checks it. Add a row whenever new te/hi keys are added; mark it reviewed once verified.

| File | Key | Language | Machine text | Reviewed by | Corrected text |
| --- | --- | --- | --- | --- | --- |
| backend/src/services/sms/templates.js | `OTP_TEMPLATES.te` | te | `{otp} మీ AgriConnect లాగిన్ కోడ్. ఇది 5 నిమిషాల వరకు చెల్లుతుంది. దీన్ని ఎవరితోనూ పంచుకోవద్దు.` | | |
| backend/src/services/sms/templates.js | `OTP_TEMPLATES.hi` | hi | `{otp} आपका AgriConnect लॉगिन कोड है। यह 5 मिनट तक मान्य है। इसे किसी के साथ साझा न करें।` | | |

Meaning of both (English source): "`{otp}` is your AgriConnect login code. It is valid for 5 minutes. Do not share it with anyone."

**Before real SMS goes live:**
- The final texts must match the templates registered on the DLT portal **character for character**, so re-check them then.
- Unicode (Telugu/Hindi) SMS segments hold 70 characters instead of 160. Check the cost per message.

## Crop names (backend/src/seeds/crops.data.js)

59 crops, all machine-written in te and hi. Pay special attention to:
- local names that differ between Andhra and Telangana (for example cluster beans, dolichos beans, colocasia);
- crops with no common Hindi name in the south (gongura, ivy gourd, snake gourd).

Fill the "reviewed" columns with the reviewer's name or a corrected name.

| slug | English | Telugu (machine) | te reviewed / corrected | Hindi (machine) | hi reviewed / corrected |
| --- | --- | --- | --- | --- | --- |
| tomato | Tomato | టమాటా | | टमाटर | |
| onion | Onion | ఉల్లిపాయ | | प्याज | |
| potato | Potato | బంగాళాదుంప | | आलू | |
| brinjal | Brinjal | వంకాయ | | बैंगन | |
| okra | Okra (Ladies finger) | బెండకాయ | | भिंडी | |
| green-chilli | Green chilli | పచ్చిమిర్చి | | हरी मिर्च | |
| capsicum | Capsicum | క్యాప్సికమ్ | | शिमला मिर्च | |
| cabbage | Cabbage | క్యాబేజీ | | पत्तागोभी | |
| cauliflower | Cauliflower | కాలీఫ్లవర్ | | फूलगोभी | |
| carrot | Carrot | క్యారెట్ | | गाजर | |
| beetroot | Beetroot | బీట్‌రూట్ | | चुकंदर | |
| radish | Radish | ముల్లంగి | | मूली | |
| bottle-gourd | Bottle gourd | సొరకాయ | | लौकी | |
| ridge-gourd | Ridge gourd | బీరకాయ | | तोरई | |
| bitter-gourd | Bitter gourd | కాకరకాయ | | करेला | |
| snake-gourd | Snake gourd | పొట్లకాయ | | चिचिंडा | |
| ash-gourd | Ash gourd | బూడిద గుమ్మడికాయ | | पेठा | |
| pumpkin | Pumpkin | గుమ్మడికాయ | | कद्दू | |
| drumstick | Drumstick | మునగకాయ | | सहजन | |
| cluster-beans | Cluster beans | గోరుచిక్కుడు | | ग्वार फली | |
| french-beans | French beans | బీన్స్ | | फ्रेंच बीन्स | |
| broad-beans | Broad beans (Dolichos) | చిక్కుడుకాయ | | सेम | |
| cucumber | Cucumber | దోసకాయ | | खीरा | |
| ivy-gourd | Ivy gourd | దొండకాయ | | कुंदरू | |
| raw-banana | Raw banana | అరటికాయ | | कच्चा केला | |
| colocasia | Colocasia (Arbi) | చేమదుంప | | अरबी | |
| sweet-potato | Sweet potato | చిలగడదుంప | | शकरकंद | |
| elephant-foot-yam | Elephant foot yam | కంద | | जिमीकंद | |
| ginger | Ginger | అల్లం | | अदरक | |
| garlic | Garlic | వెల్లుల్లి | | लहसुन | |
| green-peas | Green peas | పచ్చి బఠానీ | | हरी मटर | |
| sweet-corn | Sweet corn | మొక్కజొన్న | | भुट्टा | |
| spinach | Spinach | పాలకూర | | पालक | |
| amaranth | Amaranth leaves | తోటకూర | | चौलाई | |
| fenugreek-leaves | Fenugreek leaves | మెంతికూర | | मेथी | |
| coriander | Coriander leaves | కొత్తిమీర | | धनिया | |
| mint | Mint | పుదీనా | | पुदीना | |
| curry-leaves | Curry leaves | కరివేపాకు | | करी पत्ता | |
| gongura | Gongura (Sorrel leaves) | గోంగూర | | गोंगुरा (अम्बाड़ी) | |
| spring-onion | Spring onion | ఉల్లికాడలు | | हरा प्याज | |
| dill | Dill leaves | సోయకూర | | सोआ | |
| drumstick-leaves | Drumstick leaves | మునగాకు | | सहजन की पत्तियाँ | |
| banana | Banana | అరటిపండు | | केला | |
| mango | Mango | మామిడిపండు | | आम | |
| papaya | Papaya | బొప్పాయి | | पपीता | |
| guava | Guava | జామపండు | | अमरूद | |
| sapota | Sapota (Chikoo) | సపోటా | | चीकू | |
| watermelon | Watermelon | పుచ్చకాయ | | तरबूज | |
| muskmelon | Muskmelon | కర్బూజ | | खरबूजा | |
| pomegranate | Pomegranate | దానిమ్మ | | अनार | |
| sweet-lime | Sweet lime (Mosambi) | బత్తాయి | | मौसमी | |
| lemon | Lemon | నిమ్మకాయ | | नींबू | |
| custard-apple | Custard apple | సీతాఫలం | | शरीफा | |
| jackfruit | Jackfruit | పనసపండు | | कटहल | |
| coconut | Coconut | కొబ్బరికాయ | | नारियल | |
| tender-coconut | Tender coconut | కొబ్బరి బొండం | | कच्चा नारियल | |
| grapes | Grapes | ద్రాక్ష | | अंगूर | |
| orange | Orange | నారింజ | | संतरा | |
| jamun | Jamun (Indian blackberry) | నేరేడుపండు | | जामुन | |

## Frontend UI strings (frontend/src/i18n/locales)

Machine-written te and hi for every UI key, in all namespaces. The app falls back to English for a missing key, but every key is currently filled (a test checks this). Some Telugu labels were deliberately shortened to fit a 360px phone (for example "నా పంటలు" for My products); reviewers should keep replacements short too.

| namespace:key | English | Telugu (machine) | te reviewed | Hindi (machine) | hi reviewed |
| --- | --- | --- | --- | --- | --- |
| auth:stepOf | Step {{current}} of {{total}} | {{total}}లో {{current}}వ దశ |  | चरण {{current}} / {{total}} |  |
| auth:language.title | Choose your language | మీ భాషను ఎంచుకోండి |  | अपनी भाषा चुनें |  |
| auth:language.continue | Continue | కొనసాగించండి |  | आगे बढ़ें |  |
| auth:phone.title | Your mobile number | మీ మొబైల్ నంబర్ |  | आपका मोबाइल नंबर |  |
| auth:phone.label | Mobile number | మొబైల్ నంబర్ |  | मोबाइल नंबर |  |
| auth:phone.hint | We will send a 6-digit code to this number by SMS. | ఈ నంబర్‌కు SMS ద్వారా 6 అంకెల కోడ్ పంపుతాము. |  | हम इस नंबर पर SMS से 6 अंकों का कोड भेजेंगे। |  |
| auth:phone.countryCode | +91 | +91 |  | +91 |  |
| auth:phone.invalid | Enter a 10-digit mobile number starting with 6, 7, 8 or 9. | 6, 7, 8 లేదా 9తో మొదలయ్యే 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి. |  | 6, 7, 8 या 9 से शुरू होने वाला 10 अंकों का मोबाइल नंबर डालें। |  |
| auth:phone.remember | Keep me logged in on this phone | ఈ ఫోన్‌లో నన్ను లాగిన్‌లో ఉంచండి |  | इस फ़ोन पर मुझे लॉगिन रखें |  |
| auth:phone.rememberHint | Turn this off on a shared phone. | ఇతరులతో పంచుకునే ఫోన్ అయితే దీన్ని ఆపివేయండి. |  | साझा फ़ोन पर इसे बंद करें। |  |
| auth:phone.submit | Get OTP | OTP పొందండి |  | OTP पाएँ |  |
| auth:otp.title | Enter the code | కోడ్ ఇవ్వండి |  | कोड डालें |  |
| auth:otp.sentTo | We sent a 6-digit code to {{phone}}. | {{phone}}కు 6 అంకెల కోడ్ పంపాము. |  | हमने {{phone}} पर 6 अंकों का कोड भेजा है। |  |
| auth:otp.label | 6-digit code | 6 అంకెల కోడ్ |  | 6 अंकों का कोड |  |
| auth:otp.invalidFormat | The code has 6 digits. | కోడ్‌లో 6 అంకెలు ఉంటాయి. |  | कोड में 6 अंक होते हैं। |  |
| auth:otp.submit | Verify and continue | నిర్ధారించి కొనసాగించండి |  | पुष्टि करें और आगे बढ़ें |  |
| auth:otp.changeNumber | Change number | నంబర్ మార్చండి |  | नंबर बदलें |  |
| auth:otp.resendIn | You can ask for a new code in {{seconds}} seconds. | {{seconds}} సెకన్లలో కొత్త కోడ్ అడగవచ్చు. |  | {{seconds}} सेकंड में नया कोड माँग सकते हैं। |  |
| auth:otp.resend | Send a new code | కొత్త కోడ్ పంపండి |  | नया कोड भेजें |  |
| auth:otp.resent | A new code has been sent. | కొత్త కోడ్ పంపబడింది. |  | नया कोड भेज दिया गया है। |  |
| auth:otp.help | Need help? Call AgriConnect support | సహాయం కావాలా? AgriConnect సపోర్ట్‌కు కాల్ చేయండి |  | मदद चाहिए? AgriConnect सहायता को कॉल करें |  |
| auth:pin.title | Enter your PIN | మీ PIN ఇవ్వండి |  | अपना PIN डालें |  |
| auth:pin.setupTitle | Create your PIN | మీ PIN తయారు చేసుకోండి |  | अपना PIN बनाएँ |  |
| auth:pin.intro | Agents and admins use a PIN as a second check. | ఏజెంట్లు, అడ్మిన్లు రెండో తనిఖీగా PIN ఉపయోగిస్తారు. |  | एजेंट और एडमिन दूसरी जाँच के लिए PIN का उपयोग करते हैं। |  |
| auth:pin.setupIntro | Choose a 4 to 6 digit PIN. You will enter it after the SMS code every time you log in. | 4 నుండి 6 అంకెల PIN ఎంచుకోండి. ప్రతిసారి లాగిన్ అయ్యేటప్పుడు SMS కోడ్ తర్వాత దీన్ని ఇవ్వాలి. |  | 4 से 6 अंकों का PIN चुनें। हर बार लॉगिन करते समय SMS कोड के बाद इसे डालना होगा। |  |
| auth:pin.label | PIN | PIN |  | PIN |  |
| auth:pin.confirmLabel | Enter the PIN again | PIN మళ్ళీ ఇవ్వండి |  | PIN फिर से डालें |  |
| auth:pin.invalidFormat | The PIN has 4 to 6 digits. | PINలో 4 నుండి 6 అంకెలు ఉంటాయి. |  | PIN में 4 से 6 अंक होते हैं। |  |
| auth:pin.mismatch | The two PINs do not match. | రెండు PINలు ఒకేలా లేవు. |  | दोनों PIN एक जैसे नहीं हैं। |  |
| auth:pin.submit | Log in | లాగిన్ అవ్వండి |  | लॉगिन करें |  |
| auth:pin.setupSubmit | Save PIN and log in | PIN సేవ్ చేసి లాగిన్ అవ్వండి |  | PIN सेव करें और लॉगिन करें |  |
| auth:errors.OTP_INVALID | That code is not correct. {{count}} tries left. | ఈ కోడ్ సరైనది కాదు. ఇంకా {{count}} ప్రయత్నాలు మిగిలాయి. |  | यह कोड सही नहीं है। {{count}} प्रयास बाकी हैं। |  |
| auth:errors.OTP_EXPIRED | This code has expired. Please ask for a new code. | ఈ కోడ్ గడువు ముగిసింది. దయచేసి కొత్త కోడ్ అడగండి. |  | इस कोड की समय-सीमा खत्म हो गई। कृपया नया कोड माँगें। |  |
| auth:errors.OTP_NOT_FOUND | Please ask for a new code. | దయచేసి కొత్త కోడ్ అడగండి. |  | कृपया नया कोड माँगें। |  |
| auth:errors.OTP_LOCKED | Too many wrong codes. Please ask for a new code. | చాలా తప్పు కోడ్‌లు. దయచేసి కొత్త కోడ్ అడగండి. |  | बहुत सारे गलत कोड। कृपया नया कोड माँगें। |  |
| auth:errors.OTP_COOLDOWN | Please wait {{seconds}} seconds before asking for another code. | మరో కోడ్ అడగడానికి ముందు {{seconds}} సెకన్లు ఆగండి. |  | दूसरा कोड माँगने से पहले {{seconds}} सेकंड रुकें। |  |
| auth:errors.OTP_LIMIT_REACHED | Too many codes for this number. Please try again in an hour. | ఈ నంబర్‌కు చాలా కోడ్‌లు పంపాము. ఒక గంట తర్వాత ప్రయత్నించండి. |  | इस नंबर के लिए बहुत सारे कोड। एक घंटे बाद कोशिश करें। |  |
| auth:errors.SMS_FAILED | We could not send the SMS. Please try again. | SMS పంపలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి. |  | SMS नहीं भेज सके। कृपया फिर से कोशिश करें। |  |
| auth:errors.ACCOUNT_SUSPENDED | This account is suspended. Please contact AgriConnect support. | ఈ ఖాతా నిలిపివేయబడింది. దయచేసి AgriConnect సపోర్ట్‌ను సంప్రదించండి. |  | यह खाता निलंबित है। कृपया AgriConnect सहायता से संपर्क करें। |  |
| auth:errors.PIN_INVALID | That PIN is not correct. {{count}} tries left. | ఈ PIN సరైనది కాదు. ఇంకా {{count}} ప్రయత్నాలు మిగిలాయి. |  | यह PIN सही नहीं है। {{count}} प्रयास बाकी हैं। |  |
| auth:errors.PIN_LOCKED | Too many wrong PINs. Please try again after {{minutes}} minutes. | చాలా తప్పు PINలు. {{minutes}} నిమిషాల తర్వాత మళ్ళీ ప్రయత్నించండి. |  | बहुत सारे गलत PIN। {{minutes}} मिनट बाद फिर से कोशिश करें। |  |
| auth:errors.PIN_TOKEN_INVALID | This login took too long. Please start again. | లాగిన్‌కు చాలా సమయం పట్టింది. దయచేసి మళ్ళీ మొదలుపెట్టండి. |  | लॉगिन में बहुत समय लगा। कृपया फिर से शुरू करें। |  |
| auth:errors.PIN_ALREADY_SET | A PIN is already set. Please log in again. | PIN ఇప్పటికే ఉంది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి. |  | PIN पहले से बना हुआ है। कृपया फिर से लॉगिन करें। |  |
| buyer:home.title | Fresh near you | మీ దగ్గర తాజావి |  | आपके पास ताज़ा |  |
| buyer:home.search | Search vegetables and fruits | కూరగాయలు, పండ్లు వెతకండి |  | सब्ज़ियाँ और फल खोजें |  |
| buyer:home.categoryLabel | Category | రకం |  | प्रकार |  |
| buyer:home.sortLabel | Sort by | క్రమం |  | क्रम |  |
| buyer:home.filters | Filters | ఫిల్టర్లు |  | फ़िल्टर |  |
| buyer:home.filtersOn | Filters ({{count}}) | ఫిల్టర్లు ({{count}}) |  | फ़िल्टर ({{count}}) |  |
| buyer:home.showing | Showing {{shown}} of {{total}} | {{total}}లో {{shown}} చూపిస్తున్నాము |  | {{total}} में से {{shown}} दिखा रहे हैं |  |
| buyer:home.loadMore | Show more | ఇంకా చూపించు |  | और दिखाएँ |  |
| buyer:home.end | That is everything near you. | మీ దగ్గర ఉన్నవన్నీ ఇవే. |  | आपके पास इतना ही है। |  |
| buyer:home.emptyTitle | Nothing here yet | ఇక్కడ ఇంకా ఏమీ లేవు |  | यहाँ अभी कुछ नहीं |  |
| buyer:home.emptyMessage | No farmer delivers here with these choices. Try another pincode or clear the filters. | ఈ ఎంపికలతో ఇక్కడికి డెలివరీ చేసే రైతు లేరు. వేరే పిన్‌కోడ్ ప్రయత్నించండి లేదా ఫిల్టర్లు తీసేయండి. |  | इन विकल्पों के साथ कोई किसान यहाँ डिलीवरी नहीं करता। दूसरा पिनकोड आज़माएँ या फ़िल्टर हटाएँ। |  |
| buyer:categories.all | All | అన్నీ |  | सभी |  |
| buyer:categories.vegetable | Vegetables | కూరగాయలు |  | सब्ज़ियाँ |  |
| buyer:categories.leafy | Leafy greens | ఆకుకూరలు |  | पत्तेदार साग |  |
| buyer:categories.fruit | Fruits | పండ్లు |  | फल |  |
| buyer:categories.other | Others | ఇతరాలు |  | अन्य |  |
| buyer:sort.distance | Nearest | దగ్గరవి |  | सबसे पास |  |
| buyer:sort.price | Lowest price | తక్కువ ధర |  | सबसे कम भाव |  |
| buyer:sort.freshness | Freshest | తాజావి |  | सबसे ताज़ा |  |
| buyer:location.near | Near your location | మీ ప్రాంతం దగ్గర |  | आपकी जगह के पास |  |
| buyer:location.pincode | Pincode {{pincode}} | పిన్‌కోడ్ {{pincode}} |  | पिनकोड {{pincode}} |  |
| buyer:location.change | Change | మార్చండి |  | बदलें |  |
| buyer:location.title | Where should we deliver? | ఎక్కడికి డెలివరీ చేయాలి? |  | डिलीवरी कहाँ करें? |  |
| buyer:location.why | Used only to find farmers who deliver to you. Farmers never see your location. | మీకు డెలివరీ చేసే రైతులను కనుగొనడానికి మాత్రమే. రైతులకు మీ లొకేషన్ కనిపించదు. |  | सिर्फ़ आपको डिलीवरी करने वाले किसान खोजने के लिए। किसानों को आपकी जगह नहीं दिखती। |  |
| buyer:location.useLocation | Use my location | నా లొకేషన్ వాడండి |  | मेरी लोकेशन लें |  |
| buyer:location.denied | Location is off. Enter your pincode instead. | లొకేషన్ ఆఫ్‌లో ఉంది. బదులుగా పిన్‌కోడ్ ఇవ్వండి. |  | लोकेशन बंद है। इसके बदले अपना पिनकोड डालें। |  |
| buyer:location.pincodeLabel | Or enter your pincode | లేదా మీ పిన్‌కోడ్ ఇవ్వండి |  | या अपना पिनकोड डालें |  |
| buyer:location.pincodeError | Enter a 6-digit pincode. | 6 అంకెల పిన్‌కోడ్ ఇవ్వండి. |  | 6 अंकों का पिनकोड डालें। |  |
| buyer:location.save | Show produce | పంటలు చూపించు |  | फ़सलें दिखाएँ |  |
| buyer:location.needed | Tell us where you are to see farmers who deliver to you. | మీకు డెలివరీ చేసే రైతులను చూడటానికి మీరు ఎక్కడ ఉన్నారో చెప్పండి. |  | आपको डिलीवरी करने वाले किसान देखने के लिए बताएँ कि आप कहाँ हैं। |  |
| buyer:filter.title | Filters | ఫిల్టర్లు |  | फ़िल्टर |  |
| buyer:filter.minPrice | Lowest price (₹) | కనీస ధర (₹) |  | सबसे कम भाव (₹) |  |
| buyer:filter.maxPrice | Highest price (₹) | గరిష్ట ధర (₹) |  | सबसे ज़्यादा भाव (₹) |  |
| buyer:filter.day | Delivery day | డెలివరీ రోజు |  | डिलीवरी का दिन |  |
| buyer:filter.anyDay | Any day | ఏ రోజైనా |  | कोई भी दिन |  |
| buyer:filter.stock | Show | చూపించు |  | दिखाएँ |  |
| buyer:filter.inStock | In stock only | అందుబాటులో ఉన్నవి |  | सिर्फ़ उपलब्ध |  |
| buyer:filter.all | Also out of stock | అయిపోయినవి కూడా |  | ख़त्म हुए भी |  |
| buyer:filter.apply | Show results | ఫలితాలు చూపించు |  | नतीजे दिखाएँ |  |
| buyer:filter.clear | Clear filters | ఫిల్టర్లు తీసేయండి |  | फ़िल्टर हटाएँ |  |
| buyer:card.price | {{price}} / {{unit}} | {{price}} / {{unit}} |  | {{price}} / {{unit}} |  |
| buyer:card.km | {{km}} km away | {{km}} కి.మీ దూరం |  | {{km}} किमी दूर |  |
| buyer:card.under1 | Under 1 km | 1 కి.మీ లోపు |  | 1 किमी से कम |  |
| buyer:card.from | {{name}}, {{village}} | {{name}}, {{village}} |  | {{name}}, {{village}} |  |
| buyer:card.delivery | Delivery {{date}} | డెలివరీ {{date}} |  | डिलीवरी {{date}} |  |
| buyer:card.outOfStock | Out of stock | అయిపోయింది |  | ख़त्म |  |
| buyer:product.title | Product details | పంట వివరాలు |  | फ़सल की जानकारी |  |
| buyer:product.available | {{quantity}} {{unit}} available | {{quantity}} {{unit}} అందుబాటులో ఉంది |  | {{quantity}} {{unit}} उपलब्ध |  |
| buyer:product.harvested | Harvested {{date}} | {{date}}న కోశారు |  | तुड़ाई {{date}} |  |
| buyer:product.soldBy | Sold by | అమ్మేవారు |  | बेचने वाले |  |
| buyer:product.seeFarmer | See farmer | రైతును చూడండి |  | किसान देखें |  |
| buyer:product.deliveryDays | Delivers on | డెలివరీ రోజులు |  | डिलीवरी के दिन |  |
| buyer:product.deliveryFee | Delivery fee | డెలివరీ ఛార్జీ |  | डिलीवरी शुल्क |  |
| buyer:product.minOrder | Minimum order | కనీస ఆర్డర్ |  | न्यूनतम ऑर्डर |  |
| buyer:product.nextDelivery | Next delivery | తదుపరి డెలివరీ |  | अगली डिलीवरी |  |
| buyer:product.cannotDeliver | This farmer does not deliver to your location. | ఈ రైతు మీ ప్రాంతానికి డెలివరీ చేయరు. |  | यह किसान आपकी जगह पर डिलीवरी नहीं करते। |  |
| buyer:product.quantity | How much? | ఎంత కావాలి? |  | कितना चाहिए? |  |
| buyer:product.addToCart | Add to cart | కార్ట్‌లో వేయండి |  | कार्ट में डालें |  |
| buyer:product.added | Added to cart. | కార్ట్‌లో వేశాము. |  | कार्ट में डाल दिया। |  |
| buyer:product.goToCart | Go to cart | కార్ట్‌కు వెళ్ళండి |  | कार्ट पर जाएँ |  |
| buyer:product.inCart | {{quantity}} {{unit}} in your cart | మీ కార్ట్‌లో {{quantity}} {{unit}} |  | आपके कार्ट में {{quantity}} {{unit}} |  |
| buyer:farmer.title | Farmer | రైతు |  | किसान |  |
| buyer:farmer.new | New | కొత్త |  | नए |  |
| buyer:farmer.levels.phone_verified | Phone verified | ఫోన్ ధృవీకరించబడింది |  | फ़ोन सत्यापित |  |
| buyer:farmer.levels.agent_verified | Checked by agent | ఏజెంట్ తనిఖీ చేశారు |  | एजेंट ने जाँचा |  |
| buyer:farmer.levels.trusted_seller | Trusted seller | నమ్మకమైన అమ్మకందారు |  | भरोसेमंद विक्रेता |  |
| buyer:farmer.since | On AgriConnect since {{date}} | {{date}} నుండి AgriConnectలో |  | {{date}} से AgriConnect पर |  |
| buyer:farmer.cutoff | Order before {{time}} for the next delivery | తదుపరి డెలివరీ కోసం {{time}} లోపు ఆర్డర్ చేయండి |  | अगली डिलीवरी के लिए {{time}} से पहले ऑर्डर करें |  |
| buyer:farmer.selling | Selling now | ఇప్పుడు అమ్ముతున్నవి |  | अभी बिक रहा है |  |
| buyer:farmer.nothing | Nothing on sale right now. | ప్రస్తుతం అమ్మకానికి ఏమీ లేవు. |  | अभी कुछ बिक्री पर नहीं है। |  |
| buyer:farmer.reviews | Reviews | రివ్యూలు |  | समीक्षाएँ |  |
| buyer:farmer.reviewsSoon | Reviews from buyers will appear here after delivered orders. | డెలివరీ అయిన ఆర్డర్ల తర్వాత కొనుగోలుదారుల రివ్యూలు ఇక్కడ కనిపిస్తాయి. |  | डिलीवर हुए ऑर्डर के बाद खरीदारों की समीक्षाएँ यहाँ दिखेंगी। |  |
| buyer:cart.title | My cart | నా కార్ట్ |  | मेरा कार्ट |  |
| buyer:cart.emptyTitle | Your cart is empty | మీ కార్ట్ ఖాళీగా ఉంది |  | आपका कार्ट ख़ाली है |  |
| buyer:cart.emptyMessage | Add vegetables and fruits from farmers near you. | మీ దగ్గరలోని రైతుల నుండి కూరగాయలు, పండ్లు వేయండి. |  | पास के किसानों से सब्ज़ियाँ और फल डालें। |  |
| buyer:cart.browse | See produce | పంటలు చూడండి |  | फ़सलें देखें |  |
| buyer:cart.from | From {{name}}, {{village}} | {{name}}, {{village}} నుండి |  | {{name}}, {{village}} से |  |
| buyer:cart.remove | Remove {{crop}} | {{crop}} తీసివేయండి |  | {{crop}} हटाएँ |  |
| buyer:cart.itemTotal | Item total | పంటల మొత్తం |  | फ़सलों का कुल |  |
| buyer:cart.deliveryFee | Delivery fee | డెలివరీ ఛార్జీ |  | डिलीवरी शुल्क |  |
| buyer:cart.farmerTotal | Total for this farmer | ఈ రైతుకు మొత్తం |  | इस किसान का कुल |  |
| buyer:cart.belowMinimum | Add {{amount}} more: this farmer’s minimum order is {{minimum}}. | ఇంకా {{amount}} వేయండి: ఈ రైతు కనీస ఆర్డర్ {{minimum}}. |  | {{amount}} और डालें: इस किसान का न्यूनतम ऑर्डर {{minimum}} है। |  |
| buyer:cart.deliveryDay | Delivery day | డెలివరీ రోజు |  | डिलीवरी का दिन |  |
| buyer:cart.deliverTo | Deliver to | డెలివరీ చిరునామా |  | डिलीवरी पता |  |
| buyer:cart.payment | Payment | చెల్లింపు |  | भुगतान |  |
| buyer:cart.cod | Cash on delivery | డెలివరీ సమయంలో నగదు |  | डिलीवरी पर नकद |  |
| buyer:cart.summary | Price summary | ధర వివరాలు |  | कीमत का ब्योरा |  |
| buyer:cart.itemsTotal | Vegetables and fruits | కూరగాయలు, పండ్లు |  | सब्ज़ियाँ और फल |  |
| buyer:cart.deliveryTotal | Delivery | డెలివరీ |  | डिलीवरी |  |
| buyer:cart.platformFee | Platform fee (from the farmer’s share) | ప్లాట్‌ఫామ్ ఫీజు (రైతు వాటా నుండి) |  | प्लेटफ़ॉर्म शुल्क (किसान के हिस्से से) |  |
| buyer:cart.grandTotal | You pay | మీరు చెల్లించేది |  | आप देंगे |  |
| buyer:cart.placeOrder | Place order | ఆర్డర్ చేయండి |  | ऑर्डर करें |  |
| buyer:cart.placed | Order placed. The farmer will confirm it soon. | ఆర్డర్ అయింది. రైతు త్వరలో నిర్ధారిస్తారు. |  | ऑर्डर हो गया। किसान जल्द ही पुष्टि करेंगे। |  |
| buyer:cart.changedTitle | Some things changed | కొన్ని మారాయి |  | कुछ बदल गया है |  |
| buyer:cart.changes.price | {{crop}}: price is now {{new}} (was {{old}}). | {{crop}}: ధర ఇప్పుడు {{new}} (ముందు {{old}}). |  | {{crop}}: भाव अब {{new}} है (पहले {{old}})। |  |
| buyer:cart.changes.stock | {{crop}}: only {{available}} {{unit}} left. | {{crop}}: {{available}} {{unit}} మాత్రమే మిగిలింది. |  | {{crop}}: सिर्फ़ {{available}} {{unit}} बचा है। |  |
| buyer:cart.changes.unavailable | {{crop}} is no longer available. | {{crop}} ఇప్పుడు అందుబాటులో లేదు. |  | {{crop}} अब उपलब्ध नहीं है। |  |
| buyer:cart.changes.not_delivered | {{crop}}: this farmer does not deliver to your address. | {{crop}}: ఈ రైతు మీ చిరునామాకు డెలివరీ చేయరు. |  | {{crop}}: ये किसान आपके पते पर डिलीवरी नहीं करते। |  |
| buyer:cart.acceptChanges | OK, update my cart | సరే, కార్ట్ మార్చండి |  | ठीक है, कार्ट बदलें |  |
| buyer:cart.errors.BELOW_MINIMUM | Some farmers need a bigger order. Add more items or remove theirs. | కొందరు రైతులకు పెద్ద ఆర్డర్ కావాలి. ఇంకా వేయండి లేదా వారి పంటలు తీసేయండి. |  | कुछ किसानों को बड़ा ऑर्डर चाहिए। और डालें या उनकी चीज़ें हटाएँ। |  |
| buyer:cart.errors.INVALID_DELIVERY_DATE | Choose a delivery day for each farmer. | ప్రతి రైతుకు డెలివరీ రోజు ఎంచుకోండి. |  | हर किसान के लिए डिलीवरी का दिन चुनें। |  |
| buyer:cart.errors.COD_LIMIT | New buyers can pay cash for orders up to {{limit}}. Make the order smaller. | కొత్త కొనుగోలుదారులు {{limit}} వరకు నగదుతో చెల్లించవచ్చు. ఆర్డర్ తగ్గించండి. |  | नए खरीदार {{limit}} तक नकद दे सकते हैं। ऑर्डर छोटा करें। |  |
| buyer:cart.errors.TOO_MANY_OPEN_ORDERS | You already have open orders. Please wait until they are delivered. | మీకు ఇప్పటికే తెరిచిన ఆర్డర్లు ఉన్నాయి. అవి డెలివరీ అయ్యే వరకు ఆగండి. |  | आपके पहले से खुले ऑर्डर हैं। उनके डिलीवर होने तक रुकें। |  |
| buyer:cart.errors.COD_BLOCKED | Cash on delivery is not available on this account. | ఈ ఖాతాకు డెలివరీ సమయంలో నగదు అందుబాటులో లేదు. |  | इस खाते पर डिलीवरी पर नकद उपलब्ध नहीं है। |  |
| buyer:cart.errors.ADDRESS_REQUIRED | Add a delivery address in your profile first. | ముందుగా మీ ప్రొఫైల్‌లో డెలివరీ చిరునామా ఇవ్వండి. |  | पहले अपनी प्रोफ़ाइल में डिलीवरी पता जोड़ें। |  |
| buyer:cart.upi | UPI (test mode) | UPI (టెస్ట్ మోడ్) |  | UPI (टेस्ट मोड) |  |
| buyer:cart.upiNote | Test mode: you tap Pay and no real money moves. | టెస్ట్ మోడ్: మీరు చెల్లించు నొక్కుతారు, నిజమైన డబ్బు వెళ్ళదు. |  | टेस्ट मोड: आप भुगतान दबाते हैं, असली पैसा नहीं जाता। |  |
| buyer:orders.title | My orders | నా ఆర్డర్లు |  | मेरे ऑर्डर |  |
| buyer:orders.emptyTitle | No orders yet | ఇంకా ఆర్డర్లు లేవు |  | अभी कोई ऑर्डर नहीं |  |
| buyer:orders.emptyMessage | Your orders will appear here. | మీ ఆర్డర్లు ఇక్కడ కనిపిస్తాయి. |  | आपके ऑर्डर यहाँ दिखेंगे। |  |
| buyer:orders.status.placed | Waiting for farmer | రైతు కోసం వేచి ఉంది |  | किसान का इंतज़ार |  |
| buyer:orders.status.accepted | Accepted | అంగీకరించారు |  | स्वीकार हुआ |  |
| buyer:orders.status.out_for_delivery | On the way | దారిలో ఉంది |  | रास्ते में |  |
| buyer:orders.status.delivered | Delivered | డెలివరీ అయింది |  | डिलीवर हुआ |  |
| buyer:orders.status.cancelled | Cancelled | రద్దు అయింది |  | रद्द हुआ |  |
| buyer:orders.status.rejected | Declined by farmer | రైతు తిరస్కరించారు |  | किसान ने मना किया |  |
| buyer:orders.status.failed | Not delivered | డెలివరీ కాలేదు |  | डिलीवर नहीं हुआ |  |
| buyer:orders.delivery | Delivery {{date}} | డెలివరీ {{date}} |  | डिलीवरी {{date}} |  |
| buyer:orders.total | Total {{amount}} · {{method}} | మొత్తం {{amount}} · {{method}} |  | कुल {{amount}} · {{method}} |  |
| buyer:orders.cancel | Cancel order | ఆర్డర్ రద్దు చేయండి |  | ऑर्डर रद्द करें |  |
| buyer:orders.cancelTitle | Cancel this order? | ఈ ఆర్డర్ రద్దు చేయాలా? |  | यह ऑर्डर रद्द करें? |  |
| buyer:orders.cancelMessage | The farmer will be told. You can order again any time. | రైతుకు తెలియజేస్తాము. మీరు ఎప్పుడైనా మళ్ళీ ఆర్డర్ చేయవచ్చు. |  | किसान को बताया जाएगा। आप कभी भी फिर ऑर्डर कर सकते हैं। |  |
| buyer:orders.cancelConfirm | Yes, cancel | అవును, రద్దు చేయండి |  | हाँ, रद्द करें |  |
| buyer:orders.cancelled | Order cancelled. | ఆర్డర్ రద్దు అయింది. |  | ऑर्डर रद्द हुआ। |  |
| buyer:orders.errors.INVALID_STATUS_CHANGE | The farmer already accepted this order, so it cannot be cancelled here. | రైతు ఇప్పటికే ఈ ఆర్డర్ అంగీకరించారు, కాబట్టి ఇక్కడ రద్దు చేయలేరు. |  | किसान ने यह ऑर्डर स्वीकार कर लिया है, इसलिए यहाँ रद्द नहीं हो सकता। |  |
| buyer:orders.detailTitle | Order details | ఆర్డర్ వివరాలు |  | ऑर्डर की जानकारी |  |
| buyer:orders.code | Your delivery code | మీ డెలివరీ కోడ్ |  | आपका डिलीवरी कोड |  |
| buyer:orders.codeHint | Tell this code to the farmer only when you have your vegetables in hand. | కూరగాయలు మీ చేతికి వచ్చినప్పుడే ఈ కోడ్ రైతుకు చెప్పండి. |  | सब्ज़ियाँ हाथ में आने पर ही यह कोड किसान को बताएँ। |  |
| buyer:orders.callFarmer | Call {{name}} | {{name}}కు కాల్ చేయండి |  | {{name}} को कॉल करें |  |
| buyer:orders.open | See order | ఆర్డర్ చూడండి |  | ऑर्डर देखें |  |
| buyer:orders.autoRefresh | This page updates by itself. | ఈ పేజీ దానంతట అదే అప్‌డేట్ అవుతుంది. |  | यह पेज अपने आप अपडेट होता है। |  |
| buyer:orders.payNow | Pay {{amount}} by UPI (test mode) | UPI ద్వారా {{amount}} చెల్లించండి (టెస్ట్ మోడ్) |  | UPI से {{amount}} दें (टेस्ट मोड) |  |
| buyer:orders.paid | Payment received. | చెల్లింపు అందింది. |  | भुगतान मिल गया। |  |
| buyer:orders.farmerReceives | Farmer receives | రైతుకు అందేది |  | किसान को मिलेगा |  |
| buyer:orders.paymentLabel | Payment | చెల్లింపు |  | भुगतान |  |
| buyer:orders.payment.pending | Not paid yet | ఇంకా చెల్లించలేదు |  | अभी भुगतान नहीं हुआ |  |
| buyer:orders.payment.held | Paid, held until delivery | చెల్లించారు, డెలివరీ వరకు ఉంచాము |  | भुगतान हुआ, डिलीवरी तक रखा गया |  |
| buyer:orders.payment.paid | Paid | చెల్లించారు |  | भुगतान हुआ |  |
| buyer:orders.payment.refunded | Refunded | తిరిగి ఇచ్చాము |  | पैसा वापस हुआ |  |
| buyer:orders.payment.partially_refunded | Partly refunded | కొంత తిరిగి ఇచ్చాము |  | कुछ पैसा वापस हुआ |  |
| buyer:orders.payment.failed | Payment failed | చెల్లింపు విఫలమైంది |  | भुगतान नहीं हुआ |  |
| buyer:orders.upi | UPI (test mode) | UPI (టెస్ట్ మోడ్) |  | UPI (टेस्ट मोड) |  |
| buyer:review.title | How was your order? | మీ ఆర్డర్ ఎలా ఉంది? |  | आपका ऑर्डर कैसा रहा? |  |
| buyer:review.stars | Stars | నక్షత్రాలు |  | स्टार |  |
| buyer:review.starLabel | {{count}} ★ | {{count}} ★ |  | {{count}} ★ |  |
| buyer:review.comment | Anything to add? (optional) | ఇంకా ఏమైనా చెప్పాలా? (ఐచ్ఛికం) |  | कुछ और कहना है? (वैकल्पिक) |  |
| buyer:review.submit | Send review | రివ్యూ పంపండి |  | समीक्षा भेजें |  |
| buyer:review.thanks | Thank you for your review! | మీ రివ్యూకు ధన్యవాదాలు! |  | समीक्षा के लिए धन्यवाद! |  |
| buyer:trust.rating | ★ {{rating}} ({{count}} reviews) | ★ {{rating}} ({{count}} రివ్యూలు) |  | ★ {{rating}} ({{count}} समीक्षाएँ) |  |
| buyer:trust.orders | {{count}} orders delivered | {{count}} ఆర్డర్లు డెలివరీ చేశారు |  | {{count}} ऑर्डर डिलीवर किए |  |
| buyer:trust.noReviews | No reviews yet. | ఇంకా రివ్యూలు లేవు. |  | अभी कोई समीक्षा नहीं। |  |
| buyer:returns.report | Report a problem | సమస్య తెలపండి |  | समस्या बताएँ |  |
| buyer:returns.title | What was wrong? | ఏం తప్పు జరిగింది? |  | क्या गलत था? |  |
| buyer:returns.reason | Problem | సమస్య |  | समस्या |  |
| buyer:returns.reasons.damaged | Damaged | పాడైంది |  | खराब हालत |  |
| buyer:returns.reasons.rotten | Rotten | కుళ్ళిపోయింది |  | सड़ा हुआ |  |
| buyer:returns.reasons.wrong_item | Wrong item | వేరే సరుకు వచ్చింది |  | गलत सामान |  |
| buyer:returns.reasons.underweight | Less than ordered | ఆర్డర్ కంటే తక్కువ |  | ऑर्डर से कम |  |
| buyer:returns.note | Tell us more (optional) | ఇంకా చెప్పండి (ఐచ్ఛికం) |  | और बताएँ (वैकल्पिक) |  |
| buyer:returns.photo | Take a photo of the problem | సమస్య ఫోటో తీయండి |  | समस्या की फ़ोटो लें |  |
| buyer:returns.photoAdded | Photo added | ఫోటో జోడించాము |  | फ़ोटो जुड़ गई |  |
| buyer:returns.send | Send report | రిపోర్ట్ పంపండి |  | रिपोर्ट भेजें |  |
| buyer:returns.sent | Reported. We will check and reply soon. | రిపోర్ట్ అయింది. మేము తనిఖీ చేసి త్వరలో చెబుతాము. |  | रिपोर्ट हो गई। हम जाँच कर जल्द बताएँगे। |  |
| buyer:returns.status.open | Problem reported, being checked | సమస్య తెలిపారు, తనిఖీ జరుగుతోంది |  | समस्या दर्ज, जाँच चल रही है |  |
| buyer:returns.status.approved | Refund of {{amount}} approved | {{amount}} రీఫండ్ ఆమోదించాము |  | {{amount}} की वापसी मंज़ूर |  |
| buyer:returns.status.rejected | Report not approved | రిపోర్ట్ ఆమోదించలేదు |  | रिपोर्ट मंज़ूर नहीं हुई |  |
| common:app.name | AgriConnect | AgriConnect |  | AgriConnect |  |
| common:app.tagline | Fresh vegetables and fruits, straight from nearby farmers | దగ్గరలోని రైతుల నుండి నేరుగా తాజా కూరగాయలు, పండ్లు |  | पास के किसानों से सीधे ताज़ी सब्ज़ियाँ और फल |  |
| common:actions.back | Back | వెనుకకు |  | वापस |  |
| common:actions.retry | Try again | మళ్ళీ ప్రయత్నించండి |  | फिर से कोशिश करें |  |
| common:actions.cancel | Cancel | రద్దు చేయండి |  | रद्द करें |  |
| common:actions.confirm | Yes, continue | అవును, కొనసాగించండి |  | हाँ, आगे बढ़ें |  |
| common:actions.close | Close | మూసివేయండి |  | बंद करें |  |
| common:actions.dismiss | Dismiss | తీసివేయండి |  | हटाएँ |  |
| common:actions.login | Log in with phone number | ఫోన్ నంబర్‌తో లాగిన్ అవ్వండి |  | फ़ोन नंबर से लॉगिन करें |  |
| common:actions.logout | Log out | లాగ్ అవుట్ |  | लॉग आउट |  |
| common:actions.goHome | Go to home | హోమ్‌కు వెళ్ళండి |  | होम पर जाएँ |  |
| common:actions.skipToContent | Skip to main content | ప్రధాన విషయానికి వెళ్ళండి |  | मुख्य सामग्री पर जाएँ |  |
| common:actions.next | Next | తరువాత |  | आगे |  |
| common:language.label | Language | భాష |  | भाषा |  |
| common:language.choose | Choose your language | మీ భాషను ఎంచుకోండి |  | अपनी भाषा चुनें |  |
| common:language.change | Change language | భాష మార్చండి |  | भाषा बदलें |  |
| common:nav.label | Main menu | ప్రధాన మెనూ |  | मुख्य मेनू |  |
| common:nav.home | Home | హోమ్ |  | होम |  |
| common:nav.products | My products | నా పంటలు |  | मेरे उत्पाद |  |
| common:nav.orders | Orders | ఆర్డర్లు |  | ऑर्डर |  |
| common:nav.profile | Profile | ప్రొఫైల్ |  | प्रोफ़ाइल |  |
| common:nav.farmers | Farmers | రైతులు |  | किसान |  |
| common:nav.users | Users | వినియోగదారులు |  | उपयोगकर्ता |  |
| common:nav.settings | Settings | సెట్టింగ్‌లు |  | सेटिंग्स |  |
| common:nav.cart | Cart | కార్ట్ |  | कार्ट |  |
| common:roles.farmer | Farmer | రైతు |  | किसान |  |
| common:roles.buyer | Buyer | కొనుగోలుదారు |  | खरीदार |  |
| common:roles.agent | Field agent | ఫీల్డ్ ఏజెంట్ |  | फ़ील्ड एजेंट |  |
| common:roles.admin | Admin | అడ్మిన్ |  | एडमिन |  |
| common:home.title | Home | హోమ్ |  | होम |  |
| common:home.welcome | Welcome | స్వాగతం |  | स्वागत है |  |
| common:home.signedInAs | Signed in as {{role}} | {{role}}గా లాగిన్ అయ్యారు |  | {{role}} के रूप में लॉगिन |  |
| common:status.loading | Loading… | లోడ్ అవుతోంది… |  | लोड हो रहा है… |  |
| common:status.offline | You are offline. Some things may not be up to date. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. కొన్ని వివరాలు తాజావి కాకపోవచ్చు. |  | आप ऑफ़लाइन हैं। कुछ जानकारी पुरानी हो सकती है। |  |
| common:status.backOnline | You are back online. | మీరు మళ్ళీ ఆన్‌లైన్‌లోకి వచ్చారు. |  | आप फिर से ऑनलाइन हैं। |  |
| common:units.kg | kg | కిలో |  | किलो |  |
| common:units.dozen | dozen | డజను |  | दर्जन |  |
| common:units.bunch | bunch | కట్ట |  | गुच्छा |  |
| common:units.piece | piece | ఒక్కటి |  | नग |  |
| common:units.km | km | కి.మీ |  | किमी |  |
| common:stepper.decrease | Decrease {{label}} | {{label}} తగ్గించండి |  | {{label}} घटाएँ |  |
| common:stepper.increase | Increase {{label}} | {{label}} పెంచండి |  | {{label}} बढ़ाएँ |  |
| common:comingSoon.title | Coming soon | త్వరలో వస్తుంది |  | जल्द आ रहा है |  |
| common:comingSoon.message | This screen is being built and will be ready in a later update. | ఈ స్క్రీన్ తయారవుతోంది, తరువాతి అప్‌డేట్‌లో అందుబాటులోకి వస్తుంది. |  | यह स्क्रीन बनाई जा रही है और अगले अपडेट में उपलब्ध होगी। |  |
| common:notFound.title | Page not found | పేజీ కనబడలేదు |  | पेज नहीं मिला |  |
| common:notFound.message | We could not find this page. | ఈ పేజీని మేము కనుగొనలేకపోయాము. |  | हमें यह पेज नहीं मिला। |  |
| common:errors.title | Something went wrong | ఏదో పొరపాటు జరిగింది |  | कुछ गलत हो गया |  |
| common:errors.generic | Something went wrong. Please try again. | ఏదో పొరపాటు జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి. |  | कुछ गलत हो गया। कृपया फिर से कोशिश करें। |  |
| common:errors.NETWORK_ERROR | No internet connection. Please check your network and try again. | ఇంటర్నెట్ కనెక్షన్ లేదు. మీ నెట్‌వర్క్‌ను చూసి మళ్ళీ ప్రయత్నించండి. |  | इंटरनेट कनेक्शन नहीं है। अपना नेटवर्क जाँचें और फिर से कोशिश करें। |  |
| common:errors.RATE_LIMITED | Too many attempts. Please wait a moment and try again. | చాలా ఎక్కువ ప్రయత్నాలు. కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి. |  | बहुत अधिक प्रयास। थोड़ा रुककर फिर से कोशिश करें। |  |
| common:errors.INTERNAL_ERROR | Our server had a problem. Please try again. | మా సర్వర్‌లో సమస్య వచ్చింది. దయచేసి మళ్ళీ ప్రయత్నించండి. |  | हमारे सर्वर में समस्या आई। कृपया फिर से कोशिश करें। |  |
| common:errors.AUTH_REQUIRED | Please log in to continue. | కొనసాగడానికి దయచేసి లాగిన్ అవ్వండి. |  | आगे बढ़ने के लिए कृपया लॉगिन करें। |  |
| common:errors.REFRESH_INVALID | Your session has ended. Please log in again. | మీ సెషన్ ముగిసింది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి. |  | आपका सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें। |  |
| common:errors.FORBIDDEN | You do not have access to this. | దీనికి మీకు అనుమతి లేదు. |  | आपको इसकी अनुमति नहीं है। |  |
| common:errors.NOT_FOUND | We could not find what you were looking for. | మీరు వెతుకుతున్నది కనబడలేదు. |  | आप जो ढूँढ रहे थे वह नहीं मिला। |  |
| common:errors.VALIDATION_ERROR | Some details are not correct. Please check and try again. | కొన్ని వివరాలు సరిగ్గా లేవు. దయచేసి చూసి మళ్ళీ ప్రయత్నించండి. |  | कुछ जानकारी सही नहीं है। कृपया जाँचकर फिर से कोशिश करें। |  |
| common:weekdays.mon | Monday | సోమవారం |  | सोमवार |  |
| common:weekdays.tue | Tuesday | మంగళవారం |  | मंगलवार |  |
| common:weekdays.wed | Wednesday | బుధవారం |  | बुधवार |  |
| common:weekdays.thu | Thursday | గురువారం |  | गुरुवार |  |
| common:weekdays.fri | Friday | శుక్రవారం |  | शुक्रवार |  |
| common:weekdays.sat | Saturday | శనివారం |  | शनिवार |  |
| common:weekdays.sun | Sunday | ఆదివారం |  | रविवार |  |
| common:states.andhraPradesh | Andhra Pradesh | ఆంధ్రప్రదేశ్ |  | आंध्र प्रदेश |  |
| common:states.telangana | Telangana | తెలంగాణ |  | तेलंगाना |  |
| common:notifications.title | Updates | అప్‌డేట్‌లు |  | अपडेट |  |
| common:notifications.open | Updates ({{count}} new) | అప్‌డేట్‌లు ({{count}} కొత్తవి) |  | अपडेट ({{count}} नए) |  |
| common:notifications.openNone | Updates | అప్‌డేట్‌లు |  | अपडेट |  |
| common:notifications.empty | No updates yet. | ఇంకా అప్‌డేట్‌లు లేవు. |  | अभी कोई अपडेट नहीं। |  |
| common:notifications.markAll | Mark all as read | అన్నీ చదివినట్లు గుర్తించండి |  | सब पढ़ा हुआ करें |  |
| common:notifications.order.placed | New order from {{name}}. | {{name}} నుండి కొత్త ఆర్డర్. |  | {{name}} से नया ऑर्डर। |  |
| common:notifications.order.accepted | {{name}} accepted your order. | {{name}} మీ ఆర్డర్ అంగీకరించారు. |  | {{name}} ने आपका ऑर्डर स्वीकार किया। |  |
| common:notifications.order.out_for_delivery | {{name}} is on the way with your order. | {{name}} మీ ఆర్డర్‌తో దారిలో ఉన్నారు. |  | {{name}} आपका ऑर्डर लेकर रास्ते में हैं। |  |
| common:notifications.order.delivered | Your order from {{name}} was delivered. | {{name}} నుండి మీ ఆర్డర్ డెలివరీ అయింది. |  | {{name}} से आपका ऑर्डर डिलीवर हुआ। |  |
| common:notifications.order.cancelled | {{name}} cancelled the order. | {{name}} ఆర్డర్ రద్దు చేశారు. |  | {{name}} ने ऑर्डर रद्द किया। |  |
| common:notifications.order.rejected | {{name}} could not take your order: {{reason}} | {{name}} మీ ఆర్డర్ తీసుకోలేకపోయారు: {{reason}} |  | {{name}} आपका ऑर्डर नहीं ले सके: {{reason}} |  |
| common:notifications.order.failed | Delivery from {{name}} did not happen: {{reason}} | {{name}} నుండి డెలివరీ జరగలేదు: {{reason}} |  | {{name}} से डिलीवरी नहीं हुई: {{reason}} |  |
| common:notifications.return.requested | A buyer reported a problem with an order. | ఒక కొనుగోలుదారు ఆర్డర్‌లో సమస్య తెలిపారు. |  | एक खरीदार ने ऑर्डर में समस्या बताई। |  |
| common:notifications.return.approved | Your problem report was approved. A refund is on the way. | మీ సమస్య రిపోర్ట్ ఆమోదించాము. రీఫండ్ వస్తోంది. |  | आपकी समस्या रिपोर्ट मंज़ूर हुई। पैसा वापस आ रहा है। |  |
| common:notifications.return.rejected | Your problem report was not approved. | మీ సమస్య రిపోర్ట్ ఆమోదించలేదు. |  | आपकी समस्या रिपोर्ट मंज़ूर नहीं हुई। |  |
| common:timeline | What happened | ఏం జరిగింది |  | क्या हुआ |  |
| common:admin.homeTitle | Admin | అడ్మిన్ |  | एडमिन |  |
| common:admin.users | Users | యూజర్లు |  | यूज़र |  |
| common:admin.orders | Orders | ఆర్డర్లు |  | ऑर्डर |  |
| common:admin.flags | Fraud flags | మోసం హెచ్చరికలు |  | धोखाधड़ी चेतावनी |  |
| common:admin.returns | Returns | రిటర్న్‌లు |  | रिटर्न |  |
| common:admin.all | All | అన్నీ |  | सभी |  |
| common:admin.empty | Nothing here. | ఇక్కడ ఏమీ లేదు. |  | यहाँ कुछ नहीं। |  |
| common:admin.suspend | Suspend | నిలిపివేయండి |  | रोकें |  |
| common:admin.activate | Activate | సక్రియం చేయండి |  | चालू करें |  |
| common:admin.status | Status: {{status}} | స్థితి: {{status}} |  | स्थिति: {{status}} |  |
| common:admin.dismiss | Dismiss | తోసిపుచ్చండి |  | खारिज करें |  |
| common:admin.resolve | Mark resolved | పరిష్కరించినట్లు గుర్తించండి |  | हल हुआ दर्ज करें |  |
| common:admin.approve | Approve refund | రీఫండ్ ఆమోదించండి |  | रिफ़ंड मंज़ूर करें |  |
| common:admin.reject | Reject | తిరస్కరించండి |  | मना करें |  |
| common:admin.accounts | {{accounts}} accounts at one address (limit {{limit}}), pincode {{pincode}} | ఒకే చిరునామాలో {{accounts}} ఖాతాలు (పరిమితి {{limit}}), పిన్‌కోడ్ {{pincode}} |  | एक पते पर {{accounts}} खाते (सीमा {{limit}}), पिनकोड {{pincode}} |  |
| common:admin.orderLine | {{name}} · {{amount}} · {{status}} | {{name}} · {{amount}} · {{status}} |  | {{name}} · {{amount}} · {{status}} |  |
| common:admin.reason | Reason: {{reason}} | కారణం: {{reason}} |  | कारण: {{reason}} |  |
| common:admin.listingPhotos | Listing photos | లిస్టింగ్ ఫోటోలు |  | लिस्टिंग फ़ोटो |  |
| common:admin.done | Saved. | సేవ్ అయింది. |  | सेव हो गया। |  |
| devui:title | Component gallery | కాంపోనెంట్ గ్యాలరీ |  | कंपोनेंट गैलरी |  |
| devui:intro | Every reusable component, shown in the current language. Switch the language to check the layout. | ప్రతి కాంపోనెంట్ ప్రస్తుత భాషలో చూపబడింది. లేఅవుట్ చూడటానికి భాష మార్చండి. |  | हर कंपोनेंट मौजूदा भाषा में दिखाया गया है। लेआउट जाँचने के लिए भाषा बदलें। |  |
| devui:sections.buttons | Big buttons | పెద్ద బటన్లు |  | बड़े बटन |  |
| devui:sections.tiles | Icon tiles | ఐకాన్ టైల్స్ |  | आइकन टाइल |  |
| devui:sections.stepper | Quantity stepper | పరిమాణం మార్చే బటన్లు |  | मात्रा बदलने के बटन |  |
| devui:sections.presets | Preset chips | త్వరిత ఎంపికలు |  | झटपट विकल्प |  |
| devui:sections.feedback | Toast messages | సందేశాలు |  | संदेश |  |
| devui:sections.loading | Loading skeleton | లోడ్ అవుతున్న రూపం |  | लोड होता हुआ रूप |  |
| devui:sections.empty | Empty state | ఖాళీ స్థితి |  | खाली स्थिति |  |
| devui:sections.error | Error state | పొరపాటు స్థితి |  | त्रुटि स्थिति |  |
| devui:sections.confirm | Confirmation sheet | నిర్ధారణ షీట్ |  | पुष्टि शीट |  |
| devui:sections.nav | Bottom navigation | కింది మెనూ |  | नीचे का मेनू |  |
| devui:samples.sell | Sell produce | పంట అమ్మండి |  | फ़सल बेचें |  |
| devui:samples.myOrders | My orders | నా ఆర్డర్లు |  | मेरे ऑर्डर |  |
| devui:samples.marketPrices | Market prices | మార్కెట్ ధరలు |  | मंडी भाव |  |
| devui:samples.assistant | Ask assistant | సహాయకుడిని అడగండి |  | सहायक से पूछें |  |
| devui:samples.callAgent | Call my agent | నా ఏజెంట్‌కు కాల్ చేయండి |  | मेरे एजेंट को कॉल करें |  |
| devui:samples.deleteListing | Delete listing | లిస్టింగ్ తొలగించండి |  | लिस्टिंग हटाएँ |  |
| devui:samples.saving | Saving | సేవ్ అవుతోంది |  | सेव हो रहा है |  |
| devui:samples.howMuch | How many kg? | ఎన్ని కిలోలు? |  | कितने किलो? |  |
| devui:samples.price | Price per kg | కిలో ధర |  | प्रति किलो भाव |  |
| devui:samples.toastSaved | Listing saved | లిస్టింగ్ సేవ్ అయింది |  | लिस्टिंग सेव हो गई |  |
| devui:samples.toastError | Could not save. Please try again. | సేవ్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి. |  | सेव नहीं हो सका। कृपया फिर से कोशिश करें। |  |
| devui:samples.showToast | Show message | సందేశం చూపించండి |  | संदेश दिखाएँ |  |
| devui:samples.showErrorToast | Show error message | పొరపాటు సందేశం చూపించండి |  | त्रुटि संदेश दिखाएँ |  |
| devui:samples.noOrdersTitle | No orders yet | ఇంకా ఆర్డర్లు లేవు |  | अभी कोई ऑर्डर नहीं |  |
| devui:samples.noOrdersMessage | When buyers order your produce, the orders will appear here. | కొనుగోలుదారులు మీ పంటను ఆర్డర్ చేసినప్పుడు, ఆర్డర్లు ఇక్కడ కనిపిస్తాయి. |  | जब खरीदार आपकी फ़सल ऑर्डर करेंगे, ऑर्डर यहाँ दिखेंगे। |  |
| devui:samples.openConfirm | Remove tomato listing | టమాటా లిస్టింగ్ తీసివేయండి |  | टमाटर लिस्टिंग हटाएँ |  |
| devui:samples.confirmTitle | Remove this listing? | ఈ లిస్టింగ్ తీసివేయాలా? |  | यह लिस्टिंग हटाएँ? |  |
| devui:samples.confirmMessage | Buyers will no longer see your tomatoes. You can add them again later. | కొనుగోలుదారులకు మీ టమాటాలు ఇక కనిపించవు. తరువాత మళ్ళీ జోడించవచ్చు. |  | खरीदारों को अब आपके टमाटर नहीं दिखेंगे। आप बाद में फिर से जोड़ सकते हैं। |  |
| devui:samples.confirmAction | Yes, remove | అవును, తీసివేయండి |  | हाँ, हटाएँ |  |
| devui:samples.confirmed | Listing removed | లిస్టింగ్ తీసివేయబడింది |  | लिस्टिंग हटा दी गई |  |
| devui:samples.badgeNew | new | కొత్తవి |  | नए |  |
| farmer:home.greeting | Namaste, {{name}} | నమస్కారం, {{name}} |  | नमस्ते, {{name}} |  |
| farmer:home.greetingNoName | Namaste | నమస్కారం |  | नमस्ते |  |
| farmer:home.glance | Today at a glance | ఈరోజు ఒక్క చూపులో |  | आज एक नज़र में |  |
| farmer:home.todayOrders | Orders today | ఈరోజు ఆర్డర్లు |  | आज के ऑर्डर |  |
| farmer:home.pendingDeliveries | Waiting to deliver | డెలివరీ చేయాల్సినవి |  | डिलीवरी बाकी |  |
| farmer:home.lowStock | Running low | తక్కువగా ఉన్నవి |  | कम बचा है |  |
| farmer:home.lowItem | {{crop}}: {{left}} {{unit}} left | {{crop}}: ఇంకా {{left}} {{unit}} మిగిలింది |  | {{crop}}: {{left}} {{unit}} बचा है |  |
| farmer:home.tasks | What do you want to do? | మీరు ఏమి చేయాలనుకుంటున్నారు? |  | आप क्या करना चाहते हैं? |  |
| farmer:tiles.sell | Sell produce | పంట అమ్మండి |  | फ़सल बेचें |  |
| farmer:tiles.products | My products | నా పంటలు |  | मेरे उत्पाद |  |
| farmer:tiles.orders | My orders | నా ఆర్డర్లు |  | मेरे ऑर्डर |  |
| farmer:tiles.prices | Market prices | మార్కెట్ ధరలు |  | मंडी भाव |  |
| farmer:tiles.assistant | Ask assistant | సహాయం అడగండి |  | सहायक से पूछें |  |
| farmer:tiles.callAgent | Call my agent | నా ఏజెంట్‌కు కాల్ |  | मेरे एजेंट को कॉल |  |
| farmer:tiles.callSupport | Call support | సపోర్ట్‌కు కాల్ |  | सहायता को कॉल |  |
| farmer:tiles.noAgent | No agent yet | ఇంకా ఏజెంట్ లేరు |  | अभी कोई एजेंट नहीं |  |
| farmer:tiles.newOrders | new | కొత్తవి |  | नए |  |
| farmer:tiles.earnings | My earnings | నా సంపాదన |  | मेरी कमाई |  |
| farmer:products.title | My products | నా పంటలు |  | मेरे उत्पाद |  |
| farmer:products.filterLabel | Show | చూపించు |  | दिखाएँ |  |
| farmer:products.filters.all | All | అన్నీ |  | सभी |  |
| farmer:products.filters.available | Selling | అమ్ముతున్నవి |  | बिक रहे |  |
| farmer:products.filters.low | Running low | తక్కువగా ఉన్నవి |  | कम बचे |  |
| farmer:products.filters.out_of_stock | Out of stock | అయిపోయినవి |  | खत्म |  |
| farmer:products.filters.paused | Paused | ఆపినవి |  | रोके गए |  |
| farmer:products.status.available | Selling | అమ్ముతున్నారు |  | बिक रहा है |  |
| farmer:products.status.out_of_stock | Out of stock | అయిపోయింది |  | खत्म |  |
| farmer:products.status.paused | Paused | ఆపారు |  | रोका गया |  |
| farmer:products.left | {{left}} of {{total}} {{unit}} left | {{total}} {{unit}}లో {{left}} మిగిలింది |  | {{total}} {{unit}} में से {{left}} बचा है |  |
| farmer:products.price | {{price}} per {{unit}} | {{unit}}కు {{price}} |  | {{price}} प्रति {{unit}} |  |
| farmer:products.harvested | Harvested {{date}} | {{date}}న కోశారు |  | {{date}} को तोड़ा |  |
| farmer:products.lowBadge | Running low | తక్కువగా ఉంది |  | कम बचा है |  |
| farmer:products.oldWarning | Harvested long ago. Check it is still fresh. | చాలా రోజుల క్రితం కోశారు. ఇంకా తాజాగా ఉందో చూడండి. |  | काफ़ी पहले तोड़ा गया। देख लें कि अभी भी ताज़ा है। |  |
| farmer:products.emptyTitle | No products yet | ఇంకా ఉత్పత్తులు లేవు |  | अभी कोई उत्पाद नहीं |  |
| farmer:products.emptyMessage | Add your first crop and nearby buyers will see it. | మీ మొదటి పంటను జోడించండి, దగ్గరలోని కొనుగోలుదారులకు కనిపిస్తుంది. |  | अपनी पहली फ़सल जोड़ें, पास के खरीदारों को दिखेगी। |  |
| farmer:products.emptyFilteredTitle | Nothing here | ఇక్కడ ఏమీ లేదు |  | यहाँ कुछ नहीं |  |
| farmer:products.emptyFilteredMessage | None of your products match this filter. | ఈ ఎంపికకు సరిపోయే ఉత్పత్తులు లేవు. |  | इस विकल्प से कोई उत्पाद मेल नहीं खाता। |  |
| farmer:products.showing | Showing {{shown}} of {{total}} | {{total}}లో {{shown}} చూపిస్తున్నాము |  | {{total}} में से {{shown}} दिखा रहे हैं |  |
| farmer:products.loadMore | Show more | మరిన్ని చూపించు |  | और दिखाएँ |  |
| farmer:products.manage | Manage | నిర్వహించండి |  | प्रबंधित करें |  |
| farmer:products.manageTitle | {{crop}}: what do you want to do? | {{crop}}: మీరు ఏమి చేయాలనుకుంటున్నారు? |  | {{crop}}: आप क्या करना चाहते हैं? |  |
| farmer:products.actions.edit | Edit price or quantity | ధర లేదా పరిమాణం మార్చండి |  | भाव या मात्रा बदलें |  |
| farmer:products.actions.pause | Pause selling | అమ్మకం ఆపండి |  | बिक्री रोकें |  |
| farmer:products.actions.resume | Start selling again | మళ్ళీ అమ్మడం మొదలుపెట్టండి |  | फिर से बेचना शुरू करें |  |
| farmer:products.actions.outOfStock | Mark out of stock | అయిపోయింది అని గుర్తించండి |  | खत्म के रूप में चिह्नित करें |  |
| farmer:products.actions.sellAgain | Sell again | మళ్ళీ అమ్మండి |  | फिर से बेचें |  |
| farmer:products.actions.delete | Delete listing | లిస్టింగ్ తొలగించండి |  | लिस्टिंग हटाएँ |  |
| farmer:products.editTitle | Edit listing | లిస్టింగ్ మార్చండి |  | लिस्टिंग बदलें |  |
| farmer:products.save | Save | సేవ్ చేయండి |  | सेव करें |  |
| farmer:products.harvestKeep | Keep harvest date | కోత తేదీ అలాగే ఉంచండి |  | तुड़ाई की तारीख वही रखें |  |
| farmer:products.harvestToday | Harvested today | ఈరోజు కోశాను |  | आज तोड़ा |  |
| farmer:products.sellAgainTitle | Sell {{crop}} again | {{crop}} మళ్ళీ అమ్మండి |  | {{crop}} फिर से बेचें |  |
| farmer:products.sellAgainHint | Same crop, price and photos, harvested today. | అదే పంట, ధర, ఫోటోలు; ఈరోజు కోసినట్లు. |  | वही फ़सल, भाव और फ़ोटो; आज तोड़ी हुई। |  |
| farmer:products.deleteTitle | Delete this listing? | ఈ లిస్టింగ్ తొలగించాలా? |  | यह लिस्टिंग हटाएँ? |  |
| farmer:products.deleteMessage | Buyers will no longer see it. Past orders are kept. | కొనుగోలుదారులకు ఇక కనిపించదు. పాత ఆర్డర్లు అలాగే ఉంటాయి. |  | खरीदारों को अब यह नहीं दिखेगी। पुराने ऑर्डर बने रहेंगे। |  |
| farmer:products.deleteConfirm | Yes, delete | అవును, తొలగించండి |  | हाँ, हटाएँ |  |
| farmer:products.done.edit | Listing updated. | లిస్టింగ్ మార్చబడింది. |  | लिस्टिंग बदल दी गई। |  |
| farmer:products.done.pause | Listing paused. | లిస్టింగ్ ఆపబడింది. |  | लिस्टिंग रोकी गई। |  |
| farmer:products.done.resume | Selling again. | మళ్ళీ అమ్ముతున్నారు. |  | फिर से बिक रही है। |  |
| farmer:products.done.outOfStock | Marked out of stock. | అయిపోయింది అని గుర్తించాము. |  | खत्म के रूप में चिह्नित। |  |
| farmer:products.done.sellAgain | New listing published. | కొత్త లిస్టింగ్ ప్రచురించబడింది. |  | नई लिस्टिंग प्रकाशित हुई। |  |
| farmer:products.done.delete | Listing deleted. | లిస్టింగ్ తొలగించబడింది. |  | लिस्टिंग हटा दी गई। |  |
| farmer:products.pausedExpired | Paused automatically: harvested too long ago. Edit the harvest date to sell again. | చాలా రోజుల క్రితం కోసినందున దానంతట అదే ఆపబడింది. మళ్ళీ అమ్మడానికి కోత తేదీ మార్చండి. |  | बहुत पहले तोड़ी गई थी, इसलिए अपने आप रोकी गई। फिर से बेचने के लिए तुड़ाई की तारीख बदलें। |  |
| farmer:products.errors.QUANTITY_BELOW_SOLD | Buyers already ordered more than this. Choose a bigger quantity. | కొనుగోలుదారులు ఇప్పటికే ఇంతకంటే ఎక్కువ ఆర్డర్ చేశారు. పెద్ద పరిమాణం ఎంచుకోండి. |  | खरीदार पहले ही इससे ज़्यादा ऑर्डर कर चुके हैं। बड़ी मात्रा चुनें। |  |
| farmer:products.errors.LISTING_EXPIRED | Harvested too long ago. Edit the harvest date first. | చాలా రోజుల క్రితం కోశారు. ముందుగా కోత తేదీ మార్చండి. |  | बहुत पहले तोड़ी गई। पहले तुड़ाई की तारीख बदलें। |  |
| farmer:products.errors.INVALID_STATUS_CHANGE | This listing just changed. Please try again. | ఈ లిస్టింగ్ ఇప్పుడే మారింది. దయచేసి మళ్ళీ ప్రయత్నించండి. |  | यह लिस्टिंग अभी बदली है। कृपया फिर से कोशिश करें। |  |
| farmer:profile.title | My profile | నా ప్రొఫైల్ |  | मेरी प्रोफ़ाइल |  |
| farmer:profile.farm | Farm details | పొలం వివరాలు |  | खेत की जानकारी |  |
| farmer:profile.location | Farm location | పొలం స్థానం |  | खेत की जगह |  |
| farmer:profile.delivery | Delivery | డెలివరీ |  | डिलीवरी |  |
| farmer:profile.language | Language | భాష |  | भाषा |  |
| farmer:profile.account | Account | ఖాతా |  | खाता |  |
| farmer:profile.edit | Edit | మార్చండి |  | बदलें |  |
| farmer:profile.editTitle | Edit farm details | పొలం వివరాలు మార్చండి |  | खेत की जानकारी बदलें |  |
| farmer:profile.save | Save changes | మార్పులు సేవ్ చేయండి |  | बदलाव सेव करें |  |
| farmer:profile.saved | Your details are saved. | మీ వివరాలు సేవ్ అయ్యాయి. |  | आपकी जानकारी सेव हो गई। |  |
| farmer:profile.noLocation | Not shared. Buyers find you by pincode. | పంచుకోలేదు. కొనుగోలుదారులు పిన్‌కోడ్ ద్వారా మిమ్మల్ని కనుగొంటారు. |  | साझा नहीं की। खरीदार पिनकोड से आपको ढूँढेंगे। |  |
| farmer:profile.locationShared | Shared. Buyers only see the approximate distance. | పంచుకున్నారు. కొనుగోలుదారులకు సుమారు దూరం మాత్రమే కనిపిస్తుంది. |  | साझा की। खरीदारों को सिर्फ़ अनुमानित दूरी दिखती है। |  |
| farmer:profile.days | Delivery days | డెలివరీ రోజులు |  | डिलीवरी के दिन |  |
| farmer:profile.cutoff | Order until {{time}} for the next delivery | తదుపరి డెలివరీకి {{time}} వరకు ఆర్డర్ చేయవచ్చు |  | अगली डिलीवरी के लिए {{time}} तक ऑर्डर |  |
| farmer:profile.radius | Up to {{km}} km | {{km}} కి.మీ వరకు |  | {{km}} किमी तक |  |
| farmer:profile.minOrder | Smallest order: {{amount}} | కనీస ఆర్డర్: {{amount}} |  | सबसे छोटा ऑर्डर: {{amount}} |  |
| farmer:profile.fee | Delivery charge: {{amount}} | డెలివరీ ఛార్జీ: {{amount}} |  | डिलीवरी शुल्क: {{amount}} |  |
| farmer:profile.pincodes | Delivers to: {{list}} | డెలివరీ చేసేది: {{list}} |  | यहाँ डिलीवरी: {{list}} |  |
| farmer:profile.phone | Phone | ఫోన్ |  | फ़ोन |  |
| farmer:profile.logoutAll | Log out on all phones | అన్ని ఫోన్లలో లాగ్ అవుట్ |  | सभी फ़ोन पर लॉग आउट |  |
| farmer:profile.logoutAllTitle | Log out on all phones? | అన్ని ఫోన్లలో లాగ్ అవుట్ చేయాలా? |  | सभी फ़ोन पर लॉग आउट करें? |  |
| farmer:profile.logoutAllMessage | You will need an SMS code to log in again on every phone, including this one. | ఈ ఫోన్‌తో సహా ప్రతి ఫోన్‌లో మళ్ళీ లాగిన్ అవ్వడానికి SMS కోడ్ కావాలి. |  | इस फ़ोन समेत हर फ़ोन पर फिर से लॉगिन करने के लिए SMS कोड चाहिए होगा। |  |
| farmer:profile.logoutAllConfirm | Yes, log out everywhere | అవును, అన్నిచోట్లా లాగ్ అవుట్ |  | हाँ, हर जगह लॉग आउट करें |  |
| farmer:sell.title | Sell produce | పంట అమ్మండి |  | फ़सल बेचें |  |
| farmer:sell.photosHeading | Photos of your produce | మీ పంట ఫోటోలు |  | आपकी फ़सल की फ़ोटो |  |
| farmer:sell.photosHint | Take a clear photo in daylight, close to the produce. Up to {{max}} photos. | పగటి వెలుతురులో, పంటకు దగ్గరగా స్పష్టమైన ఫోటో తీయండి. గరిష్టంగా {{max}} ఫోటోలు. |  | दिन की रोशनी में, फ़सल के पास से साफ़ फ़ोटो लें। ज़्यादा से ज़्यादा {{max}} फ़ोटो। |  |
| farmer:sell.count | {{count}} of {{max}} photos | {{max}}లో {{count}} ఫోటోలు |  | {{max}} में से {{count}} फ़ोटो |  |
| farmer:sell.takePhoto | Take photo | ఫోటో తీయండి |  | फ़ोटो लें |  |
| farmer:sell.gallery | Choose from gallery | గ్యాలరీ నుండి ఎంచుకోండి |  | गैलरी से चुनें |  |
| farmer:sell.remove | Remove photo | ఫోటో తీసివేయండి |  | फ़ोटो हटाएँ |  |
| farmer:sell.retry | Try again | మళ్ళీ ప్రయత్నించండి |  | फिर से कोशिश करें |  |
| farmer:sell.status.preparing | Preparing… | సిద్ధం చేస్తున్నాము… |  | तैयार कर रहे हैं… |  |
| farmer:sell.status.uploading | Uploading {{percent}}% | అప్‌లోడ్ అవుతోంది {{percent}}% |  | अपलोड हो रहा है {{percent}}% |  |
| farmer:sell.status.waiting | Waiting for internet | ఇంటర్నెట్ కోసం వేచి ఉంది |  | इंटरनेट का इंतज़ार |  |
| farmer:sell.status.uploaded | Uploaded | అప్‌లోడ్ అయింది |  | अपलोड हो गया |  |
| farmer:sell.status.failed | Upload failed | అప్‌లోడ్ కాలేదు |  | अपलोड नहीं हुआ |  |
| farmer:sell.errors.UNKNOWN_CROP | This crop is not available. Choose another. | ఈ పంట అందుబాటులో లేదు. వేరేది ఎంచుకోండి. |  | यह फ़सल उपलब्ध नहीं है। दूसरी चुनें। |  |
| farmer:sell.errors.UNIT_NOT_ALLOWED | Choose a unit from the list. | జాబితా నుండి కొలత ఎంచుకోండి. |  | सूची से इकाई चुनें। |  |
| farmer:sell.errors.HARVEST_IN_FUTURE | The harvest date cannot be in the future. | కోత తేదీ భవిష్యత్తులో ఉండకూడదు. |  | तुड़ाई की तारीख भविष्य में नहीं हो सकती। |  |
| farmer:sell.errors.HARVEST_TOO_OLD | This harvest is too old to sell. Pick a newer date. | ఈ కోత అమ్మడానికి చాలా పాతది. కొత్త తేదీ ఎంచుకోండి. |  | यह तुड़ाई बेचने के लिए बहुत पुरानी है। नई तारीख चुनें। |  |
| farmer:sell.errors.PHOTOS_UNAVAILABLE | A photo could not be used. Remove it and take it again. | ఒక ఫోటోను ఉపయోగించలేకపోయాము. దాన్ని తీసివేసి మళ్ళీ తీయండి. |  | एक फ़ोटो इस्तेमाल नहीं हो सकी। उसे हटाकर फिर से लें। |  |
| farmer:sell.waitingNote | You are offline. Photos are saved on this phone and will upload by themselves when the internet is back. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. ఫోటోలు ఈ ఫోన్‌లో సేవ్ అయ్యాయి, ఇంటర్నెట్ వచ్చినప్పుడు వాటంతట అవే అప్‌లోడ్ అవుతాయి. |  | आप ऑफ़लाइन हैं। फ़ोटो इस फ़ोन पर सेव हैं और इंटरनेट आने पर अपने आप अपलोड हो जाएँगी। |  |
| farmer:sell.stepPhotosCrop | Photos and crop | ఫోటోలు, పంట |  | फ़ोटो और फ़सल |  |
| farmer:sell.stepAmount | Quantity, price and harvest | పరిమాణం, ధర, కోత |  | मात्रा, भाव और तुड़ाई |  |
| farmer:sell.stepReview | Check and publish | చూసి ప్రచురించండి |  | जाँचें और प्रकाशित करें |  |
| farmer:sell.cropHeading | Which crop? | ఏ పంట? |  | कौन सी फ़सल? |  |
| farmer:sell.cropSearch | Search crop | పంటను వెతకండి |  | फ़सल खोजें |  |
| farmer:sell.cropNone | No crop matches. Try another spelling. | ఏ పంట సరిపోలలేదు. వేరే స్పెల్లింగ్ ప్రయత్నించండి. |  | कोई फ़सल नहीं मिली। दूसरी स्पेलिंग आज़माएँ। |  |
| farmer:sell.soldBefore | You sold before | మీరు ఇంతకు ముందు అమ్మినవి |  | आपने पहले बेची |  |
| farmer:sell.categories.all | All | అన్నీ |  | सभी |  |
| farmer:sell.categories.vegetable | Vegetables | కూరగాయలు |  | सब्ज़ियाँ |  |
| farmer:sell.categories.leafy | Leafy greens | ఆకుకూరలు |  | पत्तेदार साग |  |
| farmer:sell.categories.fruit | Fruits | పండ్లు |  | फल |  |
| farmer:sell.unit | Sold by | అమ్మే కొలత |  | किस में बेचें |  |
| farmer:sell.quantity | How much do you have? | మీ దగ్గర ఎంత ఉంది? |  | आपके पास कितना है? |  |
| farmer:sell.price | Price per {{unit}} | ఒక్కో {{unit}} ధర |  | प्रति {{unit}} भाव |  |
| farmer:sell.priceWarning | This is very different from your last price ({{price}} per {{unit}}). Please check. | ఇది మీ చివరి ధర ({{unit}}కు {{price}}) కంటే చాలా భిన్నంగా ఉంది. దయచేసి చూడండి. |  | यह आपके पिछले भाव ({{price}} प्रति {{unit}}) से बहुत अलग है। कृपया जाँच लें। |  |
| farmer:sell.harvest | When was it harvested? | ఎప్పుడు కోశారు? |  | कब तोड़ा गया? |  |
| farmer:sell.today | Today | ఈరోజు |  | आज |  |
| farmer:sell.yesterday | Yesterday | నిన్న |  | कल |  |
| farmer:sell.pickDate | Pick a date | తేదీ ఎంచుకోండి |  | तारीख चुनें |  |
| farmer:sell.harvestDateLabel | Harvest date | కోత తేదీ |  | तुड़ाई की तारीख |  |
| farmer:sell.needPhoto | Add at least one photo. | కనీసం ఒక ఫోటో జోడించండి. |  | कम से कम एक फ़ोटो जोड़ें। |  |
| farmer:sell.needCrop | Choose a crop. | పంటను ఎంచుకోండి. |  | फ़सल चुनें। |  |
| farmer:sell.reviewHeading | Check your listing | మీ లిస్టింగ్ చూడండి |  | अपनी लिस्टिंग जाँचें |  |
| farmer:sell.total | Total value | మొత్తం విలువ |  | कुल कीमत |  |
| farmer:sell.readAloud | Read aloud | చదివి వినిపించండి |  | पढ़कर सुनाएँ |  |
| farmer:sell.readAloudText | {{crop}}. {{quantity}} {{unit}}. {{price}} per {{unit}}. Harvested {{date}}. | {{crop}}. {{quantity}} {{unit}}. {{unit}}కు {{price}}. {{date}}న కోశారు. |  | {{crop}}। {{quantity}} {{unit}}। {{price}} प्रति {{unit}}। {{date}} को तोड़ा। |  |
| farmer:sell.publish | Publish listing | లిస్టింగ్ ప్రచురించండి |  | लिस्टिंग प्रकाशित करें |  |
| farmer:sell.published | Your listing is live. Nearby buyers can see it. | మీ లిస్టింగ్ ప్రచురించబడింది. దగ్గరలోని కొనుగోలుదారులు చూడగలరు. |  | आपकी लिस्टिंग प्रकाशित हो गई। पास के खरीदार इसे देख सकते हैं। |  |
| farmer:sell.photosPending | Waiting for photos to finish uploading. | ఫోటోలు అప్‌లోడ్ అయ్యే వరకు వేచి ఉంది. |  | फ़ोटो अपलोड होने का इंतज़ार है। |  |
| farmer:sell.offlineQueued | You are offline. Your listing is saved and will be published automatically when the internet is back. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. మీ లిస్టింగ్ సేవ్ అయింది, ఇంటర్నెట్ రాగానే దానంతట అదే ప్రచురించబడుతుంది. |  | आप ऑफ़लाइन हैं। आपकी लिस्टिंग सेव है और इंटरनेट आते ही अपने आप प्रकाशित हो जाएगी। |  |
| farmer:sell.typePrice | Or type the price (₹) | లేదా ధర టైప్ చేయండి (₹) |  | या भाव टाइप करें (₹) |  |
| farmer:sell.quickPick | Quick pick | త్వరగా ఎంచుకోండి |  | झटपट चुनें |  |
| farmer:sell.priceRange | Enter a price from ₹1 to {{max}}. | ₹1 నుండి {{max}} వరకు ధర ఇవ్వండి. |  | ₹1 से {{max}} तक का भाव डालें। |  |
| farmer:orders.title | My orders | నా ఆర్డర్లు |  | मेरे ऑर्डर |  |
| farmer:orders.tabs.new | New | కొత్తవి |  | नए |  |
| farmer:orders.tabs.active | To deliver | డెలివరీ చేయాలి |  | डिलीवर करने हैं |  |
| farmer:orders.tabs.done | Finished | ముగిసినవి |  | पूरे हुए |  |
| farmer:orders.status.placed | New order | కొత్త ఆర్డర్ |  | नया ऑर्डर |  |
| farmer:orders.status.accepted | Accepted | అంగీకరించారు |  | स्वीकार किया |  |
| farmer:orders.status.out_for_delivery | On the way | దారిలో ఉంది |  | रास्ते में |  |
| farmer:orders.status.delivered | Delivered | డెలివరీ అయింది |  | डिलीवर हुआ |  |
| farmer:orders.status.cancelled | Cancelled by buyer | కొనుగోలుదారు రద్దు చేశారు |  | खरीदार ने रद्द किया |  |
| farmer:orders.status.rejected | Rejected | తిరస్కరించారు |  | मना किया |  |
| farmer:orders.status.failed | Not delivered | డెలివరీ కాలేదు |  | डिलीवर नहीं हुआ |  |
| farmer:orders.emptyTitle | No orders here | ఇక్కడ ఆర్డర్లు లేవు |  | यहाँ कोई ऑर्डर नहीं |  |
| farmer:orders.emptyMessage | New orders from buyers appear here. | కొనుగోలుదారుల కొత్త ఆర్డర్లు ఇక్కడ కనిపిస్తాయి. |  | खरीदारों के नए ऑर्डर यहाँ दिखेंगे। |  |
| farmer:orders.detailTitle | Order | ఆర్డర్ |  | ऑर्डर |  |
| farmer:orders.deliverOn | Deliver on {{date}} | {{date}}న డెలివరీ |  | {{date}} को डिलीवरी |  |
| farmer:orders.youGet | You get {{amount}} | మీకు {{amount}} |  | आपको {{amount}} |  |
| farmer:orders.buyer | Buyer | కొనుగోలుదారు |  | खरीदार |  |
| farmer:orders.callBuyer | Call {{name}} | {{name}}కు కాల్ చేయండి |  | {{name}} को कॉल करें |  |
| farmer:orders.openMap | Open in maps | మ్యాప్‌లో తెరవండి |  | मैप में खोलें |  |
| farmer:orders.addressAfterAccept | Full address and phone number appear after you accept. | మీరు అంగీకరించాక పూర్తి చిరునామా, ఫోన్ నంబర్ కనిపిస్తాయి. |  | स्वीकार करने के बाद पूरा पता और फ़ोन नंबर दिखेगा। |  |
| farmer:orders.actions.accept | Accept order | ఆర్డర్ అంగీకరించండి |  | ऑर्डर स्वीकार करें |  |
| farmer:orders.actions.reject | Reject | తిరస్కరించండి |  | मना करें |  |
| farmer:orders.actions.dispatch | Out for delivery | డెలివరీకి బయలుదేరాను |  | डिलीवरी के लिए निकला |  |
| farmer:orders.actions.deliver | Delivered | డెలివరీ చేశాను |  | डिलीवर किया |  |
| farmer:orders.actions.fail | Could not deliver | డెలివరీ చేయలేకపోయాను |  | डिलीवर नहीं हो सका |  |
| farmer:orders.done.accept | Order accepted. The buyer has been told. | ఆర్డర్ అంగీకరించారు. కొనుగోలుదారుకు తెలియజేశాము. |  | ऑर्डर स्वीकार हुआ। खरीदार को बता दिया गया। |  |
| farmer:orders.done.reject | Order rejected. | ఆర్డర్ తిరస్కరించారు. |  | ऑर्डर मना किया। |  |
| farmer:orders.done.dispatch | Marked out for delivery. | డెలివరీకి బయలుదేరినట్లు గుర్తించాము. |  | डिलीवरी के लिए निकलना दर्ज हुआ। |  |
| farmer:orders.done.deliver | Delivered. Well done! | డెలివరీ అయింది. బాగా చేశారు! |  | डिलीवर हो गया। बहुत बढ़िया! |  |
| farmer:orders.done.fail | Marked as not delivered. The stock is back on sale. | డెలివరీ కాలేదని గుర్తించాము. సరుకు మళ్ళీ అమ్మకానికి ఉంది. |  | डिलीवर नहीं हुआ दर्ज किया। माल फिर से बिक्री पर है। |  |
| farmer:orders.rejectTitle | Why are you rejecting? | ఎందుకు తిరస్కరిస్తున్నారు? |  | आप मना क्यों कर रहे हैं? |  |
| farmer:orders.failTitle | Why could you not deliver? | ఎందుకు డెలివరీ చేయలేకపోయారు? |  | डिलीवरी क्यों नहीं हो सकी? |  |
| farmer:orders.reasonLabel | Reason | కారణం |  | कारण |  |
| farmer:orders.otherReason | Or write the reason | లేదా కారణం రాయండి |  | या कारण लिखें |  |
| farmer:orders.rejectReasons.stock | Not enough stock | సరిపడా సరుకు లేదు |  | पूरा माल नहीं है |  |
| farmer:orders.rejectReasons.quality | Quality is not good today | ఈరోజు నాణ్యత బాగాలేదు |  | आज क्वालिटी अच्छी नहीं है |  |
| farmer:orders.rejectReasons.distance | Cannot reach this place | ఈ ప్రాంతానికి రాలేను |  | इस जगह नहीं पहुँच सकता |  |
| farmer:orders.rejectReasons.day | Cannot deliver that day | ఆ రోజు డెలివరీ చేయలేను |  | उस दिन डिलीवरी नहीं हो सकती |  |
| farmer:orders.failReasons.not_home | Buyer was not at home | కొనుగోలుదారు ఇంట్లో లేరు |  | खरीदार घर पर नहीं थे |  |
| farmer:orders.failReasons.refused | Buyer refused the order | కొనుగోలుదారు ఆర్డర్ తీసుకోలేదు |  | खरीदार ने ऑर्डर नहीं लिया |  |
| farmer:orders.failReasons.no_code | Buyer did not give the code | కొనుగోలుదారు కోడ్ ఇవ్వలేదు |  | खरीदार ने कोड नहीं दिया |  |
| farmer:orders.failReasons.vehicle | Vehicle problem | వాహనం సమస్య |  | गाड़ी की समस्या |  |
| farmer:orders.confirm | Confirm | నిర్ధారించండి |  | पक्का करें |  |
| farmer:orders.codeLabel | Code from the buyer (4 digits) | కొనుగోలుదారు కోడ్ (4 అంకెలు) |  | खरीदार का कोड (4 अंक) |  |
| farmer:orders.codeHint | Ask the buyer for their delivery code after handing over the vegetables. | కూరగాయలు ఇచ్చిన తర్వాత కొనుగోలుదారుని డెలివరీ కోడ్ అడగండి. |  | सब्ज़ियाँ देने के बाद खरीदार से डिलीवरी कोड पूछें। |  |
| farmer:orders.errors.DELIVERY_OTP_WRONG | That code is not right. {{attemptsLeft}} tries left. | కోడ్ సరిగ్గా లేదు. ఇంకా {{attemptsLeft}} ప్రయత్నాలు ఉన్నాయి. |  | कोड सही नहीं है। {{attemptsLeft}} कोशिशें बाकी हैं। |  |
| farmer:orders.errors.DELIVERY_OTP_LOCKED | Too many wrong codes. Mark the delivery as failed, or call support. | చాలా సార్లు తప్పు కోడ్. డెలివరీ కాలేదని గుర్తించండి లేదా సపోర్ట్‌కు కాల్ చేయండి. |  | बहुत बार गलत कोड। डिलीवरी नहीं हुई दर्ज करें या सपोर्ट को कॉल करें। |  |
| farmer:orders.errors.INVALID_STATUS_CHANGE | This order just changed. The page has been refreshed. | ఈ ఆర్డర్ ఇప్పుడే మారింది. పేజీ రిఫ్రెష్ అయింది. |  | यह ऑर्डर अभी बदला है। पेज रीफ़्रेश हो गया। |  |
| farmer:orders.errors.REASON_REQUIRED | Please choose or write a reason. | దయచేసి కారణం ఎంచుకోండి లేదా రాయండి. |  | कृपया कारण चुनें या लिखें। |  |
| farmer:earnings.title | My earnings | నా సంపాదన |  | मेरी कमाई |  |
| farmer:earnings.delivered | Delivered orders | డెలివరీ చేసిన ఆర్డర్లు |  | डिलीवर किए ऑर्डर |  |
| farmer:earnings.earned | You earned | మీ సంపాదన |  | आपकी कमाई |  |
| farmer:earnings.produce | Produce sold | అమ్మిన పంట |  | बेची गई फ़सल |  |
| farmer:earnings.delivery | Delivery fees | డెలివరీ ఛార్జీలు |  | डिलीवरी शुल्क |  |
| farmer:earnings.platformFee | Platform fee | ప్లాట్‌ఫామ్ ఫీజు |  | प्लेटफ़ॉर्म शुल्क |  |
| farmer:earnings.mandi | Estimate: a mandi commission of about {{percent}}% would have taken {{amount}} from this produce. | అంచనా: సుమారు {{percent}}% మండీ కమీషన్ ఈ పంట నుండి {{amount}} తీసుకునేది. |  | अनुमान: लगभग {{percent}}% मंडी कमीशन इस फ़सल से {{amount}} ले लेता। |  |
| farmer:earnings.simulated | UPI payouts are simulated in test mode. | టెస్ట్ మోడ్‌లో UPI చెల్లింపులు అనుకరణ మాత్రమే. |  | टेस्ट मोड में UPI भुगतान नकली हैं। |  |
| farmer:earnings.empty | Your earnings appear here after your first delivery. | మీ మొదటి డెలివరీ తర్వాత సంపాదన ఇక్కడ కనిపిస్తుంది. |  | पहली डिलीवरी के बाद आपकी कमाई यहाँ दिखेगी। |  |
| farmer:earnings.order | Delivered {{date}} | {{date}}న డెలివరీ |  | {{date}} को डिलीवर |  |
| onboarding:role.title | How will you use AgriConnect? | AgriConnectను మీరు ఎలా ఉపయోగిస్తారు? |  | आप AgriConnect का उपयोग कैसे करेंगे? |  |
| onboarding:role.farmer | I am a farmer | నేను రైతును |  | मैं किसान हूँ |  |
| onboarding:role.farmerHint | Sell my vegetables and fruits | నా కూరగాయలు, పండ్లు అమ్ముతాను |  | अपनी सब्ज़ियाँ और फल बेचें |  |
| onboarding:role.buyer | I want to buy | నేను కొనాలి |  | मुझे खरीदना है |  |
| onboarding:role.buyerHint | Fresh produce for my home | ఇంటికి తాజా కూరగాయలు, పండ్లు |  | घर के लिए ताज़ी सब्ज़ियाँ और फल |  |
| onboarding:role.notYou | Not you? Log out | మీరు కాదా? లాగ్ అవుట్ అవ్వండి |  | आप नहीं हैं? लॉग आउट करें |  |
| onboarding:farmer.title | Your farm details | మీ పొలం వివరాలు |  | आपके खेत की जानकारी |  |
| onboarding:farmer.detailsHeading | About you | మీ గురించి |  | आपके बारे में |  |
| onboarding:farmer.locationHeading | Your farm location | మీ పొలం స్థానం |  | आपके खेत की जगह |  |
| onboarding:farmer.deliveryHeading | How you deliver | మీరు ఎలా డెలివరీ చేస్తారు |  | आप डिलीवरी कैसे करेंगे |  |
| onboarding:farmer.name | Your name | మీ పేరు |  | आपका नाम |  |
| onboarding:farmer.state | State | రాష్ట్రం |  | राज्य |  |
| onboarding:farmer.district | District | జిల్లా |  | ज़िला |  |
| onboarding:farmer.districtSearch | Search district | జిల్లాను వెతకండి |  | ज़िला खोजें |  |
| onboarding:farmer.districtNone | No district matches. Check the spelling. | ఏ జిల్లా సరిపోలలేదు. స్పెల్లింగ్ చూడండి. |  | कोई ज़िला नहीं मिला। स्पेलिंग जाँचें। |  |
| onboarding:farmer.mandal | Mandal | మండలం |  | मंडल |  |
| onboarding:farmer.village | Village | గ్రామం |  | गाँव |  |
| onboarding:farmer.pincode | Pincode | పిన్‌కోడ్ |  | पिनकोड |  |
| onboarding:farmer.radius | How far will you deliver? | ఎంత దూరం వరకు డెలివరీ చేస్తారు? |  | आप कितनी दूर तक डिलीवरी करेंगे? |  |
| onboarding:farmer.deliveryDays | Which days do you deliver? | ఏ రోజుల్లో డెలివరీ చేస్తారు? |  | आप किन दिनों डिलीवरी करते हैं? |  |
| onboarding:farmer.cutoff | Latest time to order for next delivery | తదుపరి డెలివరీకి ఆర్డర్ చేయడానికి చివరి సమయం |  | अगली डिलीवरी के लिए ऑर्डर का आखिरी समय |  |
| onboarding:farmer.minOrder | Smallest order you accept | మీరు తీసుకునే కనీస ఆర్డర్ |  | आप सबसे छोटा कितना ऑर्डर लेंगे |  |
| onboarding:farmer.fee | Delivery charge per order | ఒక్కో ఆర్డర్‌కు డెలివరీ ఛార్జీ |  | हर ऑर्डर पर डिलीवरी शुल्क |  |
| onboarding:farmer.servicePincodes | Pincodes you deliver to | మీరు డెలివరీ చేసే పిన్‌కోడ్‌లు |  | जिन पिनकोड में आप डिलीवरी करते हैं |  |
| onboarding:farmer.servicePincodesHint | Buyers in these pincodes can order from you. | ఈ పిన్‌కోడ్‌లలోని కొనుగోలుదారులు మీ దగ్గర ఆర్డర్ చేయవచ్చు. |  | इन पिनकोड के खरीदार आपसे ऑर्डर कर सकते हैं। |  |
| onboarding:farmer.servicePincodesRequired | Without your location, add at least one pincode you deliver to. | మీ స్థానం లేకుండా, మీరు డెలివరీ చేసే కనీసం ఒక పిన్‌కోడ్ జోడించండి. |  | जगह के बिना, कम से कम एक पिनकोड जोड़ें जहाँ आप डिलीवरी करते हैं। |  |
| onboarding:farmer.addPincode | Add pincode | పిన్‌కోడ్ జోడించండి |  | पिनकोड जोड़ें |  |
| onboarding:farmer.removePincode | Remove {{pincode}} | {{pincode}} తీసివేయండి |  | {{pincode}} हटाएँ |  |
| onboarding:farmer.submit | Save and start selling | సేవ్ చేసి అమ్మడం మొదలుపెట్టండి |  | सेव करें और बेचना शुरू करें |  |
| onboarding:buyer.title | Your delivery address | మీ డెలివరీ చిరునామా |  | आपका डिलीवरी पता |  |
| onboarding:buyer.name | Your name | మీ పేరు |  | आपका नाम |  |
| onboarding:buyer.pincode | Pincode | పిన్‌కోడ్ |  | पिनकोड |  |
| onboarding:buyer.landmark | Landmark | గుర్తు (ల్యాండ్‌మార్క్) |  | पहचान की जगह (लैंडमार्क) |  |
| onboarding:buyer.landmarkHint | Something the farmer can find, for example "Near Hanuman temple". | రైతు సులభంగా కనుగొనగలిగేది, ఉదాహరణకు "హనుమాన్ గుడి దగ్గర". |  | ऐसी जगह जो किसान आसानी से ढूँढ सके, जैसे "हनुमान मंदिर के पास"। |  |
| onboarding:buyer.houseAndStreet | House number and street (optional) | ఇంటి నంబర్, వీధి (ఐచ్ఛికం) |  | मकान नंबर और गली (वैकल्पिक) |  |
| onboarding:buyer.area | Area or colony (optional) | ప్రాంతం లేదా కాలనీ (ఐచ్ఛికం) |  | इलाका या कॉलोनी (वैकल्पिक) |  |
| onboarding:buyer.submit | Save and start shopping | సేవ్ చేసి కొనడం మొదలుపెట్టండి |  | सेव करें और खरीदारी शुरू करें |  |
| onboarding:location.farmerWhy | Sharing your farm location lets nearby buyers find you. Buyers only see the approximate distance, never your exact location. | మీ పొలం స్థానం పంచుకుంటే దగ్గరలోని కొనుగోలుదారులు మిమ్మల్ని కనుగొంటారు. కొనుగోలుదారులకు సుమారు దూరం మాత్రమే కనిపిస్తుంది, మీ ఖచ్చితమైన స్థానం ఎప్పుడూ కనిపించదు. |  | खेत की जगह साझा करने से पास के खरीदार आपको ढूँढ पाते हैं। खरीदारों को सिर्फ़ अनुमानित दूरी दिखती है, आपकी सटीक जगह कभी नहीं। |  |
| onboarding:location.buyerWhy | Sharing your location shows you farmers who deliver to you. Farmers see your address only after you order. | మీ స్థానం పంచుకుంటే మీకు డెలివరీ చేసే రైతులు కనిపిస్తారు. మీరు ఆర్డర్ చేసిన తర్వాతే రైతులకు మీ చిరునామా కనిపిస్తుంది. |  | अपनी जगह साझा करने से आपको वे किसान दिखते हैं जो आप तक डिलीवरी करते हैं। ऑर्डर करने के बाद ही किसान को आपका पता दिखता है। |  |
| onboarding:location.use | Use my location | నా స్థానం ఉపయోగించండి |  | मेरी जगह का उपयोग करें |  |
| onboarding:location.finding | Finding your location… | మీ స్థానం కనుగొంటున్నాము… |  | आपकी जगह ढूँढ रहे हैं… |  |
| onboarding:location.saved | Location saved (accurate to about {{meters}} metres). | స్థానం సేవ్ అయింది (సుమారు {{meters}} మీటర్ల ఖచ్చితత్వం). |  | जगह सेव हो गई (लगभग {{meters}} मीटर तक सटीक)। |  |
| onboarding:location.remove | Remove location | స్థానం తీసివేయండి |  | जगह हटाएँ |  |
| onboarding:location.denied | Location permission is turned off. That is fine, we will use your pincode instead. | స్థానం అనుమతి ఆపివేయబడింది. పరవాలేదు, మీ పిన్‌కోడ్ ఉపయోగిస్తాము. |  | जगह की अनुमति बंद है। कोई बात नहीं, हम आपका पिनकोड इस्तेमाल करेंगे। |  |
| onboarding:location.unavailable | We could not find your location. That is fine, we will use your pincode instead. | మీ స్థానం కనుగొనలేకపోయాము. పరవాలేదు, మీ పిన్‌కోడ్ ఉపయోగిస్తాము. |  | आपकी जगह नहीं मिल सकी। कोई बात नहीं, हम आपका पिनकोड इस्तेमाल करेंगे। |  |
| onboarding:location.unsupported | This phone cannot share its location. We will use your pincode instead. | ఈ ఫోన్ స్థానాన్ని పంచుకోలేదు. మీ పిన్‌కోడ్ ఉపయోగిస్తాము. |  | यह फ़ोन जगह साझा नहीं कर सकता। हम आपका पिनकोड इस्तेमाल करेंगे। |  |
| onboarding:location.skip | Continue without location | స్థానం లేకుండా కొనసాగించండి |  | जगह के बिना आगे बढ़ें |  |
| onboarding:location.savedNoAccuracy | Location saved. | స్థానం సేవ్ అయింది. |  | जगह सेव हो गई। |  |
| onboarding:km | {{count}} km | {{count}} కి.మీ |  | {{count}} किमी |  |
| onboarding:errors.required | Please fill this in. | దయచేసి దీన్ని నింపండి. |  | कृपया इसे भरें। |  |
| onboarding:errors.pincode | Enter a 6-digit pincode. | 6 అంకెల పిన్‌కోడ్ ఇవ్వండి. |  | 6 अंकों का पिनकोड डालें। |  |
| onboarding:errors.pincodeState | This pincode is not in {{state}}. | ఈ పిన్‌కోడ్ {{state}}లో లేదు. |  | यह पिनकोड {{state}} में नहीं है। |  |
| onboarding:errors.pickDistrict | Please choose your district. | దయచేసి మీ జిల్లాను ఎంచుకోండి. |  | कृपया अपना ज़िला चुनें। |  |
| onboarding:errors.pickDay | Pick at least one delivery day. | కనీసం ఒక డెలివరీ రోజు ఎంచుకోండి. |  | कम से कम एक डिलीवरी दिन चुनें। |  |
| onboarding:errors.saveFailed | We could not save. Your answers are kept, please try again. | సేవ్ చేయలేకపోయాము. మీ సమాధానాలు అలాగే ఉన్నాయి, దయచేసి మళ్ళీ ప్రయత్నించండి. |  | सेव नहीं हो सका। आपके जवाब सुरक्षित हैं, कृपया फिर से कोशिश करें। |  |

## District names (backend/src/data/districts.js)

The English name is the stored value; te and hi are display names. Newer districts (2022 AP reorganisation, 2016 TS reorganisation) are the most likely to have unofficial spellings.

| State | English (stored) | Telugu (machine) | te reviewed | Hindi (machine) | hi reviewed |
| --- | --- | --- | --- | --- | --- |
| Andhra Pradesh | Srikakulam | శ్రీకాకుళం | | श्रीकाकुलम | |
| Andhra Pradesh | Vizianagaram | విజయనగరం | | विजयनगरम | |
| Andhra Pradesh | Parvathipuram Manyam | పార్వతీపురం మన్యం | | पार्वतीपुरम मन्यम | |
| Andhra Pradesh | Alluri Sitharama Raju | అల్లూరి సీతారామరాజు | | अल्लूरी सीताराम राजू | |
| Andhra Pradesh | Visakhapatnam | విశాఖపట్నం | | विशाखापत्तनम | |
| Andhra Pradesh | Anakapalli | అనకాపల్లి | | अनकापल्ली | |
| Andhra Pradesh | Kakinada | కాకినాడ | | काकीनाडा | |
| Andhra Pradesh | East Godavari | తూర్పు గోదావరి | | पूर्वी गोदावरी | |
| Andhra Pradesh | Dr. B.R. Ambedkar Konaseema | డా. బి.ఆర్. అంబేద్కర్ కోనసీమ | | डॉ. बी.आर. आंबेडकर कोनसीमा | |
| Andhra Pradesh | Eluru | ఏలూరు | | एलुरु | |
| Andhra Pradesh | West Godavari | పశ్చిమ గోదావరి | | पश्चिमी गोदावरी | |
| Andhra Pradesh | NTR | ఎన్టీఆర్ | | एनटीआर | |
| Andhra Pradesh | Krishna | కృష్ణా | | कृष्णा | |
| Andhra Pradesh | Palnadu | పల్నాడు | | पलनाडु | |
| Andhra Pradesh | Guntur | గుంటూరు | | गुंटूर | |
| Andhra Pradesh | Bapatla | బాపట్ల | | बापटला | |
| Andhra Pradesh | Prakasam | ప్రకాశం | | प्रकाशम | |
| Andhra Pradesh | Sri Potti Sriramulu Nellore | శ్రీ పొట్టి శ్రీరాములు నెల్లూరు | | श्री पोट्टि श्रीरामुलु नेल्लोर | |
| Andhra Pradesh | Kurnool | కర్నూలు | | कुरनूल | |
| Andhra Pradesh | Nandyal | నంద్యాల | | नंद्याल | |
| Andhra Pradesh | Anantapuramu | అనంతపురం | | अनंतपुरम | |
| Andhra Pradesh | Sri Sathya Sai | శ్రీ సత్యసాయి | | श्री सत्य साई | |
| Andhra Pradesh | YSR Kadapa | వైఎస్ఆర్ కడప | | वाईएसआर कडपा | |
| Andhra Pradesh | Annamayya | అన్నమయ్య | | अन्नमय्या | |
| Andhra Pradesh | Tirupati | తిరుపతి | | तिरुपति | |
| Andhra Pradesh | Chittoor | చిత్తూరు | | चित्तूर | |
| Telangana | Adilabad | ఆదిలాబాద్ | | आदिलाबाद | |
| Telangana | Komaram Bheem Asifabad | కొమరం భీమ్ ఆసిఫాబాద్ | | कोमरम भीम आसिफाबाद | |
| Telangana | Mancherial | మంచిర్యాల | | मंचेरियल | |
| Telangana | Nirmal | నిర్మల్ | | निर्मल | |
| Telangana | Nizamabad | నిజామాబాద్ | | निज़ामाबाद | |
| Telangana | Jagtial | జగిత్యాల | | जगतियाल | |
| Telangana | Peddapalli | పెద్దపల్లి | | पेद्दापल्ली | |
| Telangana | Kamareddy | కామారెడ్డి | | कामारेड्डी | |
| Telangana | Rajanna Sircilla | రాజన్న సిరిసిల్ల | | राजन्ना सिरसिल्ला | |
| Telangana | Karimnagar | కరీంనగర్ | | करीमनगर | |
| Telangana | Jayashankar Bhupalpally | జయశంకర్ భూపాలపల్లి | | जयशंकर भूपालपल्ली | |
| Telangana | Sangareddy | సంగారెడ్డి | | संगारेड्डी | |
| Telangana | Medak | మెదక్ | | मेदक | |
| Telangana | Siddipet | సిద్దిపేట | | सिद्दीपेट | |
| Telangana | Jangaon | జనగామ | | जनगांव | |
| Telangana | Hanumakonda | హనుమకొండ | | हनमकोंडा | |
| Telangana | Warangal | వరంగల్ | | वरंगल | |
| Telangana | Mulugu | ములుగు | | मुलुगु | |
| Telangana | Bhadradri Kothagudem | భద్రాద్రి కొత్తగూడెం | | भद्राद्री कोठागुडेम | |
| Telangana | Khammam | ఖమ్మం | | खम्मम | |
| Telangana | Mahabubabad | మహబూబాబాద్ | | महबूबाबाद | |
| Telangana | Suryapet | సూర్యాపేట | | सूर्यापेट | |
| Telangana | Nalgonda | నల్గొండ | | नलगोंडा | |
| Telangana | Yadadri Bhuvanagiri | యాదాద్రి భువనగిరి | | यादाद्री भुवनगिरी | |
| Telangana | Medchal-Malkajgiri | మేడ్చల్ మల్కాజిగిరి | | मेडचल मलकाजगिरी | |
| Telangana | Hyderabad | హైదరాబాద్ | | हैदराबाद | |
| Telangana | Rangareddy | రంగారెడ్డి | | रंगारेड्डी | |
| Telangana | Vikarabad | వికారాబాద్ | | विकाराबाद | |
| Telangana | Narayanpet | నారాయణపేట | | नारायणपेट | |
| Telangana | Mahabubnagar | మహబూబ్‌నగర్ | | महबूबनगर | |
| Telangana | Nagarkurnool | నాగర్‌కర్నూల్ | | नागरकुरनूल | |
| Telangana | Wanaparthy | వనపర్తి | | वनपर्ती | |
| Telangana | Jogulamba Gadwal | జోగులాంబ గద్వాల | | जोगुलाम्बा गदवाल | |
