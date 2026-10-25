import { PageHeader } from './ui/PageHeader.jsx';

// Standard screen: header plus a centred, phone-width content column.
export function Screen({ title, showBack = true, actions, children }) {
  return (
    <>
      <PageHeader title={title} showBack={showBack} actions={actions} />
      <div className="mx-auto flex max-w-screen-sm flex-col gap-6 px-4 pt-4">{children}</div>
    </>
  );
}
