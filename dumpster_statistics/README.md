# Dumpster Diving Simulator: Statistics (Chart.js demo)

One page that rebuilds the **Statistics** screen from the Figma Asset Library and uses **Chart.js** to draw the
**FINDS BY RARITY** horizontal bar chart. Four test buttons add finds so you can show the chart changing live.
Nothing else from the game is built.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Loads Silkscreen (Google Fonts) and Chart.js 4.5.1 (jsDelivr CDN), then `script.js`. |
| `style.css` | The Figma design tokens (palette, rarity colours, type, hard shadow) and the layout. |
| `script.js` | Creates the chart once, updates it on every click. About 80 lines of real logic plus the plugin. |
| `assets/alley-background.svg` | The alley background, rebuilt from the `alley-background` component in the Figma file. |

## Run it

1. Unzip the folder and open it in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. An internet connection is needed, because Chart.js and the font come from CDNs.

(There is no `fetch()` in this page, so double-clicking `index.html` also works.
If you don't use Live Server: `python3 -m http.server`, then open http://localhost:8000.)

## How Chart.js is initialised

1. `index.html` loads the library with a `<script>` tag **before** `script.js`, so `Chart` exists when our code runs.
   The version is pinned (`@4.5.1`) so it cannot change under us.
2. `script.js` first checks `typeof Chart === 'undefined'`. If the CDN is blocked, the page says so instead of crashing.
3. Once, inside `startChart()`, it calls `new Chart(canvas, config)`. The config has three parts:
   - `type: 'bar'` plus `indexAxis: 'y'`. This is what makes the bars horizontal.
   - `data`: `labels` (`Common`, `Uncommon`, `Rare`, `Legendary`) and one dataset whose `data` is `[10, 4, 2, 1]`.
     `backgroundColor` is an array of the four rarity colours from the design system, one per bar.
   - `options`: responsive canvas, hidden axes (the design has none), no legend, a styled tooltip.
4. The chart is kept in a variable (`chart`) so it can be updated later.

## How the chart is updated

```js
function addFind(index) {
  chart.data.datasets[0].data[index] += 1;  // 1. change the data
  chart.update();                           // 2. redraw the SAME chart
  showTotal();                              // 3. update ITEMS FOUND
}
```

- The chart's own `data` array is the **only** copy of the counts. `showTotal()` adds that array up, so the
  ITEMS FOUND number and the chart cannot disagree.
- `chart.update()` redraws the existing chart with a short animation. The chart is never destroyed and recreated.
  (In the console, `Object.keys(Chart.instances).length` stays `1` and `rarityChart.id` never changes.)
- The x-axis uses `suggestedMax: 10`. Bars fill the track at 10 (as in the design). When a count passes 10, Chart.js
  grows the axis by itself, and every bar shrinks to stay in proportion.
- **RESET DEMO** (in the spot where the Figma screen has its back button) replaces the data with a fresh copy of
  `[10, 4, 2, 1]` and calls `update()` again.

## Implementation difficulties and limitations

**The real technical challenge: a chart is a picture, so CSS can't style it.**
The Figma design has pixel-art rarity badges, black tracks with grey borders, and `x10` counts. Chart.js draws
onto a `<canvas>`, so none of that can be done with CSS. Options I considered:

1. Use Chart.js's built-in labels. Plain text on the axis, so the pixel-art look is lost.
2. Put HTML badges next to the canvas. They would drift out of line with the bars whenever the chart resizes.
3. **A small Chart.js plugin** (what I used). A plugin is an object with functions Chart.js calls at set moments:
   `beforeLayout`, `beforeDatasetsDraw`, `afterDatasetsDraw`. Each one asks the chart where the bars are
   (`getDatasetMeta(0).data`, each bar has `.y`) and draws the track, badge and count at those positions.
   Chart.js still draws the bars. The badge colours are read from the dataset's own `backgroundColor`, so the
   plugin never has its own copy of the data.

**Smaller issues I solved:**

- **Canvas text and web fonts.** A canvas draws text once. Silkscreen loads from Google Fonts, so it can arrive
  *after* the first draw, and the canvas would keep the fallback font. Fix: `document.fonts.load(...)`, then
  `chart.update('none')` to redraw.
- **Phones.** Chart.js can't use CSS media queries for canvas padding. `beforeLayout` checks `chart.width` and
  gives the badges and counts less room on small screens.
- **Axis growing.** With a fixed axis, an 11th Common find would run off the track. `suggestedMax` solves it.

**Limitations (honest list):**

- The other statistics (DIVES TAKEN 14, COLLECTION 10 / 20, TOTAL SCORE 330, BEST FIND) are the sample values from
  the Figma screen. Only ITEMS FOUND and the chart are connected to the data.
- The Figma file's text nodes don't carry resolved font names, so I took the font (Silkscreen Bold/Regular) from the
  design system's text styles (`Type/...`), which is what the design is built from.
- Contrast: I measured the design's colours. Panel text, the yellow values and the badge text all pass WCAG AA
  (4.7:1 to 11:1). The `Paper` text on the green `Dumpster` button is 3.3:1, and 2.2:1 on hover (`Bottle`),
  below the 4.5:1 AA needs for normal text. I left it exactly as designed. Easy to fix later by darkening the
  button or making its text larger.
- Opening the page offline works for the layout, but the chart and font need the internet (CDNs).
