import { PageHeader } from './ui/PageHeader.jsx';

// Standard screen: header plus a centred, phone-width content column.
// onBack overrides the default "previous page" for multi-step screens.
export function Screen({ title, showBack = true, onBack, actions, children }) {
  return (
    <>
      <PageHeader title={title} showBack={showBack} onBack={onBack} actions={actions} />
      <div className="mx-auto flex max-w-screen-sm flex-col gap-6 px-4 pt-4">{children}</div>
    </>
  );
}
