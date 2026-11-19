// ============================================
// DUMPSTER DIVING SIMULATOR: STATISTICS SCREEN
// A Chart.js demo. Chart.js draws the bars; one small plugin
// (further down) draws the pixel-art badges around them.
// ============================================

// ---- 1. THE DATA AND THE DESIGN COLOURS ----
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Legendary'];
const RARITY_COLORS = ['#8E8E8E', '#548AD2', '#DFB755', '#C659B3']; // Figma: Rarity/...
const START_COUNTS = [10, 4, 2, 1];                                  // the sample data

const INK = '#000000';
const DUST = '#AAAAAA';
const PAPER = '#D6D6D6';
const FONT = "'Silkscreen', 'Courier New', monospace";

// Elements on the page
const canvas = document.querySelector('#rarity-chart');
const itemsFound = document.querySelector('#items-found');
const summary = document.querySelector('#chart-summary');

// The chart is created inside this function. It is called at the very bottom of the file (section 5).
function startChart() {
  // Every chart on the page now uses the game's font and text colour
  Chart.defaults.font.family = FONT;
  Chart.defaults.color = PAPER;

  // ---- 2. CREATE THE CHART (this happens once) ----
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: RARITIES,
      datasets: [
        {
          label: 'Finds',
          data: [...START_COUNTS], // a copy, so START_COUNTS stays the original
          backgroundColor: RARITY_COLORS, // one colour per bar
          barThickness: 16,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: 'y', // 'y' turns the bars sideways: a horizontal bar chart
      responsive: true, // the chart follows the size of its wrapper...
      maintainAspectRatio: false, // ...and the wrapper decides the height
      animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 },
      layout: { padding: { left: 240, right: 62 } }, // room for the badges and counts (the plugin adjusts this on phones)
      plugins: {
        legend: { display: false }, // the badges already name each bar
        tooltip: {
          displayColors: false,
          backgroundColor: INK,
          borderColor: DUST,
          borderWidth: 2,
          cornerRadius: 0,
          callbacks: { label: (item) => `${item.parsed.x} found` },
        },
      },
      scales: {
        // The Figma design has no axis lines or numbers, so both axes are hidden.
        // suggestedMax: 10 keeps the bars' length the same as the design until a count passes 10.
        x: { display: false, min: 0, suggestedMax: 10 },
        y: { display: false },
      },
    },
    plugins: [pixelStyle],
  });

  // ---- 3. UPDATE THE CHART (this happens on every click) ----
  function addFind(index) {
    chart.data.datasets[0].data[index] += 1; // 1. change the data
    chart.update();                           // 2. tell the SAME chart to redraw
    showTotal();                              // 3. update the number and the sentence
  }

  // Add up the chart's own data, so the page and the chart can never disagree
  function showTotal() {
    const counts = chart.data.datasets[0].data;
    const total = counts.reduce((sum, count) => sum + count, 0);
    itemsFound.textContent = total;
    summary.textContent =
      RARITIES.map((name, i) => `${name} ${counts[i]}`).join(', ') + `. ${total} items found.`;
  }

  document.querySelectorAll('.test-button').forEach((button) => {
    button.addEventListener('click', () => addFind(Number(button.dataset.index)));
  });

  document.querySelector('#reset-button').addEventListener('click', () => {
    chart.data.datasets[0].data = [...START_COUNTS];
    chart.update();
    showTotal();
  });

  // ---- 4. FONT FIX ----
  // A <canvas> draws text once. If Silkscreen finishes loading AFTER the first draw,
  // the canvas keeps the fallback font until we redraw it.
  Promise.all([document.fonts.load(`700 16px Silkscreen`), document.fonts.load(`400 16px Silkscreen`)])
    .then(() => chart.update('none'))
    .catch(() => {}); // if the font can't load, the fallback font is fine

  showTotal();
  window.rarityChart = chart; // handy for the console: try rarityChart.data.datasets[0].data
}

// ============================================
// THE PLUGIN: pixel-art tracks, badges and counts
// A Chart.js plugin is an object with functions that Chart.js calls at set moments while drawing.
// Chart.js still draws the bars; this only adds the Figma design's decoration around them.
// ============================================
const pixelStyle = {
  id: 'pixelStyle',

  // Before Chart.js works out the layout: leave room on the left for the badges and on the right for "x10".
  // Phones get less room and a smaller font.
  beforeLayout(chart) {
    const small = chart.width < 540;
    chart.options.layout.padding = small ? { left: 164, right: 56 } : { left: 240, right: 62 };
  },

  // Before the bars are drawn: the black "track" behind each bar, with its grey 4px border
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    chart.getDatasetMeta(0).data.forEach((bar) => {
      ctx.fillStyle = DUST;
      ctx.fillRect(chartArea.left - 4, bar.y - 12, chartArea.width + 8, 24);
      ctx.fillStyle = INK;
      ctx.fillRect(chartArea.left, bar.y - 8, chartArea.width, 16);
    });
  },

  // After the bars are drawn: the rarity badge on the left and the count ("x10") on the right
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, data } = chart;
    const fontSize = chart.width < 540 ? 12 : 16;

    ctx.save();
    ctx.font = `700 ${fontSize}px ${FONT}`;
    ctx.textBaseline = 'middle';

    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const name = data.labels[i].toUpperCase();
      const badgeWidth = 28 + ctx.measureText(name).width + 16; // pip + text + padding
      const top = bar.y - 24;

      // Badge: ink border, rarity colour inside, a small square "pip", then the name
      ctx.fillStyle = INK;
      ctx.fillRect(0, top, badgeWidth, 48);
      ctx.fillStyle = data.datasets[0].backgroundColor[i];
      ctx.fillRect(4, top + 4, badgeWidth - 8, 40);
      ctx.fillStyle = INK;
      ctx.fillRect(16, bar.y - 4, 8, 8);
      ctx.fillText(name, 28, bar.y);

      // Count, to the right of the track
      ctx.fillStyle = PAPER;
      ctx.fillText(`x${data.datasets[0].data[i]}`, chartArea.right + 20, bar.y);
    });

    ctx.restore();
  },
};

// ============================================
// 5. START
// This is at the bottom on purpose: the plugin above has to exist before startChart() uses it.
// If the CDN is blocked (no internet), Chart is not defined. Say so instead of crashing.
// ============================================
if (typeof Chart === 'undefined') {
  document.querySelector('.chart-wrap').innerHTML =
    '<p class="chart-error">CHART.JS DID NOT LOAD. CHECK YOUR INTERNET CONNECTION.</p>';
  document.querySelectorAll('.pixel-button').forEach((button) => (button.disabled = true));
} else {
  startChart();
}
