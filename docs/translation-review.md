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

Frontend translation files are added in Prompt 4.
