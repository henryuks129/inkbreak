# Inkbreak design contract
Experience mode. The 3D arena is the first viewport. Warm concrete, deep forest HUD surfaces, electric cyan and hot coral ink, yellow action accents. Trebuchet MS for readable controls, Barlow Condensed heavy italic for expressive titles. Original skinned characters and procedural arenas, readable paint and silhouettes.

Tokens: background #14241f; panel #19352c; foreground #f6f4dc; muted #b9c8b5; cyan #20ddcf; coral #ff595e; action #e4ff62. Focus: 3px action outline, 4px offset. UI radii 12px; small controls 999px. Gameplay camera and movement are damped; HUD state transitions 180ms cubic-bezier(.16,1,.3,1). Reduced-motion disables UI entrances and camera shake.

Menu: mode and class selection beside a live arena preview; four authored map thumbnails. Turf Clash keeps timer, coverage, tank/health, ability and reticle visible. Squad Assault adds five fighter slots and bunker/core health while keeping the arena readable. Settings and instructions are collapsed. Narrow screens show a keyboard/mouse requirement while preserving arena browsing.

No landing-page AIDA, scroll pinning, bento sections, or decorative blur over gameplay. Graphics presets expose resolution scale and shadows separately. Only one arena's resources stay loaded.
