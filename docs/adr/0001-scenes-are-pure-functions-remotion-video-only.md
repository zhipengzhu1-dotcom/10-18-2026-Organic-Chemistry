# Scenes are pure functions of time and state; Remotion is only the video renderer

Every Scene must play interactively on the site and also render to video for the future YouTube channel. So a Scene is a pure React component of `(t, state)`: all motion is computed from those two inputs, with no `useFrame`, timers, CSS transitions or unseeded randomness. On the site, our own small clock drives `t`, so the site ships no Remotion code. A separate `video/` workspace wraps the same Scenes in Remotion compositions to render MP4s.

## Considered Options

- **Remotion `<Player>` on the site**: simplest, but embedding it can fall under Remotion's paid "Automators" licence, and it ties every Scene to one vendor.
- **Motion Canvas / Revideo, Rive, Lottie, Manim**: rejected because each is 2D-only, not React, or authored in a GUI editor that agents can't drive.

## Consequences

Remotion stays replaceable: the same pure Scenes can be rendered by Revideo or by Playwright frame capture plus ffmpeg. The "no free-running animation" rule must be enforced in review and in CI (one video frame per Scene is rendered on every change).
