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
| common:app.tagline | Fresh vegetables and fruits, straight from nearby farmers | దగ్గరలోని రైతుల నుండి నేరుగా తాజా కూరగాయలు, పండ్లు | | पास के किसानों से सीधे ताज़ी सब्ज़ियाँ और फल | |
| common:actions.back | Back | వెనుకకు | | वापस | |
| common:actions.retry | Try again | మళ్ళీ ప్రయత్నించండి | | फिर से कोशिश करें | |
| common:actions.cancel | Cancel | రద్దు చేయండి | | रद्द करें | |
| common:actions.confirm | Yes, continue | అవును, కొనసాగించండి | | हाँ, आगे बढ़ें | |
| common:actions.close | Close | మూసివేయండి | | बंद करें | |
| common:actions.dismiss | Dismiss | తీసివేయండి | | हटाएँ | |
| common:actions.login | Log in with phone number | ఫోన్ నంబర్‌తో లాగిన్ అవ్వండి | | फ़ोन नंबर से लॉगिन करें | |
| common:actions.logout | Log out | లాగ్ అవుట్ | | लॉग आउट | |
| common:actions.goHome | Go to home | హోమ్‌కు వెళ్ళండి | | होम पर जाएँ | |
| common:actions.skipToContent | Skip to main content | ప్రధాన విషయానికి వెళ్ళండి | | मुख्य सामग्री पर जाएँ | |
| common:actions.next | Next | తరువాత | | आगे | |
| common:language.label | Language | భాష | | भाषा | |
| common:language.choose | Choose your language | మీ భాషను ఎంచుకోండి | | अपनी भाषा चुनें | |
| common:language.change | Change language | భాష మార్చండి | | भाषा बदलें | |
| common:nav.label | Main menu | ప్రధాన మెనూ | | मुख्य मेनू | |
| common:nav.home | Home | హోమ్ | | होम | |
| common:nav.products | My products | నా పంటలు | | मेरे उत्पाद | |
| common:nav.orders | Orders | ఆర్డర్లు | | ऑर्डर | |
| common:nav.profile | Profile | ప్రొఫైల్ | | प्रोफ़ाइल | |
| common:nav.farmers | Farmers | రైతులు | | किसान | |
| common:nav.users | Users | వినియోగదారులు | | उपयोगकर्ता | |
| common:nav.settings | Settings | సెట్టింగ్‌లు | | सेटिंग्स | |
| common:roles.farmer | Farmer | రైతు | | किसान | |
| common:roles.buyer | Buyer | కొనుగోలుదారు | | खरीदार | |
| common:roles.agent | Field agent | ఫీల్డ్ ఏజెంట్ | | फ़ील्ड एजेंट | |
| common:roles.admin | Admin | అడ్మిన్ | | एडमिन | |
| common:home.title | Home | హోమ్ | | होम | |
| common:home.welcome | Welcome | స్వాగతం | | स्वागत है | |
| common:home.signedInAs | Signed in as {{role}} | {{role}}గా లాగిన్ అయ్యారు | | {{role}} के रूप में लॉगिन | |
| common:status.loading | Loading… | లోడ్ అవుతోంది… | | लोड हो रहा है… | |
| common:status.offline | You are offline. Some things may not be up to date. | మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. కొన్ని వివరాలు తాజావి కాకపోవచ్చు. | | आप ऑफ़लाइन हैं। कुछ जानकारी पुरानी हो सकती है। | |
| common:status.backOnline | You are back online. | మీరు మళ్ళీ ఆన్‌లైన్‌లోకి వచ్చారు. | | आप फिर से ऑनलाइन हैं। | |
| common:units.kg | kg | కిలో | | किलो | |
| common:units.dozen | dozen | డజను | | दर्जन | |
| common:units.bunch | bunch | కట్ట | | गुच्छा | |
| common:units.piece | piece | ఒక్కటి | | नग | |
| common:units.km | km | కి.మీ | | किमी | |
| common:stepper.decrease | Decrease {{label}} | {{label}} తగ్గించండి | | {{label}} घटाएँ | |
| common:stepper.increase | Increase {{label}} | {{label}} పెంచండి | | {{label}} बढ़ाएँ | |
| common:comingSoon.title | Coming soon | త్వరలో వస్తుంది | | जल्द आ रहा है | |
| common:comingSoon.message | This screen is being built and will be ready in a later update. | ఈ స్క్రీన్ తయారవుతోంది, తరువాతి అప్‌డేట్‌లో అందుబాటులోకి వస్తుంది. | | यह स्क्रीन बनाई जा रही है और अगले अपडेट में उपलब्ध होगी। | |
| common:notFound.title | Page not found | పేజీ కనబడలేదు | | पेज नहीं मिला | |
| common:notFound.message | We could not find this page. | ఈ పేజీని మేము కనుగొనలేకపోయాము. | | हमें यह पेज नहीं मिला। | |
| common:errors.title | Something went wrong | ఏదో పొరపాటు జరిగింది | | कुछ गलत हो गया | |
| common:errors.generic | Something went wrong. Please try again. | ఏదో పొరపాటు జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి. | | कुछ गलत हो गया। कृपया फिर से कोशिश करें। | |
| common:errors.NETWORK_ERROR | No internet connection. Please check your network and try again. | ఇంటర్నెట్ కనెక్షన్ లేదు. మీ నెట్‌వర్క్‌ను చూసి మళ్ళీ ప్రయత్నించండి. | | इंटरनेट कनेक्शन नहीं है। अपना नेटवर्क जाँचें और फिर से कोशिश करें। | |
| common:errors.RATE_LIMITED | Too many attempts. Please wait a moment and try again. | చాలా ఎక్కువ ప్రయత్నాలు. కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి. | | बहुत अधिक प्रयास। थोड़ा रुककर फिर से कोशिश करें। | |
| common:errors.INTERNAL_ERROR | Our server had a problem. Please try again. | మా సర్వర్‌లో సమస్య వచ్చింది. దయచేసి మళ్ళీ ప్రయత్నించండి. | | हमारे सर्वर में समस्या आई। कृपया फिर से कोशिश करें। | |
| common:errors.AUTH_REQUIRED | Please log in to continue. | కొనసాగడానికి దయచేసి లాగిన్ అవ్వండి. | | आगे बढ़ने के लिए कृपया लॉगिन करें। | |
| common:errors.REFRESH_INVALID | Your session has ended. Please log in again. | మీ సెషన్ ముగిసింది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి. | | आपका सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें। | |
| common:errors.FORBIDDEN | You do not have access to this. | దీనికి మీకు అనుమతి లేదు. | | आपको इसकी अनुमति नहीं है। | |
| common:errors.NOT_FOUND | We could not find what you were looking for. | మీరు వెతుకుతున్నది కనబడలేదు. | | आप जो ढूँढ रहे थे वह नहीं मिला। | |
| common:errors.VALIDATION_ERROR | Some details are not correct. Please check and try again. | కొన్ని వివరాలు సరిగ్గా లేవు. దయచేసి చూసి మళ్ళీ ప్రయత్నించండి. | | कुछ जानकारी सही नहीं है। कृपया जाँचकर फिर से कोशिश करें। | |
| common:weekdays.mon | Monday | సోమవారం | | सोमवार | |
| common:weekdays.tue | Tuesday | మంగళవారం | | मंगलवार | |
| common:weekdays.wed | Wednesday | బుధవారం | | बुधवार | |
| common:weekdays.thu | Thursday | గురువారం | | गुरुवार | |
| common:weekdays.fri | Friday | శుక్రవారం | | शुक्रवार | |
| common:weekdays.sat | Saturday | శనివారం | | शनिवार | |
| common:weekdays.sun | Sunday | ఆదివారం | | रविवार | |
| common:states.andhraPradesh | Andhra Pradesh | ఆంధ్రప్రదేశ్ | | आंध्र प्रदेश | |
| common:states.telangana | Telangana | తెలంగాణ | | तेलंगाना | |
| auth:stepOf | Step {{current}} of {{total}} | {{total}}లో {{current}}వ దశ | | चरण {{current}} / {{total}} | |
| auth:language.title | Choose your language | మీ భాషను ఎంచుకోండి | | अपनी भाषा चुनें | |
| auth:language.continue | Continue | కొనసాగించండి | | आगे बढ़ें | |
| auth:phone.title | Your mobile number | మీ మొబైల్ నంబర్ | | आपका मोबाइल नंबर | |
| auth:phone.label | Mobile number | మొబైల్ నంబర్ | | मोबाइल नंबर | |
| auth:phone.hint | We will send a 6-digit code to this number by SMS. | ఈ నంబర్‌కు SMS ద్వారా 6 అంకెల కోడ్ పంపుతాము. | | हम इस नंबर पर SMS से 6 अंकों का कोड भेजेंगे। | |
| auth:phone.invalid | Enter a 10-digit mobile number starting with 6, 7, 8 or 9. | 6, 7, 8 లేదా 9తో మొదలయ్యే 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి. | | 6, 7, 8 या 9 से शुरू होने वाला 10 अंकों का मोबाइल नंबर डालें। | |
| auth:phone.remember | Keep me logged in on this phone | ఈ ఫోన్‌లో నన్ను లాగిన్‌లో ఉంచండి | | इस फ़ोन पर मुझे लॉगिन रखें | |
| auth:phone.rememberHint | Turn this off on a shared phone. | ఇతరులతో పంచుకునే ఫోన్ అయితే దీన్ని ఆపివేయండి. | | साझा फ़ोन पर इसे बंद करें। | |
| auth:phone.submit | Get OTP | OTP పొందండి | | OTP पाएँ | |
| auth:otp.title | Enter the code | కోడ్ ఇవ్వండి | | कोड डालें | |
| auth:otp.sentTo | We sent a 6-digit code to {{phone}}. | {{phone}}కు 6 అంకెల కోడ్ పంపాము. | | हमने {{phone}} पर 6 अंकों का कोड भेजा है। | |
| auth:otp.label | 6-digit code | 6 అంకెల కోడ్ | | 6 अंकों का कोड | |
| auth:otp.invalidFormat | The code has 6 digits. | కోడ్‌లో 6 అంకెలు ఉంటాయి. | | कोड में 6 अंक होते हैं। | |
| auth:otp.submit | Verify and continue | నిర్ధారించి కొనసాగించండి | | पुष्टि करें और आगे बढ़ें | |
| auth:otp.changeNumber | Change number | నంబర్ మార్చండి | | नंबर बदलें | |
| auth:otp.resendIn | You can ask for a new code in {{seconds}} seconds. | {{seconds}} సెకన్లలో కొత్త కోడ్ అడగవచ్చు. | | {{seconds}} सेकंड में नया कोड माँग सकते हैं। | |
| auth:otp.resend | Send a new code | కొత్త కోడ్ పంపండి | | नया कोड भेजें | |
| auth:otp.resent | A new code has been sent. | కొత్త కోడ్ పంపబడింది. | | नया कोड भेज दिया गया है। | |
| auth:otp.help | Need help? Call AgriConnect support | సహాయం కావాలా? AgriConnect సపోర్ట్‌కు కాల్ చేయండి | | मदद चाहिए? AgriConnect सहायता को कॉल करें | |
| auth:pin.title | Enter your PIN | మీ PIN ఇవ్వండి | | अपना PIN डालें | |
| auth:pin.setupTitle | Create your PIN | మీ PIN తయారు చేసుకోండి | | अपना PIN बनाएँ | |
| auth:pin.intro | Agents and admins use a PIN as a second check. | ఏజెంట్లు, అడ్మిన్లు రెండో తనిఖీగా PIN ఉపయోగిస్తారు. | | एजेंट और एडमिन दूसरी जाँच के लिए PIN का उपयोग करते हैं। | |
| auth:pin.setupIntro | Choose a 4 to 6 digit PIN. You will enter it after the SMS code every time you log in. | 4 నుండి 6 అంకెల PIN ఎంచుకోండి. ప్రతిసారి లాగిన్ అయ్యేటప్పుడు SMS కోడ్ తర్వాత దీన్ని ఇవ్వాలి. | | 4 से 6 अंकों का PIN चुनें। हर बार लॉगिन करते समय SMS कोड के बाद इसे डालना होगा। | |
| auth:pin.confirmLabel | Enter the PIN again | PIN మళ్ళీ ఇవ్వండి | | PIN फिर से डालें | |
| auth:pin.invalidFormat | The PIN has 4 to 6 digits. | PINలో 4 నుండి 6 అంకెలు ఉంటాయి. | | PIN में 4 से 6 अंक होते हैं। | |
| auth:pin.mismatch | The two PINs do not match. | రెండు PINలు ఒకేలా లేవు. | | दोनों PIN एक जैसे नहीं हैं। | |
| auth:pin.submit | Log in | లాగిన్ అవ్వండి | | लॉगिन करें | |
| auth:pin.setupSubmit | Save PIN and log in | PIN సేవ్ చేసి లాగిన్ అవ్వండి | | PIN सेव करें और लॉगिन करें | |
| auth:errors.OTP_INVALID | That code is not correct. {{count}} tries left. | ఈ కోడ్ సరైనది కాదు. ఇంకా {{count}} ప్రయత్నాలు మిగిలాయి. | | यह कोड सही नहीं है। {{count}} प्रयास बाकी हैं। | |
| auth:errors.OTP_EXPIRED | This code has expired. Please ask for a new code. | ఈ కోడ్ గడువు ముగిసింది. దయచేసి కొత్త కోడ్ అడగండి. | | इस कोड की समय-सीमा खत्म हो गई। कृपया नया कोड माँगें। | |
| auth:errors.OTP_NOT_FOUND | Please ask for a new code. | దయచేసి కొత్త కోడ్ అడగండి. | | कृपया नया कोड माँगें। | |
| auth:errors.OTP_LOCKED | Too many wrong codes. Please ask for a new code. | చాలా తప్పు కోడ్‌లు. దయచేసి కొత్త కోడ్ అడగండి. | | बहुत सारे गलत कोड। कृपया नया कोड माँगें। | |
| auth:errors.OTP_COOLDOWN | Please wait {{seconds}} seconds before asking for another code. | మరో కోడ్ అడగడానికి ముందు {{seconds}} సెకన్లు ఆగండి. | | दूसरा कोड माँगने से पहले {{seconds}} सेकंड रुकें। | |
| auth:errors.OTP_LIMIT_REACHED | Too many codes for this number. Please try again in an hour. | ఈ నంబర్‌కు చాలా కోడ్‌లు పంపాము. ఒక గంట తర్వాత ప్రయత్నించండి. | | इस नंबर के लिए बहुत सारे कोड। एक घंटे बाद कोशिश करें। | |
| auth:errors.SMS_FAILED | We could not send the SMS. Please try again. | SMS పంపలేకపోయాము. దయచేసి మళ్ళీ ప్రయత్నించండి. | | SMS नहीं भेज सके। कृपया फिर से कोशिश करें। | |
| auth:errors.ACCOUNT_SUSPENDED | This account is suspended. Please contact AgriConnect support. | ఈ ఖాతా నిలిపివేయబడింది. దయచేసి AgriConnect సపోర్ట్‌ను సంప్రదించండి. | | यह खाता निलंबित है। कृपया AgriConnect सहायता से संपर्क करें। | |
| auth:errors.PIN_INVALID | That PIN is not correct. {{count}} tries left. | ఈ PIN సరైనది కాదు. ఇంకా {{count}} ప్రయత్నాలు మిగిలాయి. | | यह PIN सही नहीं है। {{count}} प्रयास बाकी हैं। | |
| auth:errors.PIN_LOCKED | Too many wrong PINs. Please try again after {{minutes}} minutes. | చాలా తప్పు PINలు. {{minutes}} నిమిషాల తర్వాత మళ్ళీ ప్రయత్నించండి. | | बहुत सारे गलत PIN। {{minutes}} मिनट बाद फिर से कोशिश करें। | |
| auth:errors.PIN_TOKEN_INVALID | This login took too long. Please start again. | లాగిన్‌కు చాలా సమయం పట్టింది. దయచేసి మళ్ళీ మొదలుపెట్టండి. | | लॉगिन में बहुत समय लगा। कृपया फिर से शुरू करें। | |
| auth:errors.PIN_ALREADY_SET | A PIN is already set. Please log in again. | PIN ఇప్పటికే ఉంది. దయచేసి మళ్ళీ లాగిన్ అవ్వండి. | | PIN पहले से बना हुआ है। कृपया फिर से लॉगिन करें। | |
| onboarding:role.title | How will you use AgriConnect? | AgriConnectను మీరు ఎలా ఉపయోగిస్తారు? | | आप AgriConnect का उपयोग कैसे करेंगे? | |
| onboarding:role.farmer | I am a farmer | నేను రైతును | | मैं किसान हूँ | |
| onboarding:role.farmerHint | Sell my vegetables and fruits | నా కూరగాయలు, పండ్లు అమ్ముతాను | | अपनी सब्ज़ियाँ और फल बेचें | |
| onboarding:role.buyer | I want to buy | నేను కొనాలి | | मुझे खरीदना है | |
| onboarding:role.buyerHint | Fresh produce for my home | ఇంటికి తాజా కూరగాయలు, పండ్లు | | घर के लिए ताज़ी सब्ज़ियाँ और फल | |
| onboarding:role.notYou | Not you? Log out | మీరు కాదా? లాగ్ అవుట్ అవ్వండి | | आप नहीं हैं? लॉग आउट करें | |
| onboarding:farmer.title | Your farm details | మీ పొలం వివరాలు | | आपके खेत की जानकारी | |
| onboarding:farmer.detailsHeading | About you | మీ గురించి | | आपके बारे में | |
| onboarding:farmer.locationHeading | Your farm location | మీ పొలం స్థానం | | आपके खेत की जगह | |
| onboarding:farmer.deliveryHeading | How you deliver | మీరు ఎలా డెలివరీ చేస్తారు | | आप डिलीवरी कैसे करेंगे | |
| onboarding:farmer.name | Your name | మీ పేరు | | आपका नाम | |
| onboarding:farmer.state | State | రాష్ట్రం | | राज्य | |
| onboarding:farmer.district | District | జిల్లా | | ज़िला | |
| onboarding:farmer.districtSearch | Search district | జిల్లాను వెతకండి | | ज़िला खोजें | |
| onboarding:farmer.districtNone | No district matches. Check the spelling. | ఏ జిల్లా సరిపోలలేదు. స్పెల్లింగ్ చూడండి. | | कोई ज़िला नहीं मिला। स्पेलिंग जाँचें। | |
| onboarding:farmer.mandal | Mandal | మండలం | | मंडल | |
| onboarding:farmer.village | Village | గ్రామం | | गाँव | |
| onboarding:farmer.pincode | Pincode | పిన్‌కోడ్ | | पिनकोड | |
| onboarding:farmer.radius | How far will you deliver? | ఎంత దూరం వరకు డెలివరీ చేస్తారు? | | आप कितनी दूर तक डिलीवरी करेंगे? | |
| onboarding:farmer.deliveryDays | Which days do you deliver? | ఏ రోజుల్లో డెలివరీ చేస్తారు? | | आप किन दिनों डिलीवरी करते हैं? | |
| onboarding:farmer.cutoff | Latest time to order for next delivery | తదుపరి డెలివరీకి ఆర్డర్ చేయడానికి చివరి సమయం | | अगली डिलीवरी के लिए ऑर्डर का आखिरी समय | |
| onboarding:farmer.minOrder | Smallest order you accept | మీరు తీసుకునే కనీస ఆర్డర్ | | आप सबसे छोटा कितना ऑर्डर लेंगे | |
| onboarding:farmer.fee | Delivery charge per order | ఒక్కో ఆర్డర్‌కు డెలివరీ ఛార్జీ | | हर ऑर्डर पर डिलीवरी शुल्क | |
| onboarding:farmer.servicePincodes | Pincodes you deliver to | మీరు డెలివరీ చేసే పిన్‌కోడ్‌లు | | जिन पिनकोड में आप डिलीवरी करते हैं | |
| onboarding:farmer.servicePincodesHint | Buyers in these pincodes can order from you. | ఈ పిన్‌కోడ్‌లలోని కొనుగోలుదారులు మీ దగ్గర ఆర్డర్ చేయవచ్చు. | | इन पिनकोड के खरीदार आपसे ऑर्डर कर सकते हैं। | |
| onboarding:farmer.servicePincodesRequired | Without your location, add at least one pincode you deliver to. | మీ స్థానం లేకుండా, మీరు డెలివరీ చేసే కనీసం ఒక పిన్‌కోడ్ జోడించండి. | | जगह के बिना, कम से कम एक पिनकोड जोड़ें जहाँ आप डिलीवरी करते हैं। | |
| onboarding:farmer.addPincode | Add pincode | పిన్‌కోడ్ జోడించండి | | पिनकोड जोड़ें | |
| onboarding:farmer.removePincode | Remove {{pincode}} | {{pincode}} తీసివేయండి | | {{pincode}} हटाएँ | |
| onboarding:farmer.submit | Save and start selling | సేవ్ చేసి అమ్మడం మొదలుపెట్టండి | | सेव करें और बेचना शुरू करें | |
| onboarding:buyer.title | Your delivery address | మీ డెలివరీ చిరునామా | | आपका डिलीवरी पता | |
| onboarding:buyer.name | Your name | మీ పేరు | | आपका नाम | |
| onboarding:buyer.pincode | Pincode | పిన్‌కోడ్ | | पिनकोड | |
| onboarding:buyer.landmark | Landmark | గుర్తు (ల్యాండ్‌మార్క్) | | पहचान की जगह (लैंडमार्क) | |
| onboarding:buyer.landmarkHint | Something the farmer can find, for example "Near Hanuman temple". | రైతు సులభంగా కనుగొనగలిగేది, ఉదాహరణకు "హనుమాన్ గుడి దగ్గర". | | ऐसी जगह जो किसान आसानी से ढूँढ सके, जैसे "हनुमान मंदिर के पास"। | |
| onboarding:buyer.houseAndStreet | House number and street (optional) | ఇంటి నంబర్, వీధి (ఐచ్ఛికం) | | मकान नंबर और गली (वैकल्पिक) | |
| onboarding:buyer.area | Area or colony (optional) | ప్రాంతం లేదా కాలనీ (ఐచ్ఛికం) | | इलाका या कॉलोनी (वैकल्पिक) | |
| onboarding:buyer.submit | Save and start shopping | సేవ్ చేసి కొనడం మొదలుపెట్టండి | | सेव करें और खरीदारी शुरू करें | |
| onboarding:location.farmerWhy | Sharing your farm location lets nearby buyers find you. Buyers only see the approximate distance, never your exact location. | మీ పొలం స్థానం పంచుకుంటే దగ్గరలోని కొనుగోలుదారులు మిమ్మల్ని కనుగొంటారు. కొనుగోలుదారులకు సుమారు దూరం మాత్రమే కనిపిస్తుంది, మీ ఖచ్చితమైన స్థానం ఎప్పుడూ కనిపించదు. | | खेत की जगह साझा करने से पास के खरीदार आपको ढूँढ पाते हैं। खरीदारों को सिर्फ़ अनुमानित दूरी दिखती है, आपकी सटीक जगह कभी नहीं। | |
| onboarding:location.buyerWhy | Sharing your location shows you farmers who deliver to you. Farmers see your address only after you order. | మీ స్థానం పంచుకుంటే మీకు డెలివరీ చేసే రైతులు కనిపిస్తారు. మీరు ఆర్డర్ చేసిన తర్వాతే రైతులకు మీ చిరునామా కనిపిస్తుంది. | | अपनी जगह साझा करने से आपको वे किसान दिखते हैं जो आप तक डिलीवरी करते हैं। ऑर्डर करने के बाद ही किसान को आपका पता दिखता है। | |
| onboarding:location.use | Use my location | నా స్థానం ఉపయోగించండి | | मेरी जगह का उपयोग करें | |
| onboarding:location.finding | Finding your location… | మీ స్థానం కనుగొంటున్నాము… | | आपकी जगह ढूँढ रहे हैं… | |
| onboarding:location.saved | Location saved (accurate to about {{meters}} metres). | స్థానం సేవ్ అయింది (సుమారు {{meters}} మీటర్ల ఖచ్చితత్వం). | | जगह सेव हो गई (लगभग {{meters}} मीटर तक सटीक)। | |
| onboarding:location.remove | Remove location | స్థానం తీసివేయండి | | जगह हटाएँ | |
| onboarding:location.denied | Location permission is turned off. That is fine, we will use your pincode instead. | స్థానం అనుమతి ఆపివేయబడింది. పరవాలేదు, మీ పిన్‌కోడ్ ఉపయోగిస్తాము. | | जगह की अनुमति बंद है। कोई बात नहीं, हम आपका पिनकोड इस्तेमाल करेंगे। | |
| onboarding:location.unavailable | We could not find your location. That is fine, we will use your pincode instead. | మీ స్థానం కనుగొనలేకపోయాము. పరవాలేదు, మీ పిన్‌కోడ్ ఉపయోగిస్తాము. | | आपकी जगह नहीं मिल सकी। कोई बात नहीं, हम आपका पिनकोड इस्तेमाल करेंगे। | |
| onboarding:location.unsupported | This phone cannot share its location. We will use your pincode instead. | ఈ ఫోన్ స్థానాన్ని పంచుకోలేదు. మీ పిన్‌కోడ్ ఉపయోగిస్తాము. | | यह फ़ोन जगह साझा नहीं कर सकता। हम आपका पिनकोड इस्तेमाल करेंगे। | |
| onboarding:location.skip | Continue without location | స్థానం లేకుండా కొనసాగించండి | | जगह के बिना आगे बढ़ें | |
| onboarding:location.savedNoAccuracy | Location saved. | స్థానం సేవ్ అయింది. | | जगह सेव हो गई। | |
| onboarding:km | {{count}} km | {{count}} కి.మీ | | {{count}} किमी | |
| onboarding:errors.required | Please fill this in. | దయచేసి దీన్ని నింపండి. | | कृपया इसे भरें। | |
| onboarding:errors.pincode | Enter a 6-digit pincode. | 6 అంకెల పిన్‌కోడ్ ఇవ్వండి. | | 6 अंकों का पिनकोड डालें। | |
| onboarding:errors.pincodeState | This pincode is not in {{state}}. | ఈ పిన్‌కోడ్ {{state}}లో లేదు. | | यह पिनकोड {{state}} में नहीं है। | |
| onboarding:errors.pickDistrict | Please choose your district. | దయచేసి మీ జిల్లాను ఎంచుకోండి. | | कृपया अपना ज़िला चुनें। | |
| onboarding:errors.pickDay | Pick at least one delivery day. | కనీసం ఒక డెలివరీ రోజు ఎంచుకోండి. | | कम से कम एक डिलीवरी दिन चुनें। | |
| onboarding:errors.saveFailed | We could not save. Your answers are kept, please try again. | సేవ్ చేయలేకపోయాము. మీ సమాధానాలు అలాగే ఉన్నాయి, దయచేసి మళ్ళీ ప్రయత్నించండి. | | सेव नहीं हो सका। आपके जवाब सुरक्षित हैं, कृपया फिर से कोशिश करें। | |
| farmer:home.greeting | Namaste, {{name}} | నమస్కారం, {{name}} | | नमस्ते, {{name}} | |
| farmer:home.greetingNoName | Namaste | నమస్కారం | | नमस्ते | |
| farmer:home.glance | Today at a glance | ఈరోజు ఒక్క చూపులో | | आज एक नज़र में | |
| farmer:home.todayOrders | Orders today | ఈరోజు ఆర్డర్లు | | आज के ऑर्डर | |
| farmer:home.pendingDeliveries | Waiting to deliver | డెలివరీ చేయాల్సినవి | | डिलीवरी बाकी | |
| farmer:home.lowStock | Running low | తక్కువగా ఉన్నవి | | कम बचा है | |
| farmer:home.lowItem | {{crop}}: {{left}} {{unit}} left | {{crop}}: ఇంకా {{left}} {{unit}} మిగిలింది | | {{crop}}: {{left}} {{unit}} बचा है | |
| farmer:home.tasks | What do you want to do? | మీరు ఏమి చేయాలనుకుంటున్నారు? | | आप क्या करना चाहते हैं? | |
| farmer:tiles.sell | Sell produce | పంట అమ్మండి | | फ़सल बेचें | |
| farmer:tiles.products | My products | నా పంటలు | | मेरे उत्पाद | |
| farmer:tiles.orders | My orders | నా ఆర్డర్లు | | मेरे ऑर्डर | |
| farmer:tiles.prices | Market prices | మార్కెట్ ధరలు | | मंडी भाव | |
| farmer:tiles.assistant | Ask assistant | సహాయం అడగండి | | सहायक से पूछें | |
| farmer:tiles.callAgent | Call my agent | నా ఏజెంట్‌కు కాల్ | | मेरे एजेंट को कॉल | |
| farmer:tiles.callSupport | Call support | సపోర్ట్‌కు కాల్ | | सहायता को कॉल | |
| farmer:tiles.noAgent | No agent yet | ఇంకా ఏజెంట్ లేరు | | अभी कोई एजेंट नहीं | |
| farmer:tiles.newOrders | new | కొత్తవి | | नए | |
| farmer:products.title | My products | నా పంటలు | | मेरे उत्पाद | |
| farmer:products.filterLabel | Show | చూపించు | | दिखाएँ | |
| farmer:products.filters.all | All | అన్నీ | | सभी | |
| farmer:products.filters.available | Selling | అమ్ముతున్నవి | | बिक रहे | |
| farmer:products.filters.low | Running low | తక్కువగా ఉన్నవి | | कम बचे | |
| farmer:products.filters.out_of_stock | Out of stock | అయిపోయినవి | | खत्म | |
| farmer:products.filters.paused | Paused | ఆపినవి | | रोके गए | |
| farmer:products.status.available | Selling | అమ్ముతున్నారు | | बिक रहा है | |
| farmer:products.status.out_of_stock | Out of stock | అయిపోయింది | | खत्म | |
| farmer:products.status.paused | Paused | ఆపారు | | रोका गया | |
| farmer:products.left | {{left}} of {{total}} {{unit}} left | {{total}} {{unit}}లో {{left}} మిగిలింది | | {{total}} {{unit}} में से {{left}} बचा है | |
| farmer:products.price | {{price}} per {{unit}} | {{unit}}కు {{price}} | | {{price}} प्रति {{unit}} | |
| farmer:products.harvested | Harvested {{date}} | {{date}}న కోశారు | | {{date}} को तोड़ा | |
| farmer:products.lowBadge | Running low | తక్కువగా ఉంది | | कम बचा है | |
| farmer:products.oldWarning | Harvested long ago. Check it is still fresh. | చాలా రోజుల క్రితం కోశారు. ఇంకా తాజాగా ఉందో చూడండి. | | काफ़ी पहले तोड़ा गया। देख लें कि अभी भी ताज़ा है। | |
| farmer:products.emptyTitle | No products yet | ఇంకా ఉత్పత్తులు లేవు | | अभी कोई उत्पाद नहीं | |
| farmer:products.emptyMessage | Add your first crop and nearby buyers will see it. | మీ మొదటి పంటను జోడించండి, దగ్గరలోని కొనుగోలుదారులకు కనిపిస్తుంది. | | अपनी पहली फ़सल जोड़ें, पास के खरीदारों को दिखेगी। | |
| farmer:products.emptyFilteredTitle | Nothing here | ఇక్కడ ఏమీ లేదు | | यहाँ कुछ नहीं | |
| farmer:products.emptyFilteredMessage | None of your products match this filter. | ఈ ఎంపికకు సరిపోయే ఉత్పత్తులు లేవు. | | इस विकल्प से कोई उत्पाद मेल नहीं खाता। | |
| farmer:products.showing | Showing {{shown}} of {{total}} | {{total}}లో {{shown}} చూపిస్తున్నాము | | {{total}} में से {{shown}} दिखा रहे हैं | |
| farmer:products.loadMore | Show more | మరిన్ని చూపించు | | और दिखाएँ | |
| farmer:profile.title | My profile | నా ప్రొఫైల్ | | मेरी प्रोफ़ाइल | |
| farmer:profile.farm | Farm details | పొలం వివరాలు | | खेत की जानकारी | |
| farmer:profile.location | Farm location | పొలం స్థానం | | खेत की जगह | |
| farmer:profile.delivery | Delivery | డెలివరీ | | डिलीवरी | |
| farmer:profile.language | Language | భాష | | भाषा | |
| farmer:profile.account | Account | ఖాతా | | खाता | |
| farmer:profile.edit | Edit | మార్చండి | | बदलें | |
| farmer:profile.editTitle | Edit farm details | పొలం వివరాలు మార్చండి | | खेत की जानकारी बदलें | |
| farmer:profile.save | Save changes | మార్పులు సేవ్ చేయండి | | बदलाव सेव करें | |
| farmer:profile.saved | Your details are saved. | మీ వివరాలు సేవ్ అయ్యాయి. | | आपकी जानकारी सेव हो गई। | |
| farmer:profile.noLocation | Not shared. Buyers find you by pincode. | పంచుకోలేదు. కొనుగోలుదారులు పిన్‌కోడ్ ద్వారా మిమ్మల్ని కనుగొంటారు. | | साझा नहीं की। खरीदार पिनकोड से आपको ढूँढेंगे। | |
| farmer:profile.locationShared | Shared. Buyers only see the approximate distance. | పంచుకున్నారు. కొనుగోలుదారులకు సుమారు దూరం మాత్రమే కనిపిస్తుంది. | | साझा की। खरीदारों को सिर्फ़ अनुमानित दूरी दिखती है। | |
| farmer:profile.days | Delivery days | డెలివరీ రోజులు | | डिलीवरी के दिन | |
| farmer:profile.cutoff | Order until {{time}} for the next delivery | తదుపరి డెలివరీకి {{time}} వరకు ఆర్డర్ చేయవచ్చు | | अगली डिलीवरी के लिए {{time}} तक ऑर्डर | |
| farmer:profile.radius | Up to {{km}} km | {{km}} కి.మీ వరకు | | {{km}} किमी तक | |
| farmer:profile.minOrder | Smallest order: {{amount}} | కనీస ఆర్డర్: {{amount}} | | सबसे छोटा ऑर्डर: {{amount}} | |
| farmer:profile.fee | Delivery charge: {{amount}} | డెలివరీ ఛార్జీ: {{amount}} | | डिलीवरी शुल्क: {{amount}} | |
| farmer:profile.pincodes | Delivers to: {{list}} | డెలివరీ చేసేది: {{list}} | | यहाँ डिलीवरी: {{list}} | |
| farmer:profile.phone | Phone | ఫోన్ | | फ़ोन | |
| farmer:profile.logoutAll | Log out on all phones | అన్ని ఫోన్లలో లాగ్ అవుట్ | | सभी फ़ोन पर लॉग आउट | |
| farmer:profile.logoutAllTitle | Log out on all phones? | అన్ని ఫోన్లలో లాగ్ అవుట్ చేయాలా? | | सभी फ़ोन पर लॉग आउट करें? | |
| farmer:profile.logoutAllMessage | You will need an SMS code to log in again on every phone, including this one. | ఈ ఫోన్‌తో సహా ప్రతి ఫోన్‌లో మళ్ళీ లాగిన్ అవ్వడానికి SMS కోడ్ కావాలి. | | इस फ़ोन समेत हर फ़ोन पर फिर से लॉगिन करने के लिए SMS कोड चाहिए होगा। | |
| farmer:profile.logoutAllConfirm | Yes, log out everywhere | అవును, అన్నిచోట్లా లాగ్ అవుట్ | | हाँ, हर जगह लॉग आउट करें | |
| devui:title | Component gallery | కాంపోనెంట్ గ్యాలరీ | | कंपोनेंट गैलरी | |
| devui:intro | Every reusable component, shown in the current language. Switch the language to check the layout. | ప్రతి కాంపోనెంట్ ప్రస్తుత భాషలో చూపబడింది. లేఅవుట్ చూడటానికి భాష మార్చండి. | | हर कंपोनेंट मौजूदा भाषा में दिखाया गया है। लेआउट जाँचने के लिए भाषा बदलें। | |
| devui:sections.buttons | Big buttons | పెద్ద బటన్లు | | बड़े बटन | |
| devui:sections.tiles | Icon tiles | ఐకాన్ టైల్స్ | | आइकन टाइल | |
| devui:sections.stepper | Quantity stepper | పరిమాణం మార్చే బటన్లు | | मात्रा बदलने के बटन | |
| devui:sections.presets | Preset chips | త్వరిత ఎంపికలు | | झटपट विकल्प | |
| devui:sections.feedback | Toast messages | సందేశాలు | | संदेश | |
| devui:sections.loading | Loading skeleton | లోడ్ అవుతున్న రూపం | | लोड होता हुआ रूप | |
| devui:sections.empty | Empty state | ఖాళీ స్థితి | | खाली स्थिति | |
| devui:sections.error | Error state | పొరపాటు స్థితి | | त्रुटि स्थिति | |
| devui:sections.confirm | Confirmation sheet | నిర్ధారణ షీట్ | | पुष्टि शीट | |
| devui:sections.nav | Bottom navigation | కింది మెనూ | | नीचे का मेनू | |
| devui:samples.sell | Sell produce | పంట అమ్మండి | | फ़सल बेचें | |
| devui:samples.myOrders | My orders | నా ఆర్డర్లు | | मेरे ऑर्डर | |
| devui:samples.marketPrices | Market prices | మార్కెట్ ధరలు | | मंडी भाव | |
| devui:samples.assistant | Ask assistant | సహాయకుడిని అడగండి | | सहायक से पूछें | |
| devui:samples.callAgent | Call my agent | నా ఏజెంట్‌కు కాల్ చేయండి | | मेरे एजेंट को कॉल करें | |
| devui:samples.deleteListing | Delete listing | లిస్టింగ్ తొలగించండి | | लिस्टिंग हटाएँ | |
| devui:samples.saving | Saving | సేవ్ అవుతోంది | | सेव हो रहा है | |
| devui:samples.howMuch | How many kg? | ఎన్ని కిలోలు? | | कितने किलो? | |
| devui:samples.price | Price per kg | కిలో ధర | | प्रति किलो भाव | |
| devui:samples.toastSaved | Listing saved | లిస్టింగ్ సేవ్ అయింది | | लिस्टिंग सेव हो गई | |
| devui:samples.toastError | Could not save. Please try again. | సేవ్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి. | | सेव नहीं हो सका। कृपया फिर से कोशिश करें। | |
| devui:samples.showToast | Show message | సందేశం చూపించండి | | संदेश दिखाएँ | |
| devui:samples.showErrorToast | Show error message | పొరపాటు సందేశం చూపించండి | | त्रुटि संदेश दिखाएँ | |
| devui:samples.noOrdersTitle | No orders yet | ఇంకా ఆర్డర్లు లేవు | | अभी कोई ऑर्डर नहीं | |
| devui:samples.noOrdersMessage | When buyers order your produce, the orders will appear here. | కొనుగోలుదారులు మీ పంటను ఆర్డర్ చేసినప్పుడు, ఆర్డర్లు ఇక్కడ కనిపిస్తాయి. | | जब खरीदार आपकी फ़सल ऑर्डर करेंगे, ऑर्डर यहाँ दिखेंगे। | |
| devui:samples.openConfirm | Remove tomato listing | టమాటా లిస్టింగ్ తీసివేయండి | | टमाटर लिस्टिंग हटाएँ | |
| devui:samples.confirmTitle | Remove this listing? | ఈ లిస్టింగ్ తీసివేయాలా? | | यह लिस्टिंग हटाएँ? | |
| devui:samples.confirmMessage | Buyers will no longer see your tomatoes. You can add them again later. | కొనుగోలుదారులకు మీ టమాటాలు ఇక కనిపించవు. తరువాత మళ్ళీ జోడించవచ్చు. | | खरीदारों को अब आपके टमाटर नहीं दिखेंगे। आप बाद में फिर से जोड़ सकते हैं। | |
| devui:samples.confirmAction | Yes, remove | అవును, తీసివేయండి | | हाँ, हटाएँ | |
| devui:samples.confirmed | Listing removed | లిస్టింగ్ తీసివేయబడింది | | लिस्टिंग हटा दी गई | |
| devui:samples.badgeNew | new | కొత్తవి | | नए | |

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
