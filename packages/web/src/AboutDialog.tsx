import { AboutContent } from "./AboutContent";
import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

export const AboutDialog = ({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss: () => void;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="about-dialog"
      aria-labelledby="about-title"
      onCancel={onDismiss}
      onClose={onDismiss}
    >
      <button
        className="coffee-close"
        aria-label="Close About"
        onClick={onDismiss}
      >
        <X size={18} />
      </button>
      <h2 id="about-title">About Binodoro</h2>
      <AboutContent />
      <p>
        <Link to="/about" onClick={onDismiss}>
          Read the full About page
        </Link>
      </p>
      <Link className="edit-presets-button" to="/controls" onClick={onDismiss}>
        Explore sound controls
      </Link>
    </dialog>
  );
};
