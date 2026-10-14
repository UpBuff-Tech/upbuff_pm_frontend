// Chart helpers shared by the admin and the director dashboard. ApexCharts (v3.28) is a global (script tag).

// Colours. Status colours carry meaning (amber pending, indigo in progress, cyan testing,
// green completed, slate on hold); SERIES are for identity only. Validated for colour-blind
// separation against the white card surface.
export const CHART_COLORS = {
  primary: '#4f46e5',
  cyan: '#0891b2',
  orange: '#eb6834',
  green: '#16a34a',
  amber: '#d97706',
  slate: '#64748b',
  red: '#dc2626',
  text: '#0f172a',
  muted: '#64748b',
  grid: '#eef2f6',
  surface: '#ffffff',
};

/** Plain-object deep merge (arrays are replaced, not merged). */
function merge(target, source) {
  const out = { ...target };
  Object.keys(source || {}).forEach((key) => {
    const value = source[key];
    out[key] = value && typeof value === 'object' && !Array.isArray(value) && typeof value !== 'function'
      ? merge(target[key] || {}, value)
      : value;
  });
  return out;
}

/** The look every dashboard chart shares; per-chart options are merged on top. */
export function chartOptions(options) {
  return merge({
    chart: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      foreColor: CHART_COLORS.muted,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeout', speed: 500, animateGradually: { enabled: false } },
      parentHeightOffset: 0,
    },
    grid: {
      borderColor: CHART_COLORS.grid,
      strokeDashArray: 0,
      padding: { left: 8, right: 8, top: -8, bottom: 0 },
      xaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    legend: {
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: CHART_COLORS.text },
      markers: { width: 8, height: 8, radius: 8, offsetX: -2 },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    tooltip: {
      theme: 'light',
      style: { fontSize: '12px' },
      marker: { show: true },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
    },
    states: {
      hover: { filter: { type: 'darken', value: 0.92 } },
      active: { filter: { type: 'none' } },
    },
  }, options);
}

/**
 * Draws a chart in the element found by the selector (nothing when the element is not there).
 */
export function renderChart(selector, options) {
  const chartEl = document.querySelector(selector);
  if (!chartEl) return null;

  // Clear previous chart
  chartEl.innerHTML = '';

  const chart = new ApexCharts(chartEl, chartOptions(options));
  chart.render();
  return chart;
}

/**
 * The options all status donut charts of the dashboards share: a slim ring with the total in
 * the middle and the counts in the legend (no percentage printed on every slice).
 */
export function donutChartOptions(series, labels, colors, totalLabel, height) {
  return {
    series: series,
    chart: {
      type: 'donut',
      height: height
    },
    labels: labels,
    colors: colors,
    stroke: { width: 2, colors: [CHART_COLORS.surface] },
    legend: {
      position: 'bottom',
      formatter: function (name, opts) {
        return name + '  <strong style="color:' + CHART_COLORS.text + '">' + opts.w.globals.series[opts.seriesIndex] + '</strong>';
      }
    },
    dataLabels: { enabled: false },
    tooltip: { fillSeriesColor: false },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '74%',
          labels: {
            show: true,
            name: { fontSize: '12px', color: CHART_COLORS.muted, offsetY: 18 },
            value: { fontSize: '26px', fontWeight: 700, color: CHART_COLORS.text, offsetY: -14 },
            total: {
              show: true,
              label: totalLabel,
              fontSize: '12px',
              color: CHART_COLORS.muted,
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            }
          }
        }
      }
    }
  };
}

/** A tiny trend line for a KPI tile (no axes, no grid). */
export function sparklineOptions(data, color, label) {
  return {
    series: [{ name: label, data: data }],
    chart: { type: 'area', height: 48, sparkline: { enabled: true } },
    colors: [color],
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0, stops: [0, 100] } },
    tooltip: {
      x: { show: false },
      y: { title: { formatter: () => label + ': ' } },
      marker: { show: false },
    },
  };
}
