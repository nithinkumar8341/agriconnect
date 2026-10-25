// te and hi texts are machine-written; they are listed in docs/translation-review.md for a native speaker.
const OTP_TEMPLATES = {
  en: (otp) =>
    `${otp} is your AgriConnect login code. It is valid for 5 minutes. Do not share it with anyone.`,
  te: (otp) =>
    `${otp} మీ AgriConnect లాగిన్ కోడ్. ఇది 5 నిమిషాల వరకు చెల్లుతుంది. దీన్ని ఎవరితోనూ పంచుకోవద్దు.`,
  hi: (otp) =>
    `${otp} आपका AgriConnect लॉगिन कोड है। यह 5 मिनट तक मान्य है। इसे किसी के साथ साझा न करें।`,
};

export function otpMessage(language, otp) {
  return (OTP_TEMPLATES[language] ?? OTP_TEMPLATES.en)(otp);
}
