import { useEffect, useRef, useState } from 'react';

const LOCALES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

// Browser error codes -> our message keys. "aborted" is our own stop/unmount, not an error.
const ERRORS = {
  'not-allowed': 'notAllowed',
  'service-not-allowed': 'notAllowed',
  'no-speech': 'noSpeech',
  'audio-capture': 'audioCapture',
  network: 'network',
  'language-not-supported': 'language',
};

function recognitionClass() {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Asking on the tap shows the browser's permission prompt at a moment the user expects it, and
// tells "blocked" apart from "no microphone". Browsers without mediaDevices skip this step.
async function microphoneProblem() {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch (err) {
    return err?.name === 'NotFoundError' ? 'audioCapture' : 'notAllowed';
  }
}

// Voice typing with the Web Speech API (Chrome or Edge, on localhost or HTTPS).
// status: idle -> listening -> processing -> idle (text delivered to onText), or error with
// `error` naming why (unsupported, insecure, notAllowed, noSpeech, audioCapture, network,
// language, generic) so the UI can say what to do.
export function useSpeechInput(language, onText) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const recognition = useRef(null);
  const Recognition = recognitionClass();

  useEffect(() => () => recognition.current?.abort(), []);

  function fail(key) {
    setError(key);
    setStatus('error');
  }

  async function start() {
    if (status === 'listening' || status === 'processing') return;
    setError(null);
    if (!Recognition) return fail('unsupported');
    if (!window.isSecureContext) return fail('insecure');
    const micProblem = await microphoneProblem();
    if (micProblem) return fail(micProblem);

    const r = new Recognition();
    r.lang = LOCALES[language] ?? LOCALES.en;
    r.interimResults = false;
    r.maxAlternatives = 1;
    let settled = false;
    r.onspeechend = () => setStatus('processing');
    r.onresult = (event) => {
      settled = true;
      setStatus('idle');
      onText(event.results[0][0].transcript);
    };
    r.onerror = (event) => {
      if (event.error === 'aborted') return;
      settled = true;
      fail(ERRORS[event.error] ?? 'generic');
    };
    r.onend = () => {
      recognition.current = null;
      // Ended without words or an error: the browser heard nothing it could use.
      if (!settled) fail('noSpeech');
    };
    recognition.current = r;
    setStatus('listening');
    try {
      r.start();
    } catch {
      recognition.current = null;
      fail('generic');
    }
  }

  function stop() {
    if (!recognition.current) return;
    setStatus('processing');
    recognition.current.stop();
  }

  return { supported: Boolean(Recognition), status, error, start, stop };
}
