"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  MapPin, Flame, Layers, Filter, RefreshCw, AlertCircle, 
  Calendar, Shield, ChevronRight, X, Eye, ExternalLink,
  BarChart3, Compass, CheckCircle2, TrendingUp, Sparkles,
  Map as MapIcon, Globe, ShieldAlert, FileText
} from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";
import { 
  resolveLocation, GeoLocationResult, 
  isActionableGrievance, classifyContentCategory, ContentCategory 
} from "@/lib/ludhiana-geo";

interface StructuredSummary {
  when?: string;
  where?: string;
  what?: string;
  next_steps?: string;
  is_actionable_grievance?: boolean;
  media_coverage_count?: number;
  publications_reported?: string[];
}

interface NewsItem {
  id: string;
  headline: string;
  body: string;
  publication: string;
  department: string;
  severity: string;
  summary: string | StructuredSummary;
  page_number: number;
  status: string;
  created_at?: string;
  suggested_officer?: {
    id: string;
    short_code: string;
    full_name: string;
    designation: string;
  } | null;
}

interface WardFeature {
  type: string;
  properties: {
    ward_no: number;
    ward_name: string;
    zone: "A" | "B" | "C" | "D";
    area_sq_km: number;
    centroid: [number, number];
  };
  geometry: any;
}

interface GeoJSONData {
  type: string;
  features: WardFeature[];
}

export default function HeatmapTab() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const layerGroupsRef = useRef<{
    heat?: any;
    geojson?: any;
    markers?: any;
    boundary?: any;
  }>({});

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [wardGeoJSON, setWardGeoJSON] = useState<GeoJSONData | null>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const [wardCentroids, setWardCentroids] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedZone, setSelectedZone] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [monsoonOnly, setMonsoonOnly] = useState(false);
  const [dispatchedOnly, setDispatchedOnly] = useState(true); // Default to Actionable Dispatched Items Only
  const [timeScope, setTimeScope] = useState<"month" | "all">("month"); // Default to Current Month
  const [grievanceOnly, setGrievanceOnly] = useState(true); // Default to Actionable Ground Grievances Only!
  const [selectedCategory, setSelectedCategory] = useState<"All" | ContentCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Map Visualization Controls
  const [baseMapStyle, setBaseMapStyle] = useState<"osm" | "positron" | "satellite">("osm");
  const [showBoundaries, setShowBoundaries] = useState(true);

  // Selected Ward
  const [inspectedWard, setInspectedWard] = useState<number | null>(null);

  // 1. Fetch news items, Ward GeoJSON & centroids
  const fetchData = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Fetch all items across all dates and statuses
      let itemsData: NewsItem[] = [];
      try {
        const itemsRes = await fetch(`${apiUrl}/news-items?date=all&status=all`);
        if (itemsRes.ok) {
          itemsData = await itemsRes.json();
        } else {
          const fallbackRes = await fetch(`${apiUrl}/news-items`);
          if (fallbackRes.ok) {
            itemsData = await fallbackRes.json();
          }
        }
      } catch (e) {
        console.warn("Error fetching items with date=all:", e);
      }
      setNewsItems(itemsData);

      // Load GeoJSON files
      const [wardsRes, boundaryRes, centroidsRes] = await Promise.all([
        fetch("/data/ludhiana_wards.geojson"),
        fetch("/data/ludhiana_mcl_boundary.geojson"),
        fetch("/data/ward_centroids.json")
      ]);

      if (wardsRes.ok) {
        const wards = await wardsRes.json();
        setWardGeoJSON(wards);
      }
      if (boundaryRes.ok) {
        const boundary = await boundaryRes.json();
        setBoundaryGeoJSON(boundary);
      }
      if (centroidsRes.ok) {
        const rawCentroids = await centroidsRes.json();
        const cleanCentroids: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawCentroids as Record<string, any>)) {
          cleanCentroids[k] = {
            ...v,
            lat: v.lat > 50 ? v.lng : v.lat,
            lng: v.lng < 50 ? v.lat : v.lng
          };
        }
        setWardCentroids(cleanCentroids);
      }
    } catch (err: any) {
      console.error("Failed to load map data:", err);
      setFetchError(err.message || "Failed to load data from backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Load Leaflet and Leaflet.heat dynamically on client & inject custom popup CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject custom CSS for rich Ward popups
    if (!document.getElementById("leaflet-custom-ward-popup-css")) {
      const style = document.createElement("style");
      style.id = "leaflet-custom-ward-popup-css";
      style.innerHTML = `
        .custom-ward-popup .leaflet-popup-content-wrapper {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #CBD5E1;
          padding: 4px;
        }
        .custom-ward-popup .leaflet-popup-content {
          margin: 8px 10px;
          line-height: 1.4;
        }
        .custom-ward-popup .leaflet-popup-tip {
          background: #ffffff;
        }
        .custom-ward-popup a.leaflet-popup-close-button {
          top: 8px;
          right: 8px;
          color: #64748B;
          font-weight: bold;
          font-size: 16px;
        }
        .custom-ward-popup a.leaflet-popup-close-button:hover {
          color: #0F172A;
        }
      `;
      document.head.appendChild(style);
    }

    // Load Leaflet JS
    const loadLeaflet = async () => {
      try {
        const L = (await import("leaflet")).default;
        (window as any).L = L;
        setLeafletLoaded(true);
      } catch (err) {
        console.error("Error loading Leaflet libraries:", err);
      }
    };

    loadLeaflet();
  }, []);

  // 3. Helper to determine summary details
  const getSummaryDetails = (item: NewsItem) => {
    if (typeof item.summary === "object" && item.summary !== null) {
      return {
        when: item.summary.when || "Not specified",
        where: item.summary.where || "Not specified",
        what: item.summary.what || "Not specified",
        next_steps: item.summary.next_steps || "Not specified"
      };
    }
    return {
      when: "Not specified",
      where: "Not specified",
      what: typeof item.summary === "string" ? item.summary : "Not specified",
      next_steps: "Not specified"
    };
  };

  // 4. Monsoon check
  const isMonsoonRelated = (item: NewsItem) => {
    const details = getSummaryDetails(item);
    const text = [item.headline, item.body, item.department, details.what, details.where].join(" ").toLowerCase();
    const keywords = ["monsoon", "rain", "waterlogging", "flood", "drain", "drainage", "sewer", "sewerage", "dengue", "mosquito", "nullah", "dariya"];
    return keywords.some(k => text.includes(k));
  };

  // 5. Geocode and map all news items with location results + Grievance classification
  const mappedItems = useMemo(() => {
    return newsItems.map(item => {
      const details = getSummaryDetails(item);
      const geo = resolveLocation(details.where, item.headline, wardCentroids);
      const isGrievance = isActionableGrievance(item);
      const contentCat = classifyContentCategory(item);
      return {
        ...item,
        geoDetails: geo,
        isMonsoon: isMonsoonRelated(item),
        isGrievance,
        contentCategory: contentCat
      };
    });
  }, [newsItems, wardCentroids]);

  // Total Actionable Grievance Count in Entire Dataset
  const totalGrievanceCount = useMemo(() => {
    return mappedItems.filter(x => x.isGrievance).length;
  }, [mappedItems]);

  // 6. Filter items based on active controls
  const filteredItems = useMemo(() => {
    return mappedItems.filter(item => {
      // 0. Dispatched Only Filter (Default ON: Excludes un-dispatched administrative/political noise)
      if (dispatchedOnly && !["dispatched", "in_progress", "resolved"].includes(item.status)) return false;

      // 0b. Time Scope Filter (Default Month)
      if (timeScope === "month") {
        const itemDate = item.created_at || "";
        const nowPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
        if (!itemDate.startsWith(nowPrefix)) return false;
      }

      // 1. Grievance Only Filter (Default ON)
      if (grievanceOnly && !item.isGrievance) return false;

      // 2. Specific Category Filter
      if (selectedCategory !== "All" && item.contentCategory !== selectedCategory) return false;

      if (selectedDept !== "All" && item.department !== selectedDept) return false;
      if (selectedSeverity !== "All" && item.severity !== selectedSeverity) return false;
      if (selectedZone !== "All" && item.geoDetails.zone !== selectedZone) return false;
      if (selectedStatus !== "All") {
        if (selectedStatus === "pending" && item.status !== "pending") return false;
        if (selectedStatus === "dispatched" && !["dispatched", "in_progress"].includes(item.status)) return false;
        if (selectedStatus === "resolved" && item.status !== "resolved") return false;
      }
      if (monsoonOnly && !item.isMonsoon) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const details = getSummaryDetails(item);
        if (!item.headline.toLowerCase().includes(q) && !details.what.toLowerCase().includes(q) && !details.where.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (dateFrom && item.created_at && item.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && item.created_at && item.created_at.slice(0, 10) > dateTo) return false;

      return true;
    });
  }, [mappedItems, dispatchedOnly, timeScope, grievanceOnly, selectedCategory, selectedDept, selectedSeverity, selectedZone, selectedStatus, monsoonOnly, searchQuery, dateFrom, dateTo]);

  // 7. Ward level complaint counts aggregation
  const wardStats = useMemo(() => {
    const counts: Record<number, { count: number; items: typeof filteredItems; highCount: number; topDept: string }> = {};
    const deptCountsPerWard: Record<number, Record<string, number>> = {};

    filteredItems.forEach(item => {
      if (item.geoDetails.ward_no) {
        const wNo = item.geoDetails.ward_no;
        if (!counts[wNo]) {
          counts[wNo] = { count: 0, items: [], highCount: 0, topDept: "" };
          deptCountsPerWard[wNo] = {};
        }
        counts[wNo].count += 1;
        counts[wNo].items.push(item);
        if (item.severity === "High") counts[wNo].highCount += 1;

        deptCountsPerWard[wNo][item.department] = (deptCountsPerWard[wNo][item.department] || 0) + 1;
      }
    });

    // Compute top department per ward
    Object.keys(counts).forEach(wKey => {
      const wNo = parseInt(wKey, 10);
      const depts = deptCountsPerWard[wNo];
      let maxD = "";
      let maxVal = 0;
      Object.entries(depts).forEach(([d, c]) => {
        if (c > maxVal) {
          maxVal = c;
          maxD = d;
        }
      });
      counts[wNo].topDept = maxD;
    });

    return counts;
  }, [filteredItems]);

  // 8. Color scale helper for Choropleth
  const getWardColor = (count: number) => {
    if (count >= 8) return "#991B1B"; // Deep Red (Critical)
    if (count >= 5) return "#DC2626";  // Red
    if (count >= 3) return "#EA580C";  // Orange
    if (count >= 1) return "#F59E0B";  // Amber / Yellow
    return "#CBD5E1";                  // Neutral Slate
  };

  // 9. Base Tile provider URLs (100% Free, NO API KEY REQUIRED)
  const getTileConfig = (style: "osm" | "positron" | "satellite") => {
    switch (style) {
      case "osm":
        return {
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        };
      case "positron":
        return {
          url: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19
        };
      case "satellite":
        return {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18
        };
    }
  };

  // 10. Rich Ward Popup HTML Builder (Department Breakdown + All News Reports)
  const buildWardPopupHtml = (wNo: number, zone: string, stats: any, isGrievanceOnly: boolean) => {
    const items: any[] = stats.items || [];
    
    // Compute department breakdown
    const deptCounts: Record<string, number> = {};
    items.forEach((it: any) => {
      deptCounts[it.department] = (deptCounts[it.department] || 0) + 1;
    });

    const deptBadgesHtml = Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, c]) => `
        <span style="display:inline-flex; align-items:center; background:#F1F5F9; color:#0F172A; border:1px solid #CBD5E1; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; margin:2px 3px 2px 0;">
          ${dept}: <strong style="margin-left:3px; color:#DC2626;">${c}</strong>
        </span>
      `).join("");

    const reportsListHtml = items.length === 0 
      ? `<div style="color:#94A3B8; font-size:11px; font-style:italic; padding:12px 0; text-align:center;">No active complaints currently reported for Ward ${wNo}.</div>`
      : items.map((it: any, idx: number) => {
          const isHigh = it.severity === "High";
          const isMed = it.severity === "Medium";
          const sevColor = isHigh ? "#DC2626" : isMed ? "#D97706" : "#2563EB";
          const sevBg = isHigh ? "#FEF2F2" : isMed ? "#FFFBEB" : "#EFF6FF";
          const what = typeof it.summary === "object" && it.summary ? it.summary.what || "" : (typeof it.summary === "string" ? it.summary : "");
          const nextSteps = typeof it.summary === "object" && it.summary ? it.summary.next_steps || "" : "";
          const officerName = it.suggested_officer?.short_code || "JC (V)";

          return `
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-left:4px solid ${sevColor}; border-radius:6px; padding:9px; margin-bottom:8px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; gap:4px;">
                <span style="font-size:9.5px; font-weight:800; text-transform:uppercase; color:#475569; background:#F8FAFC; padding:1px 5px; border-radius:3px; border:1px solid #E2E8F0;">
                  ${it.department}
                </span>
                <span style="font-size:9px; font-weight:800; color:${sevColor}; background:${sevBg}; padding:1px 6px; border-radius:10px; border:1px solid ${sevColor}33; white-space:nowrap;">
                  ${it.severity} Priority
                </span>
              </div>
              <h5 style="margin:0 0 4px 0; font-size:11.5px; font-weight:800; color:#0F172A; line-height:1.35;">
                ${idx + 1}. ${it.headline}
              </h5>
              <p style="margin:0 0 5px 0; font-size:10.5px; color:#475569; line-height:1.4;">
                ${what}
              </p>
              ${nextSteps ? `
                <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:4px; padding:5px 7px; font-size:9.5px; color:#92400E; font-weight:600; margin-bottom:4px; line-height:1.35;">
                  💡 <strong>Suggested Next Steps:</strong> ${nextSteps}
                </div>
              ` : ''}
              <div style="display:flex; justify-content:space-between; font-size:9px; color:#94A3B8; font-weight:700; border-top:1px solid #F1F5F9; padding-top:4px;">
                <span>📍 ${it.geoDetails?.matched_name || `Ward ${wNo}`} (Assignee: ${officerName})</span>
                <span>📰 ${it.publication} (p.${it.page_number})</span>
              </div>
            </div>
          `;
        }).join("");

    return `
      <div style="font-family:inherit; width:350px; max-width:90vw; max-height:430px; display:flex; flex-direction:column; padding:2px;">
        <!-- Header -->
        <div style="border-bottom:2px solid #0A2540; padding-bottom:8px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:14px; font-weight:900; color:#0A2540;">
              🏛️ WARD ${wNo}
            </h3>
            <span style="font-size:9.5px; font-weight:800; background:#0A2540; color:#FFFFFF; padding:2px 8px; border-radius:4px;">
              ZONE ${zone}
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:5px; font-size:10.5px; font-weight:700;">
            <span style="color:#DC2626; background:#FEF2F2; border:1px solid #FCA5A5; padding:1px 7px; border-radius:10px;">
              🚨 ${stats.count} ${isGrievanceOnly ? 'Grievance' : 'Report'}${stats.count === 1 ? '' : 's'}
            </span>
            ${stats.highCount > 0 ? `
              <span style="color:#B91C1C; background:#FEE2E2; border:1px solid #F87171; padding:1px 7px; border-radius:10px; font-weight:800;">
                ⚠️ ${stats.highCount} Urgent
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Problem Departments Breakdown -->
        ${Object.keys(deptCounts).length > 0 ? `
          <div style="margin-bottom:8px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:6px 8px;">
            <span style="font-size:9px; font-weight:800; text-transform:uppercase; color:#64748B; display:block; margin-bottom:3px;">
              ⚠️ Departments in Problem
            </span>
            <div style="display:flex; flex-wrap:wrap;">
              ${deptBadgesHtml}
            </div>
          </div>
        ` : ''}

        <!-- News Reports Feed -->
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#475569; margin-bottom:4px; display:flex; justify-content:space-between;">
          <span>📑 Ground Reports & Grievances</span>
          <span>(${items.length} Total)</span>
        </div>
        <div style="overflow-y:auto; max-height:240px; padding-right:3px;">
          ${reportsListHtml}
        </div>
      </div>
    `;
  };

  // 11. Initialize & Render Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [30.9010, 75.8573],
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      const tileConfig = getTileConfig(baseMapStyle);
      const baseLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom
      }).addTo(map);

      tileLayerRef.current = baseLayer;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    const map = mapInstanceRef.current;

    // Update base tile layer if style changed
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      const tileConfig = getTileConfig(baseMapStyle);
      const newBaseLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom
      }).addTo(map);
      tileLayerRef.current = newBaseLayer;
      newBaseLayer.bringToBack();
    }

    // Clear previous dynamic layers
    if (layerGroupsRef.current.heat) map.removeLayer(layerGroupsRef.current.heat);
    if (layerGroupsRef.current.geojson) map.removeLayer(layerGroupsRef.current.geojson);
    if (layerGroupsRef.current.markers) map.removeLayer(layerGroupsRef.current.markers);
    if (layerGroupsRef.current.boundary) map.removeLayer(layerGroupsRef.current.boundary);

    // --- LAYER A: MCL City Boundary Outline ---
    if (boundaryGeoJSON) {
      const boundaryLayer = L.geoJSON(boundaryGeoJSON, {
        style: {
          color: baseMapStyle === "satellite" ? "#F59E0B" : "#0A2540",
          weight: 2.5,
          opacity: 0.85,
          fillColor: "#0A2540",
          fillOpacity: 0.02,
          dashArray: "6, 6"
        }
      }).addTo(map);
      layerGroupsRef.current.boundary = boundaryLayer;
    }

    // --- LAYER B: Ward Boundaries (GeoJSON Choropleth / Interactive Polygons with Click Popup) ---
    if (wardGeoJSON && showBoundaries) {
      const wardLayer = L.geoJSON(wardGeoJSON, {
        style: (feature: any) => {
          const wNo = feature.properties.ward_no;
          const count = wardStats[wNo]?.count || 0;
          const isInspected = inspectedWard === wNo;

          return {
            fillColor: getWardColor(count),
            fillOpacity: count > 0 ? 0.70 : 0.08,
            color: isInspected ? "#0A2540" : "#475569",
            weight: isInspected ? 3.5 : 1.2,
            opacity: isInspected ? 1 : 0.65
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          const wNo = feature.properties.ward_no;
          const zone = feature.properties.zone;
          const stats = wardStats[wNo] || { count: 0, highCount: 0, topDept: "None", items: [] };

          // Build rich popup HTML
          const popupHtml = buildWardPopupHtml(wNo, zone, stats, grievanceOnly);

          // Bind Rich Ward Popup directly to the polygon
          layer.bindPopup(popupHtml, {
            maxWidth: 360,
            minWidth: 320,
            className: "custom-ward-popup"
          });

          // Hover Tooltip
          layer.bindTooltip(`
            <div class="font-sans text-xs p-1">
              <div class="font-bold text-slate-800 flex items-center justify-between">
                <span>Ward ${wNo} (Zone ${zone})</span>
                <span class="ml-2 font-black px-1.5 py-0.5 rounded text-[10px] ${stats.count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}">
                  ${stats.count} ${grievanceOnly ? 'Grievance' : 'Item'}${stats.count === 1 ? '' : 's'}
                </span>
              </div>
              ${stats.count > 0 ? `
                <div class="text-[10px] text-slate-500 mt-1">
                  <span>Top Issue: <strong>${stats.topDept}</strong></span>
                  ${stats.highCount > 0 ? ` • <span class="text-red-600 font-bold">${stats.highCount} Urgent</span>` : ''}
                </div>
              ` : '<div class="text-[10px] text-slate-400 mt-0.5">No active field grievances</div>'}
            </div>
          `, { sticky: true, className: "custom-leaflet-tooltip shadow-md rounded-lg border border-slate-200" });

          // Click handler on ward polygon: highlight ward and let bound popup open
          layer.on({
            click: () => {
              setInspectedWard(wNo);
            },
            popupclose: () => {
              setInspectedWard(null);
            }
          });
        }
      }).addTo(map);

      layerGroupsRef.current.geojson = wardLayer;
    }

  }, [leafletLoaded, wardGeoJSON, boundaryGeoJSON, baseMapStyle, showBoundaries, filteredItems, wardStats, grievanceOnly]);

  // Keep map dimensions updated on window resize
  useEffect(() => {
    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset Map View
  const handleResetMapView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([30.9010, 75.8573], 12);
    }
  };

  const DEPARTMENTS_LIST = [
    "All",
    "Operations & Maintenance (O&M)",
    "Bridges & Roads (B&R)",
    "Horticulture / Parks & Squares",
    "Solid Waste Management (SWM)",
    "Sanitation & Vector Control",
    "Health Branch",
    "Town Planning (Building Branch)",
    "Tehbazari / Land & Encroachment",
    "Licensing & Health License Branch",
    "Property Tax / House Tax Branch",
    "Accounts & Finance",
    "Establishment & General Branch",
    "Legal Cell",
    "Public Grievance Redressal / IT Cell",
    "Fire Brigade & Emergency Services"
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-[#0A2540] flex items-center">
              <MapIcon className="w-5.5 h-5.5 text-blue-600 mr-2 shrink-0" />
              GIS Ward Choropleth Intelligence
            </h2>
            <span className="text-[10px] font-black bg-amber-500 text-[#0A2540] px-2 py-0.5 rounded uppercase tracking-wider">
              95 Wards Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official Spatial Intelligence System for Municipal Corporation Ludhiana (MCL) — Click any ward polygon on the map to view all localized news reports and problem departments.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handleResetMapView}
            className="flex items-center space-x-1.5 bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Center Ludhiana</span>
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button onClick={fetchData} className="font-bold underline ml-4">Retry</button>
        </div>
      )}

      {/* 2. Key Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-red-600">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
            {dispatchedOnly
              ? (timeScope === "month" ? "Dispatched (Month)" : "Dispatched (All-Time)")
              : (timeScope === "month" ? "Mapped (Month)" : "Total Mapped")}
          </span>
          <span className="text-xl font-black text-slate-800 block mt-0.5">{filteredItems.length}</span>
          <span className="text-[9px] text-red-600 font-bold">
            {dispatchedOnly
              ? (timeScope === "month" ? "This month's issues" : "All-time actionable")
              : `${newsItems.length} total media`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-rose-600">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Urgent Hotspots</span>
          <span className="text-xl font-black text-rose-600 block mt-0.5">
            {filteredItems.filter(x => x.severity === "High").length}
          </span>
          <span className="text-[9px] text-rose-500 font-bold">Critical severity</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-amber-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Distressed Wards</span>
          <span className="text-xl font-black text-slate-800 block mt-0.5">
            {Object.keys(wardStats).length} / 95
          </span>
          <span className="text-[9px] text-slate-500 font-medium">Wards with active reports</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-blue-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Zone A & B</span>
          <span className="text-xl font-black text-[#0A2540] block mt-0.5">
            {filteredItems.filter(x => ["A", "B"].includes(x.geoDetails.zone)).length}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">North & East Ludhiana</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-indigo-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Zone C & D</span>
          <span className="text-xl font-black text-[#0A2540] block mt-0.5">
            {filteredItems.filter(x => ["C", "D"].includes(x.geoDetails.zone)).length}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">South & West Ludhiana</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs border-l-4 border-l-teal-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monsoon Items</span>
          <span className="text-xl font-black text-teal-700 block mt-0.5">
            {filteredItems.filter(x => x.isMonsoon).length}
          </span>
          <span className="text-[9px] text-teal-600 font-bold">Drainage & Vector</span>
        </div>
      </div>

      {/* 3. Filter and Visualization Control Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm border-t-2 border-t-[#0A2540] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Actionable Dispatched vs All News Mode Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setDispatchedOnly(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition-all text-xs cursor-pointer ${
                dispatchedOnly
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>🔥 Dispatched Only (Actionable)</span>
            </button>
            <button
              onClick={() => setDispatchedOnly(false)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition-all text-xs cursor-pointer ${
                !dispatchedOnly
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>🌐 Include Un-dispatched Noise</span>
            </button>
          </div>

          {/* Time Scope: This Month vs All-Time */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setTimeScope("month")}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md font-bold transition-all text-xs cursor-pointer ${
                timeScope === "month"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📅 This Month</span>
            </button>
            <button
              onClick={() => setTimeScope("all")}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-md font-bold transition-all text-xs cursor-pointer ${
                timeScope === "all"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🌐 All-Time</span>
            </button>
          </div>


          {/* Base Map Style Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase px-1">Base:</span>
            <button
              onClick={() => setBaseMapStyle("osm")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                baseMapStyle === "osm" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Street (OSM)
            </button>
            <button
              onClick={() => setBaseMapStyle("positron")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                baseMapStyle === "positron" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setBaseMapStyle("satellite")}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                baseMapStyle === "satellite" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Monsoon Toggle */}
          <button
            onClick={() => setMonsoonOnly(prev => !prev)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
              monsoonOnly
                ? "bg-rose-600 text-white border-rose-600 shadow-sm animate-pulse"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>☔ Monsoon Emergencies</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-100">
          {/* Content Category Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Content Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-[#0A2540] cursor-pointer"
            >
              <option value="All">All Classifications</option>
              <option value="civic_grievance">🚨 Ground Grievances & Failures</option>
              <option value="administrative_notice">🏢 Administrative & Review Meetings</option>
              <option value="policy_scheme">📜 Tax Schemes & Rebates</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-[#0A2540] cursor-pointer"
            >
              {DEPARTMENTS_LIST.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</label>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-[#0A2540] cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="High">High / Critical Only</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Administrative Zone</label>
            <select
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-[#0A2540] cursor-pointer"
            >
              <option value="All">All Zones (Citywide)</option>
              <option value="A">Zone A (North / Old City)</option>
              <option value="B">Zone B (East / Tajpur / Focal Point)</option>
              <option value="C">Zone C (South / Gill / Giaspura)</option>
              <option value="D">Zone D (West / Sarabha / Model Town)</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keyword / Area Search</label>
            <input
              type="text"
              placeholder="e.g. Rahon Road, Model Town, Sewer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540]"
            />
          </div>
        </div>
      </div>

      {/* 4. Full-Width GIS Ward Choropleth Map */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative flex flex-col h-[740px]">
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Interactive Guide Badge (Top Left) */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-lg shadow-md text-xs font-semibold text-slate-700 pointer-events-none flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span>Interactive Ludhiana Choropleth • Click any ward polygon on the map to inspect localized reports & problem departments</span>
        </div>

        {/* Map Legend Overlay (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-lg shadow-lg text-[10px] space-y-1.5 select-none pointer-events-auto">
          <span className="font-extrabold text-[#0A2540] uppercase tracking-wider block">
            {grievanceOnly ? "Grievance Distress Scale" : "Media Volume Scale"}
          </span>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-3 rounded-xs bg-[#991B1B]" />
            <span className="w-4 h-3 rounded-xs bg-[#DC2626]" />
            <span className="w-4 h-3 rounded-xs bg-[#EA580C]" />
            <span className="w-4 h-3 rounded-xs bg-[#F59E0B]" />
            <span className="w-4 h-3 rounded-xs bg-[#CBD5E1]" />
          </div>
          <div className="flex justify-between text-[8.5px] font-bold text-slate-600">
            <span>High (8+)</span>
            <span>Med (3-5)</span>
            <span>Low (0-1)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
