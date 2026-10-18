# Movement and visual revision

User feedback: both design and controls felt unlike the requested responsive console ink-shooter experience.

Implemented faster acceleration and braking, jump buffering and coyote timing, immediate mouse aim with a steadier follow pivot, independent character turning, C camera recenter and J keyboard fire. The avatar now has rounded athletic proportions, expressive goggles, ink fins and a distinct animated ink-ray swim form. The HUD uses compact high-contrast sports graphics; pause overlays no longer blur the entire WebGL view.

Camera and aim collision queries use inexpensive gameplay collision proxies rather than recursively testing all decorative world geometry. Automatic rendering resolution decreases under sustained slow frame times; diagnostics expose its current multiplier. This does not guarantee any target FPS.

The pre-revision browser accessibility snapshot showed 15 FPS / 67.9 ms on Ultra while paused. This was not a controlled gameplay benchmark. A pause screenshot was inspected, but subsequent browser interaction timed out and the Chrome connection became unavailable. Revised visuals, gameplay feel and frame rates remain unverified in a live browser.

The revision retains four arenas, standalone hosting and original assets. Start.ng integration waits for Team Cybertron's real platform contract. Controller and multiplayer support remain future scope.
