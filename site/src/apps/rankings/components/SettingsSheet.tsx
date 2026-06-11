import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function SettingsSheet({ open, onClose, title = "Settings", children }: Props) {
  if (!open) return null;

  return (
    <div className="settings-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="settings-sheet__backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div className="settings-sheet__panel">
        <header className="settings-sheet__header">
          <h2 className="settings-sheet__title">{title}</h2>
          <button type="button" className="settings-sheet__close" onClick={onClose}>
            Done
          </button>
        </header>
        <div className="settings-sheet__body">{children}</div>
      </div>
    </div>
  );
}
