import { PageHeader } from './ui/PageHeader.jsx';

// Standard screen: header plus a centred, phone-width content column.
// onBack overrides the default "previous page" for multi-step screens.
// `wide` lets grid screens (the buyer's product grid) use 3-4 columns on tablets and desktops.
export function Screen({ title, showBack = true, onBack, actions, wide = false, children }) {
  return (
    <>
      <PageHeader title={title} showBack={showBack} onBack={onBack} actions={actions} />
      <div
        className={`mx-auto flex flex-col gap-6 px-4 pt-4 ${wide ? 'max-w-screen-xl' : 'max-w-screen-sm'}`}
      >
        {children}
      </div>
    </>
  );
}
