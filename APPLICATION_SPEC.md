# Binaural Pomodoro — application specification and LCS decisions

This project implements the Binaural Beat Laboratory prompt and its Binaural Pomodoro extension, supplemented by `/Users/michael.lorton/persrepo/lcs/LCS.md` (read in full).

## Explicit application overrides

The request specifies an entirely local Vite application, no server, and no external synthesis service. Consequently:

- Hosting uses the root `alchemy.run.ts` with Alchemy 0.94.0’s Website resource to deploy a static-assets Worker. Production binds `binodoro.online`; other stages use a workers.dev URL. No application backend is added. Alchemy’s native TypeScript infrastructure DSL uses its required top-level await; application workflows remain Effect-first.
- Database, HTTP API, authentication, secrets, and remote service requirements do not apply. Presets use browser localStorage as explicitly requested.

The monorepo includes `packages/web` and `packages/shared`, with Bun tooling and `bun.lock`.

## Version target

This application targets **Effect 3.22**. Effect 3's `Context.Tag`, `Schema.decodeUnknown`, `Layer.scoped`, and `ManagedRuntime` APIs implement the LCS architecture. It uses `@effect/vitest` 0.27 with Vitest 3 and `@lucas-barake/effect-form-react` 0.25 with the compatible Effect Atom 0.5 line. For this Effect major, the atom React package is named `@effect-atom/atom-react`, the predecessor of the Effect 4 `@effect/atom-react` name. Its platform/RPC/experimental peer versions are pinned to compatible minor lines. The Effect 4 form release is intentionally not mixed into the Effect 3 application. Relevant API declarations and peer dependencies were checked against installed packages.

## Domain and lifecycle

Master volume is a global output control owned separately from experiment settings. Presets, captured A/B stimuli, randomization, and experiment resets cannot change it. Legacy preset volume fields are discarded by schema decoding.

Preset IDs are Schema-branded. Persisted settings are fully decoded using Effect Schema at the storage boundary; malformed, partial, or out-of-range storage restores no custom presets. Parameter entry is constrained before audio scheduling. Oscillators stay at least 1 Hz; when carrier and beat combinations conflict, the beat is limited to preserve positive ear frequencies, including during sweeps.

One shared ManagedRuntime is owned by the composition root. Audio is acquired in a scoped Layer and released by its finalizer. React accesses services through RuntimeContext, and form state uses Effect Atom. Pure calculations and component-local state stay ordinary TypeScript/React. Native Web Audio promises are adapted at the infrastructure boundary and execute as Effects from event handlers. No component constructs application Layers.

Audio routing is a smoothly automated 2×2 matrix into a discrete ChannelMergerNode. Monaural matrix rows are `[0.5, 0.5]`; binaural rows are isolated or swapped. Noise enters downstream. Conservative master scaling is 0.25 at maximum, with a 0.65 tone amplitude and independently bounded noise buffers. AM and band-limited isochronic pulse modulation are separate native audio paths. Frequency sweeps use audio-clock scheduling, and continues playing when the document is hidden.

## Visualization interpretation

The routed tone waveform is measured from native analysers. The frequency display is a schematic of fundamental peaks, as labeled; waveform harmonics and background noise are omitted. The beat visualization is a mathematical difference relationship, not an EEG or perceptual measurement. Clinical or therapeutic efficacy is not claimed.

## Pomodoro extension

The primary route `/` is a warm, tomato-inspired timer workspace based on the supplied visual reference. `/controls` retains the detailed sound studio. TanStack Router follows LCS §3.1. A shared SessionProvider above the route outlet owns shared Effect Atom state and the existing audio service; navigation does not rebuild audio resources. The home sound panel uses exactly the same built-in and custom preset data as the studio. Master volume remains global and independent of saved sounds.

Focus lasts 25 minutes; short and long breaks last 5 and 15 minutes. Sessions use an absolute deadline obtained through the Effect clock. Timer calculations are pure and tested for delayed callbacks, pause/resume, zero clamping, reset, and single completion counting. The timer continues when visiting the sound studio or when the document becomes hidden; audio continues playing in background tabs. Timer state lasts for the current application lifetime and resets on full reload. Timer and audio transport operate independently. Natural completion automatically starts the next phase and its sound as the transition tones play.

Visual and accessibility checks include responsive layouts, keyboard mode tabs, reduced-motion styles, shared playback and preset changes across both pages, and restoration of the main settings after leaving blind playback.

## Mode-based audio and support invitation

The October 18 extension explicitly supersedes the original no-prerecorded-audio requirement for break playback only. Binaural synthesis remains native Web Audio. Songs in `packages/web/public/music` are served locally and played through an injected, scoped Music service using a native media element; Vite inventories the directory at startup/build. Music and binaural playback are mutually exclusive. A global play/mute state and master volume apply to both. Focus uses the selected stimulus, and both break modes use the looping music playlist, regardless of whether the countdown is currently paused. Both tones and break music may play in the background.

The home page has only the mode-specific headline above the tabs, no branding/header or introductory text. The Volume control is always visible, without a separate listening-volume summary or disclosure. Break modes hide binaural preset/readout controls.

A break is considered started when its countdown first starts, not when its mode is selected. A session ID and started flag prevent re-drawing on pause/resume, while resets and completed-session restarts create a new break opportunity. An injected CoffeeInvitation capability makes one Bernoulli draw with probability 1/3. Its operation fiber waits five seconds before opening the native modal, then thirty seconds before auto-dismissal, and is interrupted when its owning break changes. Native dialog behavior supplies focus containment and Escape dismissal. An explicit link activation opens only the requested Buy Me a Coffee URL in a separate browsing context with noopener/noreferrer. The official logo is bundled locally, with provenance recorded alongside it.

## Timer-gated playback refinement

Sound is enabled by default but actual playback is gated by the timer's running state. Muting is an independent shared preference, not an alias for whether a source is currently playing. Pausing, resetting, changing timer modes, stops both audio sources without clearing the sound preference. Unmuting a paused/stopped timer remains silent. The studio respects the same gate and disables its manual play button until a session is running.

Whenever music playback starts (including resume/unmute), the first song is chosen uniformly at random from the bundled playlist. Subsequent tracks continue in filename order and wrap. Focus, short break, and long break use red, yellow, and green tomato slices and palettes respectively; yellow uses dark foreground text for contrast. The preset area uses a compact sound selector and a plain “edit presets” button. Height-aware mobile layouts keep the Volume slider visible on small phones.

## Circular timer adjustment and completion sound

The circular time indicator is an accessible slider with native pointer capture for mouse, pen, and touch dragging. It maps clockwise angles from twelve o’clock to remaining time within the active mode’s full duration, clamped to at least one second. Keyboard adjustments support 15-second arrows, one-minute Shift+arrows/Page Up/Page Down, and Home/End endpoints. Editing a running timer updates its absolute deadline without restarting its session or re-drawing the coffee invitation.

A scoped CompletionChime service owns a native AudioContext, unlocked from the timer button’s user interaction. Natural expiration produces three 880 Hz sine beeps over roughly half a second, with short gain ramps and scheduled cleanup. Alerts respect global Volume and mute, and do not fire on pause, reset, or ring editing. A pending coffee invitation is cancelled if a short adjusted break completes before the invitation appears.

Sound preferences (mute, selected preset, and current synthesis settings) persist in schema-validated localStorage, separately from the custom preset collection. Restoration never starts the timer or audio. Master volume remains outside presets.

Natural completion selects the next standard Pomodoro phase: short breaks after focus sessions 1–3, a long break after every fourth focus, and focus after either break. The next session starts immediately, using a fresh deadline when expiration is observed so suspended tabs do not skip unheard sessions. Completion events remain distinct from resets and manual mode changes so beeps fire exactly once.

The controls page is an explicit exception to timer-only sound: user-initiated Play audio and blind auditions preview binaural settings without starting the Pomodoro timer, regardless of selected break mode. Returning home ends the preview and restores timer-controlled sound.

Timer artwork uses browser-compatible WebP copies of the supplied JPEG XL tomato slices in public/images. All decorative leaf artwork is removed; long break uses a walking icon.

The subtitle and Learn more dialog are available in every timer mode. The About dialog exposes info@binodoro.online as a mailto link. A separate Alchemy email deployment (`alchemy.email.ts`, production only) provisions the Gmail destination, waits for recipient verification, then enables Cloudflare Email Routing and the exact info@ forwarding rule. This is infrastructure forwarding; the browser app still has no email server or sending API. Initial activation requires mail/DNS permissions and approval for domain MX/TXT changes; existing external MX records must be inspected before activation.

## October 21 timer controls

Mode controls are wide, clickable chevron steps below the timer, retaining keyboard tab navigation. Start/Resume floats over the time whenever paused; the action row contains Pause and Reset, with Pause disabled while stopped. Reset is disabled only when stopped at the full mode duration (Start showing); it remains enabled when Resume is showing. The floating mode label omits “TIME”, and the session-progress dots and status line are removed. Manual selection and reset wait for Start. Automatic transitions preserve the standard four-focus sequence and do not wait for Start. Background visibility alone never pauses audio; browser or operating-system suspension can still interrupt playback. This supersedes earlier pause-on-hidden and paused-next-session requirements.

The timer audio settings begin with a shared mute-and-volume card in all modes: mute is on the left, and Volume fills the remaining width. Focus adds a separate binaural card below with its preset selector, playback status, edit-presets button, and sound readout. Breaks show only the shared audio card.
