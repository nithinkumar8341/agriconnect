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

Frontend translation files are added in Prompt 4.
