import { X } from "lucide-react";
import { useEffect, useRef } from "react";
export const CoffeeDialog = ({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="coffee-dialog"
      aria-labelledby="coffee-title"
      aria-describedby="coffee-description"
      onCancel={onDismiss}
      onClose={onDismiss}
    >
      <button
        className="coffee-close"
        aria-label="Dismiss coffee invitation"
        onClick={onDismiss}
      >
        <X size={18} />
      </button>
      <div className="coffee-logo">
        <img
          src="/brand/buy-me-a-coffee.svg"
          alt="Buy Me a Coffee logo"
          width="35"
          height="50"
        />
      </div>
      <h2 id="coffee-title">Enjoying your focus time?</h2>
      <p id="coffee-description">
        If this little app helps your day, you can buy Michael a coffee. Your
        support keeps it brewing.
      </p>
      <a
        className="coffee-accept"
        href="https://buymeacoffee.com/michaellorton"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onDismiss}
      >
        Buy me a coffee <span aria-hidden="true">↗</span>
      </a>
      <button className="coffee-decline" onClick={onDismiss}>
        Not now
      </button>
    </dialog>
  );
};
