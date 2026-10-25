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

// Order updates for the buyer. Kept short: Telugu/Hindi SMS segments hold 70 characters.
const ORDER_TEMPLATES = {
  accepted: {
    en: ({ farmer, date, code }) =>
      `AgriConnect: ${farmer} accepted your order for ${date}. Delivery code: ${code}.`,
    te: ({ farmer, date, code }) =>
      `AgriConnect: ${farmer} మీ ${date} ఆర్డర్ అంగీకరించారు. డెలివరీ కోడ్: ${code}.`,
    hi: ({ farmer, date, code }) =>
      `AgriConnect: ${farmer} ने ${date} का आपका ऑर्डर स्वीकार किया। डिलीवरी कोड: ${code}।`,
  },
  out_for_delivery: {
    en: ({ farmer, code }) =>
      `AgriConnect: ${farmer} is on the way. Give code ${code} only when you receive your order.`,
    te: ({ farmer, code }) =>
      `AgriConnect: ${farmer} దారిలో ఉన్నారు. ఆర్డర్ అందినప్పుడే కోడ్ ${code} చెప్పండి.`,
    hi: ({ farmer, code }) =>
      `AgriConnect: ${farmer} रास्ते में हैं। ऑर्डर मिलने पर ही कोड ${code} बताएँ।`,
  },
  delivered: {
    en: ({ farmer }) => `AgriConnect: Your order from ${farmer} was delivered. Thank you!`,
    te: ({ farmer }) => `AgriConnect: ${farmer} నుండి మీ ఆర్డర్ డెలివరీ అయింది. ధన్యవాదాలు!`,
    hi: ({ farmer }) => `AgriConnect: ${farmer} से आपका ऑर्डर डिलीवर हुआ। धन्यवाद!`,
  },
};

// null when there is no SMS for this status.
export function orderSmsMessage(status, language, params) {
  const templates = ORDER_TEMPLATES[status];
  return templates ? (templates[language] ?? templates.en)(params) : null;
}
