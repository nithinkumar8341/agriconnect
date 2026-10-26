import { useEffect, useRef, useState } from 'react';

const LOCALES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

function recognitionClass() {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Voice typing with the browser's Web Speech API (Chrome on Android supports te-IN and hi-IN).
// Where it is missing, `supported` is false and the mic button simply does not show.
export function useSpeechInput(language, onText) {
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  const Recognition = recognitionClass();

  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    if (!Recognition || listening) return;
    const r = new Recognition();
    r.lang = LOCALES[language] ?? LOCALES.en;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (event) => onText(event.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  }

  return {
    supported: Boolean(Recognition),
    listening,
    start,
    stop: () => recognition.current?.stop(),
  };
}
