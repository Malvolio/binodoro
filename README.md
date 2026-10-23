# Binaural Pomodoro

A local Pomodoro timer with a shared binaural sound studio, built with React, TanStack Start, strict TypeScript, Vite, Tailwind, shadcn/ui, native Web Audio, and the Lorton Cloudflare Stack's Effect architecture. No backend, accounts, remote synthesis, or external runtime requests. Binaural tones are synthesized locally; breaks use the bundled music files.

## Run

Requires Bun 1.3+, Node 22.12+ (or a supported newer LTS), and a current browser.

```sh
bun install
bun run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). The home page is the Pomodoro timer; the detailed sound studio is at `/controls`. Put on headphones, start at low volume, and press **Start focus**. Sound is enabled by default and plays only while the timer runs. The default is a 220 Hz carrier, 10 Hz difference, and 15% master volume: 215 Hz left and 225 Hz right.

```sh
bun run check       # strict type checking, including tests
bun run test        # domain and Effect service tests
bun run test:e2e    # Playwright browser, persistence, mobile, and actual audio routing tests
bun run build      # prerendered static site: packages/web/dist/client
bun run preview    # serve the production build locally
bun run format     # format source files
```

Browser tests use an installed Google Chrome. To use Playwright's bundled Chromium, remove `channel: 'chrome'` in `playwright.config.ts` and install it with `bunx playwright install chromium`. Browser test output is muted. The audio routing test reads real native analyser buffers and measures each tone's amplitude; it does not rely solely on graph configuration mocks.

## Pomodoro timer

The home page has Focus (25 minutes, red), Short break (5 minutes, yellow), and Long break (15 minutes, green) modes. Start, pause/resume, or reset the selected timer. Selecting a different mode resets that timer and leaves it paused. A completed focus session increments the session counter; breaks do not. At expiry, focus sessions 1–3 select a short break and every fourth focus selects a long break; either break selects focus. The next session starts automatically at its full duration as the transition tones play. Drag the circular ring to set remaining time between one second and the selected mode’s full duration, before or during playback. The ring also supports arrow keys (15 seconds), Shift+arrows or Page Up/Down (one minute), Home (one second), and End (full duration). A natural completion plays three quick native Web Audio beeps, using the current Volume and mute preference; pausing, resetting, or editing the ring does not announce completion.

The countdown uses an absolute wall-clock deadline, so delayed callbacks and background tab suspension do not accumulate drift. The timer continues across navigation to the sound studio; it resets on a full reload. Sound is enabled by default, but only plays while the timer is running. Pause, reset, and manual mode changes stop playback while preserving the mute preference. Unmuting a paused timer does not start sound; starting or resuming the timer does when sound is enabled. The selected mode determines the sound: Focus plays the selected binaural settings; either break plays local music. Switching modes stops the old source and prepares the new source for the next timer start while preserving Volume and mute state. Muting stops playback. Both binaural audio and break music continue when switching tabs. Browser or device suspension may still interrupt playback.

The home Focus sound panel has an enabled-by-default mute toggle, a compact selector for all built-in and custom sound presets, and an “edit presets” button opening the sound studio. During breaks, only the play/mute button appears. An always-visible control labeled Volume applies to both audio sources. Mute, the selected preset, and its sound settings are restored from localStorage after a reload; custom presets are also stored locally. A reload leaves the timer paused. Presets and volume are shared between pages, and navigation preserves the active audio graph. Changes made in the studio are available immediately on the timer page. Returning from a blind audition restores the main sound settings. The studio includes a Back to timer link on desktop and mobile.

### Break music and optional support invitation

Music is read from `packages/web/public/music` at Vite startup/build. Supported files (`.opus`, `.ogg`, `.mp3`, `.m4a`, `.aac`, `.wav`, `.flac`, `.webm`) start with a uniformly random song whenever music playback starts or resumes, then continue in filename order; the playlist wraps after the last song. Restart Vite after adding or removing songs. Files stay local and are copied into the production bundle. The provided Opus files require a browser that supports that format. Muting pauses music. Unmuting only restarts it when the timer is running, with a new random starting song. Volume remains a global output control, independent of presets.

Each newly started break has a 1-in-3 chance of showing an optional Buy Me a Coffee invitation after five seconds. Resume does not reroll the chance. A reset or mode change cancels a pending invitation; doing nothing dismisses the visible dialog after thirty seconds. Not now, the close button, and Escape also dismiss it. Only explicitly accepting opens `https://buymeacoffee.com/michaellorton` in a separate window/tab. The official cup logo is served locally; no third-party widget or tracking script is loaded. Source: [Buy Me a Coffee brand resources](https://buymeacoffee.com/brand).

## Sound studio controls

Each panel has a small chevron in its upper-right corner. Collapse it to retain only the header row; reopen it to restore its controls and draft values. Stereo waveform, Frequency relationship, Beat relationship, and Blind comparison start collapsed. Each panel remembers your choice across reloads in browser localStorage. Panels animate open and closed, with animations disabled when your system requests reduced motion. Collapsing a panel does not pause playback or reset an experiment.

- Carrier: 40–1500 Hz, logarithmic slider. Beat: 0–100 Hz in 0.1 Hz steps. Every continuous parameter also has numeric entry. Carrier/beat edits and independent ear edits remain synchronized. Reversing the ear frequency ordering is supported. To keep both oscillators positive, beat frequency is limited to `min(100, 2 × (carrier − 1))` at low carriers; sweeps apply the same constraint.
- Play/Pause preserves the sweep position. Tone nodes remain alive; frequency, gain, routing, and phase adjustments use audio parameter automation. Changing waveform fades briefly through silence.
- Sine is the cleanest stimulus. Triangle, square, and sawtooth add harmonics. Volume has conservative gain scaling; balance attenuates one side rather than boosting the other.
- Background noise is generated in memory. Each noise buffer is bounded and stereo; it is added downstream of the isolated tone routing.
- Binaural sends each oscillator to a separate ear. Monaural mixes half of each tone into each ear, creating physical beating. Isochronic sends one carrier frequency to both ears with an adjustable pulse duty cycle and depth. Its band-limited pulse oscillators run natively, including at fast rates.
- AM applies an independent sine envelope node to each channel. It is distinct from perceived binaural beating. Phase offset delays the right source by a fraction of its cycle; it does not change frequency. Channel swap exchanges the tone signals.
- Expand Frequency sweeps for start/end, duration, interpolation, repeat, and beat ping-pong controls. Automation is scheduled against `AudioContext.currentTime`; the JavaScript scheduler fills a lookahead queue. Log sweeps with a zero endpoint fall back to linear. Editing sweep or primary frequency settings restarts the sweep. Audio continues when hidden. After an audio-context interruption, pause and resume the timer (or press Play in the studio) to resume sound.
- Expand the waveform time-window control for 5–250 ms. Stereo plots read the actual routed tone outputs. The frequency plot is explicitly a schematic of the fundamental frequencies, omitting harmonics and noise; it is not a measured FFT. The beat plot spans one second and animates at the actual frequency difference. Displays do not measure brain activity.

## Presets and blind comparisons

Choose any built-in EEG-band example or the zero-beat control. Save experiment parameters under a custom name; select a saved preset to rename or delete it. Data is validated with Effect Schema when restored from localStorage. Restore defaults removes custom presets and resets the instrument. Storage denial or write failure produces a visible message and leaves session controls usable. Randomize generates a moderate carrier/difference combination. Master volume is a separate global listening control: loading or restoring presets, randomizing settings, capturing stimuli, and switching blind trials never change it. Older saved presets remain compatible; their stored master volume is ignored.

For blind comparisons, set A and B carrier/beat controls, or configure the main panel and **Capture current settings** to store any sound parameters in a stimulus. **New trial** randomly assigns A/B to X/Y. X and Y audition those assignments; **?** chooses an independently randomized hidden stimulus. Select which stimulus you think you heard to record a result and reveal the assignments. Reveal without guessing does not score a trial. The counter shows identification count and accuracy. Reset clears the score and assignments.

While blind playback is active, parameter and signal displays are obscured and removed from keyboard/accessibility navigation to avoid revealing the stimulus. Answering, revealing, or starting a new trial restores the main instrument settings. X/Y switching uses the same persistent audio graph and smoothing. This is informal experimentation, not a validated clinical or psychophysical test.

## Compatibility and safety

Targets current Chrome/Edge, Firefox, and Safari with native Web Audio and `AudioParam.cancelAndHoldAtTime`. Chrome is covered by automated browser tests; other browsers still require manual listening checks. Local development works on localhost; published assets should use HTTPS. A user gesture is always required to create/resume audio. Headphones are necessary for channel isolation to reach separate ears; speakers mix the tones acoustically. Browser and operating-system mono accessibility settings can override stereo delivery.

Begin quietly and take breaks. A software gain limit cannot account for the headphone amplifier or hardware volume. Stop if uncomfortable. EEG names classify frequency bands; they are not promises of brain entrainment or improved health. Evidence for sleep, attention, anxiety, and cognition benefits is mixed and limited. The automated measurements verify signal generation, not subjective binaural perception.

## Architecture

- `packages/shared/src`: calculations, sweep interpolation, routing matrices, branded preset IDs, and authoritative Effect schemas.
- `packages/web/src/audio.ts`: native audio infrastructure and persistent graph; no React dependencies.
- `packages/web/src/runtime.tsx`: injected Audio and Presets services, Layers, typed failures, scoped cleanup, and React runtime access.
- `packages/web/src/router.tsx`: TanStack Start router factory and application-lifetime runtime owner; disposes on actual teardown and development replacement, not provider remounts.
- `packages/web/src/Session.tsx`: a shared session provider above the routes; Effect Atom owns settings, playback state, presets, and master volume. `usePomodoro.ts` owns timer updates through the injected Effect clock.
- `packages/web/src/routes`: prerendered timer, sound studio, About article, and error page, with a shared React document shell.
- `packages/shared/src/timer.ts`: pure deadline, pause/resume, reset, completion, and time-formatting logic.
- `packages/web/src`: component-local React state; Effect Atom handles form state. Canvas animation uses requestAnimationFrame without audio-rate React renders.
- `tests`: Vitest/@effect/vitest and Playwright verification.

See [APPLICATION_SPEC.md](APPLICATION_SPEC.md) for LCS version choices and explicit local-only exceptions.

The sound studio’s Play audio button previews tones independently of the Pomodoro timer, including blind comparisons. Pause controls that preview. Returning to the timer restores timer-controlled playback, so a paused timer is silent.

## Deploy to binodoro.online

The root `alchemy.run.ts` builds the app and deploys it as a Cloudflare static-assets Worker named `binodoro-production`, with the custom domain `binodoro.online`. Client-side routes, including direct visits to `/controls`, fall back to the app. Audio, presets, and timer logic still run entirely in the browser.

Requirements: Bun, a Cloudflare account with the `binodoro.online` zone active in that account, and permission to manage Workers and custom domains. The script binds the existing domain; it does not purchase or register it.

Authenticate once, then deploy from the repository root:

```sh
bun install --frozen-lockfile
bun run alchemy login
bun run deploy
```

Choose Cloudflare when prompted during login. For noninteractive deployments, Alchemy also accepts `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment. Use a token scoped to the intended account and zone with Workers Scripts Write, Workers Routes Write for the domain’s zone, and Zone Read permissions (shown as Edit or Read in some token screens). See [Cloudflare’s Workers permissions guide](https://developers.cloudflare.com/workers/authorization/workers/). Keep credentials out of source files.

Alchemy keeps deployment state in the ignored `.alchemy/` directory. Retain that directory between deployments, or securely persist it in CI; do not discard it when updating an existing deployment. If using encrypted state, keep the same `ALCHEMY_PASSWORD` available on subsequent runs.

An optional preview stage deploys to its own workers.dev URL without claiming the production domain:

```sh
bun run alchemy deploy --stage preview
```

The deployment definition uses pinned Alchemy 0.94.0 APIs rather than the incompatible 2.0 beta API. No deployment is performed during `bun run build` or `bun run check`.

### Contact email forwarding

The About dialog links to `mailto:info@binodoro.online`. Provision forwarding to `malvoliosf+binodoro@gmail.com` with:

```sh
bun run deploy:email
```

This uses `alchemy.email.ts` and a separate `binodoro-email/production` state scope, so website deployments and preview stages do not change mail settings. The Cloudflare credential additionally needs account **Email Routing Addresses Write**, zone **Email Routing Rules Write**, **Zone Read**, and DNS access for `binodoro.online`. Retain this scope’s state just like the website state.

On the first run, Cloudflare may send a destination-verification email. Click its link in Gmail and rerun `bun run deploy:email`. Only a verified destination activates routing and the exact `info@` forwarding rule. Enabling Email Routing configures the domain’s MX/TXT records; an existing external mail provider’s MX records must be resolved before enabling it. This configures incoming forwarding, not outgoing mail from the domain.

Timer modes are clickable chevron steps below the dial. Start/Resume floats over the time, and the separate Pause control is disabled while stopped. Natural completion starts the next mode automatically as its transition tones play.

## Static rendering and SEO

TanStack Start prerenders the timer, sound studio, and About page directly from React. The About dialog and `/about` share one content component. Every indexable page includes its own title, description, canonical URL, and share metadata in the initial HTML. `robots.txt` points to Start's generated sitemap. The timer's tab title retains the product description while showing a running countdown.

`bun run build` generates `packages/web/dist/client`, type-checks the app, and verifies the output before reporting success. `dist/server` is used only during prerendering. Builds use the Node runtime required by Vite/Start (Node 22.12+ or a supported newer LTS); Bun remains the package manager and script runner. `bun run preview` serves the generated files locally at http://localhost:4173, including clean URLs and real 404 responses.

`bun run deploy` uses Alchemy to run this same verified build **before** uploading `dist/client` to Cloudflare. Missing pages or metadata stop deployment. Cloudflare redirects `.html` and trailing-slash variants to clean URLs and serves the generated error document with a 404 status. Preview stages are noindex; production uses `https://binodoro.online` as the canonical origin. The contact-email deployment remains separate.

Run `bun run test:e2e:static` to build and test the shipped site, including pages with JavaScript disabled. Run `bun run test:e2e` for the development suite, including native audio measurements that import development modules. Development tests use their own port, 5175. The three native module checks are skipped in the static suite; all user-facing timer, sound, and preset tests run in both suites.

The checked-in 1200×630 share image uses existing tomato artwork. Regenerate it with `bun run generate:social` after changing its React composition in `scripts/generate-social.tsx`; it is not generated during ordinary builds.

After deploying, verify `https://binodoro.online/` in Google Search Console, submit `https://binodoro.online/sitemap.xml`, and inspect `/`, `/about`, and `/controls` using URL Inspection. Confirm that the rendered text and canonical URL are correct and monitor indexing and Core Web Vitals as field data becomes available. These steps need the domain owner's Search Console access; the build does not submit anything to Google automatically.
