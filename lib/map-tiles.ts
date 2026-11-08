import type { Map as LeafletMap, TileLayer } from "leaflet";

export type BasemapStatus = "loading" | "ready" | "error";

const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
const providers = [
  { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution },
  {
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: `${attribution} &middot; <a href="https://www.openstreetmap.de/">FOSSGIS</a>`,
  },
];

/** Keep overlays intact while recovering from a failed or stalled basemap. */
export function installMapTiles(
  L: Pick<typeof import("leaflet"), "tileLayer">,
  map: LeafletMap,
  onStatus: (status: BasemapStatus) => void,
  timeoutMs = 6_000,
) {
  let layer: TileLayer | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let disposed = false;

  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function loadProvider(index: number) {
    if (disposed) return;
    const attempt = ++generation;
    clearTimer();
    layer?.remove();
    layer?.off();
    let failed = false;
    const current = L.tileLayer(providers[index].url, {
      maxZoom: 19,
      attribution: providers[index].attribution,
    });
    layer = current;
    onStatus("loading");

    function fail() {
      if (disposed || generation !== attempt || failed) return;
      failed = true;
      clearTimer();
      if (index + 1 < providers.length) {
        // Leave the tile event stack before replacing Leaflet's current layer.
        queueMicrotask(() => {
          if (!disposed && generation === attempt) loadProvider(index + 1);
        });
      } else onStatus("error");
    }

    current.on("tileerror", fail);
    current.on("loading", () => {
      if (disposed || generation !== attempt || failed) return;
      clearTimer();
      timer = setTimeout(fail, timeoutMs);
      onStatus("loading");
    });
    current.on("tileload", () => {
      if (disposed || generation !== attempt || failed) return;
      clearTimer();
      onStatus("ready");
    });
    timer = setTimeout(fail, timeoutMs);
    current.addTo(map);
  }

  loadProvider(0);
  return {
    retry() {
      loadProvider(0);
    },
    destroy() {
      disposed = true;
      generation++;
      clearTimer();
      layer?.remove();
      layer?.off();
      layer = null;
    },
  };
}
