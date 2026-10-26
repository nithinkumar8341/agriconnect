import { Bot, MessageCircleQuestion, Mic, MicOff, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { useSpeechInput } from '../../hooks/useSpeechInput.js';
import { TextField } from '../form/TextField.jsx';
import { BottomSheet } from '../ui/index.js';

const EXAMPLES = ['ai.chat.example1', 'ai.chat.example2', 'ai.chat.example3'];

// Floating "Help" button that opens a small chat: questions about how AgriConnect works and what
// is on sale now. Type or speak (Web Speech API, in the app's language).
export function ChatWidget() {
  const { t, i18n } = useTranslation('common');
  const { client } = useAuth();
  const language = i18n.language;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const speech = useSpeechInput(language, setText);

  async function ask(question) {
    const message = question.trim();
    if (!message || busy) return;
    setMessages((list) => [...list, { from: 'me', text: message }]);
    setText('');
    setBusy(true);
    try {
      const { reply } = await client.post('/ai/chat', { message, language });
      setMessages((list) => [...list, { from: 'bot', text: reply }]);
    } catch {
      setMessages((list) => [...list, { from: 'bot', text: t('ai.chat.unavailable') }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-30 flex min-h-14 items-center gap-2 rounded-full bg-leaf-700 px-5 text-lg font-bold text-white shadow-lg focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-leaf-800"
      >
        <MessageCircleQuestion aria-hidden="true" className="size-6" />
        {t('ai.chat.button')}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('ai.chat.title')}>
        <div className="flex max-h-[70vh] flex-col gap-3">
          <p className="text-base text-ink-muted">{t('ai.chat.note')}</p>
          <ul aria-live="polite" className="flex flex-col gap-2 overflow-y-auto">
            {messages.length === 0 &&
              EXAMPLES.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => ask(t(key))}
                    className="min-h-12 w-full rounded-2xl border-2 border-soil-200 bg-white px-4 py-2 text-left text-lg"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            {messages.map((m, i) => (
              <li
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-lg ${
                  m.from === 'me'
                    ? 'self-end bg-leaf-700 text-white'
                    : 'flex items-start gap-2 self-start bg-white'
                }`}
              >
                {m.from === 'bot' && <Bot aria-hidden="true" className="mt-1 size-5 shrink-0" />}
                <span>
                  <span className="sr-only">
                    {m.from === 'me' ? t('ai.chat.you') : t('ai.chat.helper')}:{' '}
                  </span>
                  {m.text}
                </span>
              </li>
            ))}
            {busy && <li className="self-start text-lg text-ink-muted">{t('ai.chat.thinking')}</li>}
          </ul>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              ask(text);
            }}
          >
            <TextField
              className="flex-1"
              label={t('ai.chat.ask')}
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
            />
            {speech.supported && (
              <button
                type="button"
                aria-pressed={speech.listening}
                aria-label={speech.listening ? t('ai.chat.stop') : t('ai.chat.speak')}
                onClick={speech.listening ? speech.stop : speech.start}
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-leaf-700 bg-white text-leaf-800"
              >
                {speech.listening ? (
                  <MicOff aria-hidden="true" className="size-6" />
                ) : (
                  <Mic aria-hidden="true" className="size-6" />
                )}
              </button>
            )}
            <button
              type="submit"
              aria-label={t('ai.chat.send')}
              disabled={busy || !text.trim()}
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-leaf-700 text-white disabled:opacity-50"
            >
              <Send aria-hidden="true" className="size-6" />
            </button>
          </form>
        </div>
      </BottomSheet>
    </>
  );
}
