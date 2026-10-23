"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { ConstructionRoutes, RoutePoint } from "@/lib/route-path";
import {
  getTransportStops,
  hasCoordinates,
  MAX_STOP_CHANGES,
  type NoticePoint,
  type NoticePoints,
} from "@/lib/notice-features";

type MarkerMode = "none" | "business" | "transport" | "safety";
type StopSide = "original" | "replacement";
type MapTool = "route" | StopSide | "hazard" | `stop-${number}-${StopSide}`;

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
  original?: string;
  replacement?: string;
  hazard?: string;
  blockedRoute?: string;
  placeMarker?: string;
  stopChange?: string;
};

type Props = {
  routes: ConstructionRoutes;
  editable?: boolean;
  searchable?: boolean;
  initialQuery?: string;
  latitude?: string | null;
  longitude?: string | null;
  points?: NoticePoints;
  markerMode?: MarkerMode;
  onChange?: (routes: ConstructionRoutes) => void;
  onPointsChange?: (points: NoticePoints) => void;
  labels?: Labels;
};

type SearchResult = { name: string; lat: number; lng: number; type: string };

function parseStopTool(tool: MapTool): { index: number; side: StopSide } | null {
  const match = /^stop-(\d+)-(original|replacement)$/.exec(tool);
  if (!match) return null;
  const index = Number(match[1]);
  return index < MAX_STOP_CHANGES ? { index, side: match[2] as StopSide } : null;
}

function markerPoints(points: NoticePoints, mode: MarkerMode): Array<NoticePoint | undefined> {
  if (mode === "transport")
    return getTransportStops(points).flatMap((pair) => [pair.original, pair.replacement]);
  if (mode === "business") return [points.original, points.replacement];
  if (mode === "safety") return [points.hazard];
  return [];
}

function selectedPoint(points: NoticePoints, tool: MapTool): NoticePoint | undefined {
  const stop = parseStopTool(tool);
  if (stop) return getTransportStops(points)[stop.index]?.[stop.side];
  if (tool === "original" || tool === "replacement" || tool === "hazard") return points[tool];
  return undefined;
}

function withSelectedPoint(points: NoticePoints, tool: MapTool, point: NoticePoint): NoticePoints {
  const stop = parseStopTool(tool);
  if (stop) {
    const stops = getTransportStops(points).map((pair) => ({ ...pair }));
    while (stops.length <= stop.index) stops.push({});
    stops[stop.index] = { ...stops[stop.index], [stop.side]: point };
    return { stops };
  }
  return tool === "route" ? points : { ...points, [tool]: point };
}

function showRoutes(
  L: typeof import("leaflet"),
  instance: LeafletMap,
  group: LayerGroup,
  routes: ConstructionRoutes,
  points: NoticePoints,
  markerMode: MarkerMode,
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
  if (markerMode === "transport") {
    getTransportStops(points).forEach((pair, index) => {
      (["original", "replacement"] as const).forEach((side) => {
        const point = pair[side];
        if (!hasCoordinates(point)) return;
        const markerLabel = `${side === "original" ? labels?.original || "Current bus stop" : labels?.replacement || "Replacement bus stop"} ${index + 1}`;
        const popup = document.createElement("span");
        popup.textContent = point.name ? `${markerLabel}: ${point.name}` : markerLabel;
        L.circleMarker([point.lat, point.lng], {
          radius: 13,
          color: "#fff",
          weight: 3,
          fillColor: side === "original" ? "#123b52" : "#b57013",
          fillOpacity: 1,
          bubblingMouseEvents: false,
        })
          .addTo(group)
          .bindTooltip(String(index + 1), {
            permanent: true,
            direction: "center",
            className: side === "original" ? "stop-number" : "stop-number stop-number-new",
          })
          .bindPopup(popup);
      });
    });
  }
  const markerKeys =
    markerMode === "safety"
      ? (["hazard"] as const)
      : markerMode === "business"
        ? (["original", "replacement"] as const)
        : ([] as const);
  markerKeys.forEach((key) => {
    const point = points[key];
    if (!hasCoordinates(point)) return;
    const original = key === "original";
    const color = markerMode === "safety" ? "#b5472b" : original ? "#a8392c" : "#087f83";
    const tooltip = document.createElement("span");
    const markerLabel =
      key === "hazard"
        ? labels?.hazard || "Safety location"
        : original
          ? labels?.original || "Original"
          : labels?.replacement || "Temporary";
    tooltip.textContent = point.name ? `${markerLabel}: ${point.name}` : markerLabel;
    L.circleMarker([point.lat, point.lng], {
      radius: 11,
      color: "#fff",
      weight: 3,
      fillColor: color,
      fillOpacity: 1,
    })
      .addTo(group)
      .bindTooltip(tooltip);
  });
  if (!focus) return;
  const allPoints: RoutePoint[] = [
    ...routes.flat(),
    ...markerPoints(points, markerMode)
      .filter(hasCoordinates)
      .map((point): RoutePoint => [point.lat, point.lng]),
  ];
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
  points = {},
  markerMode = "none",
  onChange,
  onPointsChange,
  labels,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const drawings = useRef<LayerGroup | null>(null);
  const routesRef = useRef(routes);
  const pointsRef = useRef(points);
  const changeRef = useRef(onChange);
  const pointsChangeRef = useRef(onPointsChange);
  const labelsRef = useRef(labels);
  const activeBranchRef = useRef(0);
  const activeToolRef = useRef<MapTool>(
    markerMode === "none"
      ? "route"
      : markerMode === "safety"
        ? "hazard"
        : markerMode === "transport"
          ? "stop-0-original"
          : "original",
  );
  const initialCoordinates = useRef({ latitude, longitude });
  const [ready, setReady] = useState(false);
  const [activeBranch, setActiveBranch] = useState(0);
  const [activeTool, setActiveTool] = useState<MapTool>(
    markerMode === "none"
      ? "route"
      : markerMode === "safety"
        ? "hazard"
        : markerMode === "transport"
          ? "stop-0-original"
          : "original",
  );
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const selectedBranch = Math.min(activeBranch, Math.max(routes.length - 1, 0));
  const routeKey = JSON.stringify(routes);
  const pointKey = JSON.stringify(points);
  const hasMappedPoints = markerPoints(points, markerMode).some(hasCoordinates);
  const visibleStops = getTransportStops(points);
  const selectedStop = parseStopTool(activeTool);
  const effectiveTool: MapTool =
    markerMode === "transport" &&
    selectedStop &&
    selectedStop.index >= Math.max(visibleStops.length, 1)
      ? "stop-0-original"
      : activeTool;

  useEffect(() => {
    routesRef.current = routes;
    pointsRef.current = points;
    changeRef.current = onChange;
    pointsChangeRef.current = onPointsChange;
    labelsRef.current = labels;
    activeBranchRef.current = selectedBranch;
    activeToolRef.current = effectiveTool;
  }, [routes, points, onChange, onPointsChange, labels, selectedBranch, effectiveTool]);

  useEffect(() => {
    if (!container.current || map.current) return;
    let active = true;
    import("leaflet").then((L) => {
      if (!active || !container.current) return;
      const marker = markerPoints(pointsRef.current, markerMode).find(hasCoordinates);
      const first =
        routesRef.current.flat()[0] ||
        (marker ? ([marker.lat, marker.lng] as RoutePoint) : undefined);
      const { latitude: initialLatitude, longitude: initialLongitude } = initialCoordinates.current;
      const hasInitialCoordinates = Boolean(initialLatitude?.trim() && initialLongitude?.trim());
      const lat = Number(initialLatitude),
        lng = Number(initialLongitude);
      const centre: RoutePoint =
        first ||
        (hasInitialCoordinates && Number.isFinite(lat) && Number.isFinite(lng)
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
          if (activeToolRef.current !== "route") {
            const tool = activeToolRef.current;
            const existing = selectedPoint(pointsRef.current, tool);
            pointsChangeRef.current?.(
              withSelectedPoint(pointsRef.current, tool, {
                name: tool === "hazard" ? "" : existing?.name || "",
                lat: Number(event.latlng.lat.toFixed(6)),
                lng: Number(event.latlng.lng.toFixed(6)),
              }),
            );
            return;
          }
          if (markerMode === "transport" || markerMode === "safety") return;
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
        pointsRef.current,
        markerMode,
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
            pointsRef.current,
            markerMode,
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
  }, [editable, markerMode]);

  useEffect(() => {
    if (!ready || !map.current || !drawings.current) return;
    import("leaflet").then((L) => {
      if (map.current && drawings.current)
        showRoutes(
          L,
          map.current,
          drawings.current,
          routesRef.current,
          pointsRef.current,
          markerMode,
          labelsRef.current,
          activeBranchRef.current,
          editable,
          !editable,
        );
    });
  }, [
    selectedBranch,
    editable,
    labels?.branch,
    labels?.end,
    labels?.start,
    labels?.original,
    labels?.replacement,
    ready,
    routeKey,
    pointKey,
    markerMode,
  ]);

  useEffect(() => {
    if (
      !ready ||
      routesRef.current.flat().length ||
      hasMappedPoints ||
      !latitude?.trim() ||
      !longitude?.trim()
    )
      return;
    const lat = Number(latitude),
      lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.current?.setView([lat, lng], 17);
  }, [latitude, longitude, ready, routeKey, hasMappedPoints]);

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
    if (activeToolRef.current !== "route") {
      const tool = activeToolRef.current;
      onPointsChange?.(
        withSelectedPoint(points, tool, {
          name:
            tool === "hazard"
              ? result.name.split(",")[0]
              : selectedPoint(points, tool)?.name || result.name.split(",")[0],
          lat: result.lat,
          lng: result.lng,
        }),
      );
    }
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
      {editable && markerMode !== "none" && (
        <div
          className={`map-tool-bar ${markerMode}`}
          role="group"
          aria-label={labels?.placeMarker || "Map tools"}
        >
          {markerMode === "business" && (
            <button
              type="button"
              className={effectiveTool === "route" ? "active" : ""}
              aria-pressed={effectiveTool === "route"}
              onClick={() => setActiveTool("route")}
            >
              {labels?.blockedRoute || "Blocked road"}
            </button>
          )}
          {markerMode === "transport"
            ? (visibleStops.length ? visibleStops : [{}]).map((pair, index) => (
                <div className="stop-tool-pair" key={index}>
                  <strong>
                    {labels?.stopChange || "Stop change"} {index + 1}
                  </strong>
                  {(["original", "replacement"] as const).map((side) => {
                    const tool = `stop-${index}-${side}` as MapTool;
                    return (
                      <button
                        key={side}
                        type="button"
                        className={
                          effectiveTool === tool ? `active marker-${side}` : `marker-${side}`
                        }
                        aria-pressed={effectiveTool === tool}
                        onClick={() => setActiveTool(tool)}
                      >
                        <span aria-hidden="true" className={`map-dot ${side}`} />
                        {side === "original"
                          ? labels?.original || "Current bus stop"
                          : labels?.replacement || "Replacement bus stop"}{" "}
                        {index + 1}
                        {hasCoordinates(pair[side]) ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              ))
            : (markerMode === "safety"
                ? (["hazard"] as const)
                : (["original", "replacement"] as const)
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={effectiveTool === key ? `active marker-${key}` : `marker-${key}`}
                  aria-pressed={effectiveTool === key}
                  onClick={() => setActiveTool(key)}
                >
                  <span aria-hidden="true" className={`map-dot ${key}`} />
                  {key === "hazard"
                    ? labels?.hazard || "Safety location"
                    : key === "original"
                      ? labels?.original || "Original"
                      : labels?.replacement || "Temporary"}
                  {hasCoordinates(points[key]) ? " ✓" : ""}
                </button>
              ))}
          <p>{labels?.placeMarker || "Select a tool, then click the map or a search result."}</p>
        </div>
      )}
      {editable &&
        markerMode !== "transport" &&
        markerMode !== "safety" &&
        effectiveTool === "route" && (
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
      {editable &&
        markerMode !== "transport" &&
        markerMode !== "safety" &&
        effectiveTool === "route" && (
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
