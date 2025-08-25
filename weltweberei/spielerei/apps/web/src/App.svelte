<script>
  import { onMount } from 'svelte';
  let mapDiv;
  onMount(async () => {
    const maplibregl = await import('maplibre-gl');
    const map = new maplibregl.Map({
      container: mapDiv,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [10.0, 51.0],
      zoom: 4
    });
    // TODO: Garnrollen, Fäden, Knoten aus API
  });
</script>

<main>
  <header>
    <h1>Weltgewebe</h1>
    <p>Mobile-First Karte mit MapLibre (Demo)</p>
  </header>
  <div bind:this={mapDiv} class="map"></div>
</main>
