import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { useApiRequest } from '../../hooks/useApiRequest.js';

// "What buyers say": a short summary of a farmer's reviews, labelled as AI-written when it is.
// Shown only once there are at least 3 reviews; hidden if the AI service is unavailable.
export function ReviewInsights({ farmerId }) {
  const { t, i18n } = useTranslation('common');
  const { client } = useAuth();
  const language = i18n.language;
  const insights = useApiRequest(
    (signal) => client.get(`/ai/review-insights/${farmerId}?language=${language}`, { signal }),
    `insights:${farmerId}:${language}`,
  );
  if (insights.data?.status !== 'ok') return null;

  return (
    <section
      aria-label={t('ai.insights.title')}
      className="flex flex-col gap-1 rounded-2xl border-2 border-leaf-700 bg-white p-4"
    >
      <p className="flex items-center gap-2 text-lg font-semibold text-leaf-800">
        <Sparkles aria-hidden="true" className="size-5" />
        {t('ai.insights.title')}
      </p>
      <p className="text-lg">{insights.data.summary}</p>
      <p className="text-base text-ink-muted">
        {insights.data.usedLlm ? t('ai.insights.aiNote') : t('ai.insights.statsNote')}
      </p>
    </section>
  );
}
