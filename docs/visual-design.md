# Visual design and feedback

- Colours are CSS variables on `:root` in `src/app/globals.css`; fonts are the system stack (no hosted assets).
- Focus indicators are a 3px yellow outline; text meets WCAG 2.2 AA contrast on the dark background.
- Snakes: P1 blue with centre-dot body pattern, P2 orange with bar pattern; heads are labelled "1" / "2". Answer tiles show the value and "P1"/"P2".
- Feedback (correct, incorrect, collision) appears as text in the player's panel, which carries `data-feedback="correct|incorrect|collision"`. A collision also draws a steady red outline around that snake only. Nothing is drawn over the board.
- Reduced motion: `useReducedMotion` sets `data-reduced-motion="true|false"` on the game element; the CSS media query disables all animations. Text feedback stays.
