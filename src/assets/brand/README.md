# LInC brand assets

Place approved LInC visual identity files in this directory. These files are bundled by Vite and committed with the frontend source.

## Preferred filenames

- `linc-logo-primary.png` — approved complete primary logo currently used by the website
- `linc-logo-primary.svg` — preferred future vector version when an approved SVG becomes available
- `linc-logo-mark.svg` — symbol or icon without the wordmark
- `linc-logo-reversed.svg` — light version for dark backgrounds, when required

## Naming rules

- Use lowercase kebab-case filenames.
- Do not use spaces, dates, or names such as `final`, `new`, or `v2`.
- Prefer SVG with a valid `viewBox` and transparent background.
- Keep the original aspect ratio and do not add decorative padding around the artwork.

The shared `LincLogo` component is the single frontend integration point. Update that component if the approved primary artwork changes in the future.
