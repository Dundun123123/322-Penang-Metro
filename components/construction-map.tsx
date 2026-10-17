"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { ConstructionRoutes, RoutePoint } from "@/lib/route-path";

type Labels = {
  help: string;
  undo: string;
  clear: string;
  start: string;
  end: string;
  branch?: string;
  branches?: string;
  addBranch?: string;
  empty?: string;
  search?: string;
  searchPlaceholder?: string;
  searching?: string;
  noResults?: string;
};

type Props = {
  routes: ConstructionRoutes;
  editable?: boolean;
  searchable?: boolean;
  initialQuery?: string;
  latitude?: string | null;
  longitude?: string | null;
  onChange?: (routes: ConstructionRoutes) => void;
  labels?: Labels;
};

type SearchResult = { name: string; lat: number; lng: number; type: string };

function showRoutes(
  L: typeof import("leaflet"),
  instance: LeafletMap,
  group: LayerGroup,
  routes: ConstructionRoutes,
  labels: Labels | undefined,
  activeBranch: number,
  editable: boolean,
  focus: boolean,
) {
  group.clearLayers();
  routes.forEach((points, branchIndex) => {
    const active = !editable || branchIndex === activeBranch;
    if (points.length > 1) {
      L.polyline(points, {
        color: "#c74b24",
        weight: active ? 10 : 8,
        opacity: active ? 0.95 : 0.7,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
      L.polyline(points, {
        color: "#ffd56a",
        weight: 3,
        opacity: active ? 0.95 : 0.7,
        dashArray: "8 10",
        lineCap: "round",
      }).addTo(group);
    }
    points.forEach((point, pointIndex) => {
      const first = pointIndex === 0;
      const last = pointIndex === points.length - 1;
      L.circleMarker(point, {
        radius: first || last ? 8 : 4,
        color: "#ffffff",
        weight: first || last ? 3 : 1,
        fillColor: first ? "#087f83" : last ? "#c74b24" : "#ffd56a",
        fillOpacity: active ? 1 : 0.78,
      })
        .addTo(group)
        .bindTooltip(
          `${labels?.branch || "Section"} ${branchIndex + 1}: ${first ? labels?.start || "Start" : last ? labels?.end || "End" : pointIndex + 1}`,
        );
    });
  });
  if (!focus) return;
  const allPoints = routes.flat();
  if (allPoints.length > 1)
    instance.fitBounds(L.latLngBounds(allPoints), {
      padding: [35, 35],
      maxZoom: 17,
      animate: false,
    });
  else if (allPoints.length === 1) instance.setView(allPoints[0], 17, { animate: false });
}

export default function ConstructionMap({
  routes,
  editable = false,
  searchable = false,
  initialQuery = "",
  latitude,
  longitude,
  onChange,
  labels,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const drawings = useRef<LayerGroup | null>(null);
  const routesRef = useRef(routes);
  const changeRef = useRef(onChange);
  const labelsRef = useRef(labels);
  const activeBranchRef = useRef(0);
  const initialCoordinates = useRef({ latitude, longitude });
  const [ready, setReady] = useState(false);
  const [activeBranch, setActiveBranch] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const selectedBranch = Math.min(activeBranch, Math.max(routes.length - 1, 0));
  const routeKey = JSON.stringify(routes);

  useEffect(() => {
    routesRef.current = routes;
    changeRef.current = onChange;
    labelsRef.current = labels;
    activeBranchRef.current = selectedBranch;
  }, [routes, onChange, labels, selectedBranch]);

  useEffect(() => {
    if (!container.current || map.current) return;
    let active = true;
    import("leaflet").then((L) => {
      if (!active || !container.current) return;
      const first = routesRef.current.flat()[0];
      const { latitude: initialLatitude, longitude: initialLongitude } = initialCoordinates.current;
      const hasCoordinates = Boolean(initialLatitude?.trim() && initialLongitude?.trim());
      const lat = Number(initialLatitude),
        lng = Number(initialLongitude);
      const centre: RoutePoint =
        first ||
        (hasCoordinates && Number.isFinite(lat) && Number.isFinite(lng)
          ? [lat, lng]
          : [5.4141, 100.3288]);
      const instance = L.map(container.current, { scrollWheelZoom: false }).setView(
        centre,
        first ? 16 : 13,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(instance);
      const group = L.layerGroup().addTo(instance);
      if (editable)
        instance.on("click", (event) => {
          const point: RoutePoint = [
            Number(event.latlng.lat.toFixed(6)),
            Number(event.latlng.lng.toFixed(6)),
          ];
          const next = routesRef.current.map((branch) => [...branch]);
          const index = Math.min(activeBranchRef.current, next.length);
          if (index === next.length) next.push([]);
          next[index].push(point);
          changeRef.current?.(next);
        });
      map.current = instance;
      drawings.current = group;
      showRoutes(
        L,
        instance,
        group,
        routesRef.current,
        labelsRef.current,
        activeBranchRef.current,
        editable,
        true,
      );
      requestAnimationFrame(() => {
        if (active && map.current === instance) {
          instance.invalidateSize();
          showRoutes(
            L,
            instance,
            group,
            routesRef.current,
            labelsRef.current,
            activeBranchRef.current,
            editable,
            true,
          );
        }
      });
      setReady(true);
    });
    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
      drawings.current = null;
    };
  }, [editable]);

  useEffect(() => {
    if (!ready || !map.current || !drawings.current) return;
    import("leaflet").then((L) => {
      if (map.current && drawings.current)
        showRoutes(
          L,
          map.current,
          drawings.current,
          routesRef.current,
          labelsRef.current,
          activeBranchRef.current,
          editable,
          !editable,
        );
    });
  }, [selectedBranch, editable, labels?.branch, labels?.end, labels?.start, ready, routeKey]);

  useEffect(() => {
    if (!ready || routesRef.current.flat().length || !latitude?.trim() || !longitude?.trim())
      return;
    const lat = Number(latitude),
      lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.current?.setView([lat, lng], 17);
  }, [latitude, longitude, ready, routeKey]);

  async function search() {
    if (query.trim().length < 3) return;
    setSearching(true);
    setSearchMessage("");
    setResults([]);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
      if (!data.results?.length) setSearchMessage(labels?.noResults || "No matching place found");
    } catch (error) {
      setSearchMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(result: SearchResult) {
    map.current?.setView([result.lat, result.lng], 17, { animate: true });
    setResults([]);
    setQuery(result.name);
  }

  function addBranch() {
    if (routes.length >= 12) return;
    const index = routes.length;
    setActiveBranch(index);
    onChange?.([...routes, []]);
  }

  function undoPoint() {
    if (!routes[selectedBranch]?.length) return;
    onChange?.(
      routes.map((branch, index) => (index === selectedBranch ? branch.slice(0, -1) : branch)),
    );
  }

  function removeBranch() {
    if (!routes.length) return;
    const next = routes.filter((_, index) => index !== selectedBranch);
    setActiveBranch(Math.min(selectedBranch, Math.max(next.length - 1, 0)));
    onChange?.(next);
  }

  return (
    <div className={`route-map-shell${editable ? " is-editable" : ""}`}>
      {searchable && (
        <div className="route-map-search">
          <div className="route-map-search-controls">
            <input
              aria-label={labels?.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void search();
                }
              }}
              placeholder={labels?.searchPlaceholder}
              minLength={3}
            />
            <button
              type="button"
              onClick={() => void search()}
              disabled={searching || query.trim().length < 3}
            >
              {searching ? labels?.searching : labels?.search}
            </button>
          </div>
          {searchMessage && <p className="route-map-message">{searchMessage}</p>}
          {results.length > 0 && (
            <ul>
              {results.map((result, index) => (
                <li key={`${result.lat}-${result.lng}-${index}`}>
                  <button type="button" onClick={() => chooseResult(result)}>
                    <b>{result.name.split(",")[0]}</b>
                    <span>{result.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {editable && (
        <div
          className="route-branch-bar"
          role="group"
          aria-label={labels?.branches || "Construction sections"}
        >
          {routes.length ? (
            routes.map((branch, index) => (
              <button
                key={index}
                type="button"
                className={selectedBranch === index ? "route-branch active" : "route-branch"}
                aria-pressed={selectedBranch === index}
                onClick={() => setActiveBranch(index)}
              >
                {labels?.branch || "Section"} {index + 1}
                <small>{branch.length}</small>
              </button>
            ))
          ) : (
            <span className="route-branch-empty">{labels?.empty || "No section drawn yet"}</span>
          )}
          <button
            type="button"
            className="route-add-branch"
            disabled={routes.length >= 12}
            onClick={addBranch}
          >
            + {labels?.addBranch || "Add section"}
          </button>
        </div>
      )}
      <div ref={container} className="route-map-canvas" />
      {editable && (
        <div className="route-map-tools">
          <p>{labels?.help}</p>
          <div>
            <button type="button" disabled={!routes[selectedBranch]?.length} onClick={undoPoint}>
              {labels?.undo}
            </button>
            <button type="button" disabled={!routes.length} onClick={removeBranch}>
              {labels?.clear}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
