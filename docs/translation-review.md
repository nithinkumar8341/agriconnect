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

Machine-written te and hi for every UI key. The app falls back to English for a missing key, but every key is currently filled (a test checks this).

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
| common:language.label | Language | భాష | | भाषा | |
| common:language.choose | Choose your language | మీ భాషను ఎంచుకోండి | | अपनी भाषा चुनें | |
| common:language.change | Change language | భాష మార్చండి | | भाषा बदलें | |
| common:nav.label | Main menu | ప్రధాన మెనూ | | मुख्य मेनू | |
| common:nav.home | Home | హోమ్ | | होम | |
| common:nav.products | My products | నా ఉత్పత్తులు | | मेरे उत्पाद | |
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
