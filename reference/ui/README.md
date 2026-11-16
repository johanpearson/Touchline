# UI reference boards

Design boards for the UI overhaul (milestone "M5c UI overhaul"). They are the visual target; docs/design.md holds the binding decisions.

## Boards

| File | Screen |
|---|---|
| Welcome.dc.html | Start screen: continue, new career, load career |
| LeaguePicker.dc.html | New career, step 1: pick a league |
| ClubPicker.dc.html | New career, step 2: pick a club (crest, kits, club strip) |
| Main.dc.html | Home with sidebar navigation (Midnight theme) |
| MainLight.dc.html | Home in the Light theme (renders Main with scheme "Light") |
| Squad.dc.html | Squad table (density option) |
| Match.dc.html | Match screen, desktop |
| PhoneHome.dc.html | Home on a phone, bottom tab bar |
| PhoneMatch.dc.html | Match screen on a phone, tabs |

## How to read the format

These files are not runnable on their own; they need the design tool's runtime (`support.js`). Read them as specs:

- The markup inside `<x-dc>` is the layout. Sizes, spacing, radii, fonts and colours are in the inline `style` attributes.
- `{{name}}` placeholders are filled from `renderVals()` in the `<script type="text/x-dc">` block at the bottom. That block also holds the sample data and computed styles.
- `<sc-for list="{{items}}" as="item">` repeats its content per item; `<sc-if value="{{flag}}">` shows it conditionally.
- Theme tokens: the `SCHEMES` object (or `schemes`) in each script has the colour values for Midnight, Graphite and Light. `p.bg`, `p.surface`, `p.text` and so on in the markup refer to it.
- `data-props` on the script tag lists the design options (scheme, accent, density, club colour) and their defaults.
- Sample clubs, players and numbers are placeholders, not game data.

Do not import these files into the app. Rebuild the screens with the project's components and tokens.
