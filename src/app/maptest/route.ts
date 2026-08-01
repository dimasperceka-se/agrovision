// Halaman diagnostik MANDIRI untuk isolasi bug "plot tak tampil".
// Tanpa React/komponen aplikasi — MapLibre dimuat langsung dari CDN, mengambil
// /api/plots/geojson (cookie sesi ikut karena same-origin), menggambar plot
// MERAH, lalu MELAPORKAN berapa fitur yang benar-benar ter-render
// (queryRenderedFeatures). Buka /maptest saat sudah login.
//
// Hapus route ini setelah bug map selesai.

export async function GET() {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Map test — plot render</title>
<link href="https://unpkg.com/maplibre-gl@6.0.0/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html,body{margin:0;height:100%} #map{position:absolute;inset:0}
  #log{position:absolute;z-index:9;top:10px;left:10px;right:10px;background:rgba(0,0,0,.82);
       color:#e2e8f0;padding:10px 12px;font:13px ui-monospace,monospace;border-radius:8px;white-space:pre-wrap}
</style>
</head>
<body>
<div id="map"></div>
<div id="log">memuat MapLibre…</div>
<script type="module">
  const el = document.getElementById('log');
  const lines = [];
  const log = (m) => { lines.push(m); el.textContent = lines.join('\\n'); };
  window.addEventListener('error', (e) => log('window.error: ' + (e.message || e.type)));
  window.addEventListener('unhandledrejection', (e) => log('promise.reject: ' + (e.reason && e.reason.message || e.reason)));
  try {
    const maplibregl = await import('https://unpkg.com/maplibre-gl@6.0.0/dist/maplibre-gl.mjs');
    if (!maplibregl.Map) { log('MapLibre dimuat tapi tak ada export Map. keys: ' + Object.keys(maplibregl).slice(0, 12).join(',')); return; }
    log('MapLibre dimuat OK (v' + (maplibregl.getVersion ? maplibregl.getVersion() : '6') + ')');
    const map = new maplibregl.Map({
      container: 'map',
      style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
               layers: [ { id: 'bg', type: 'background', paint: { 'background-color': '#111827' } }, { id: 'osm', type: 'raster', source: 'osm' } ] },
      center: [114.205, -1.858], zoom: 13,
    });
    map.on('error', (e) => log('map.error: ' + (e.error && e.error.message || e.type)));
    map.on('load', async () => {
      log('map load OK; mengambil /api/plots/geojson…');
      let fc;
      try {
        const r = await fetch('/api/plots/geojson', { credentials: 'same-origin' });
        log('fetch status ' + r.status);
        if (!r.ok) { log('GAGAL: endpoint ' + r.status + ' (mungkin belum login / tak ada akses)'); return; }
        fc = await r.json();
      } catch (err) { log('fetch error: ' + err.message); return; }
      const n = (fc.features || []).length;
      log('fitur diterima: ' + n);
      if (!n) { log('KESIMPULAN: endpoint mengembalikan 0 plot untuk sesi ini (masalah data/scope).'); return; }

      map.addSource('plots', { type: 'geojson', data: fc });
      map.addLayer({ id: 'p-fill', type: 'fill', source: 'plots', paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.6 } });
      map.addLayer({ id: 'p-line', type: 'line', source: 'plots', paint: { 'line-color': '#22d3ee', 'line-width': 3 } });

      const b = new maplibregl.LngLatBounds();
      for (const f of fc.features) {
        const g = f.geometry; if (!g) continue;
        const cc = g.type === 'MultiPolygon' ? g.coordinates.flat(2) : g.coordinates.flat(1);
        for (const c of cc) if (Array.isArray(c)) b.extend(c);
      }
      if (!b.isEmpty()) map.fitBounds(b, { padding: 40, maxZoom: 16, duration: 0 });
      log('plot digambar MERAH. Menunggu render selesai…');

      map.once('idle', () => {
        const rendered = map.queryRenderedFeatures({ layers: ['p-fill'] });
        log('=== HASIL ===');
        log(n + ' plot dimuat, ' + rendered.length + ' fitur TER-RENDER di layar.');
        if (rendered.length > 0) log('✅ MapLibre BISA menggambar plot di browser ini. Bug ada di komponen aplikasi.');
        else log('❌ MapLibre TIDAK menggambar plot walau data ada. Masalah render/WebGL/geometri, bukan komponen app.');
      });
    });
  } catch (err) { log('gagal memuat MapLibre: ' + (err && err.message || err)); }
</script>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
