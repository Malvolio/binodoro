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
      <h3>A rhythm for getting things done</h3>
      <p>
        Pomodoro turns a large task into a manageable commitment: choose one
        task, focus for 25 minutes, then take a 5-minute break. After four focus
        sessions, take a 15-minute break. This structure can help you get
        started, protect time from distractions, and make space for regular
        rest. Binodoro selects the next mode automatically; press Start when
        you’re ready.
      </p>
      <h3>A sound to accompany your focus</h3>
      <p>
        Binaural beats arise when each ear hears a slightly different tone. With
        headphones, that difference can be perceived as a rhythmic beat. Some
        people find the steady sound a useful backdrop for concentration.
        Research into attention and other benefits is mixed and limited;
        improved concentration or brainwave entrainment is not guaranteed. EEG
        band names such as Alpha describe frequency ranges, not proven effects.
      </p>
      <h3>Make the sound your own</h3>
      <p>
        Choose a sound beside the timer, or open <strong>edit presets</strong>{" "}
        to explore the sound studio. Adjust the carrier, beat frequency,
        balance, and background noise; preview tones without starting the timer
        and save custom presets. Advanced panels offer sweeps, playback
        comparisons, visualizations, and informal blind tests. On the timer
        page, focus plays your selected tones and breaks play music, only while
        the timer runs.
      </p>
      <p>
        Use headphones for binaural listening and start at a low, comfortable
        volume.
      </p>
      <p>
        Questions or feedback?{" "}
        <a href="mailto:info@binodoro.online">info@binodoro.online</a>
      </p>
      <p>
        <a
          href="https://buymeacoffee.com/michaellorton"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy me a coffee
        </a>
      </p>
      <p className="about-sources">
        Learn more:{" "}
        <a
          href="https://www.pomodorotechnique.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pomodoro Technique
        </a>
        {" · "}
        <a
          href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10198548/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Binaural beats research review
        </a>
      </p>
      <Link className="edit-presets-button" to="/controls" onClick={onDismiss}>
        Explore sound controls
      </Link>
    </dialog>
  );
};
