import React, { useState, useEffect, useCallback } from "react";
import { ResourceMetadata } from "../../../types/resource";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";

export interface ResourceViewerProps {
  resource: ResourceMetadata;
  onClose: () => void;
}

export function ResourceViewer({ resource, onClose }: ResourceViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  const totalPages = resource.pageCount || 1;

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut]);

  const currentAssetPath = resource.assetPaths[currentPage - 1] || resource.assetPaths[0];

  const getViewportWidth = () => {
    switch (viewportMode) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      case "desktop": return "100%";
    }
  };

  const navBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "var(--color-text)",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "13px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(6, 22, 19, 0.96)",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(8px)",
        color: "var(--color-text)",
      }}
    >
      {/* Top Controls Header */}
      <header
        className="resource-viewer-header"
        style={{
          height: "60px",
          background: "var(--color-bg-deep)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Back button and Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", minWidth: 0 }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            ← Zurück
          </Button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 className="resource-viewer-title-h3" style={{ margin: 0, fontSize: "15px", color: "var(--color-text)", fontFamily: "var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {resource.title}
              </h3>
              <span className="resource-viewer-badge"><Badge variant="cyan">{resource.historicalId}</Badge></span>
            </div>
            <div className="resource-viewer-title-sub" style={{ fontSize: "11.5px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {resource.originalSource}
            </div>
          </div>
        </div>

        {/* Center: Page Navigation & Zoom / Viewport controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {resource.type === "INTERACTIVE_HTML" ? (
            /* Responsive Viewport Switcher */
            <div style={{ display: "flex", alignItems: "center", background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "2px", border: "1px solid var(--color-border)" }}>
              <button
                onClick={() => setViewportMode("desktop")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewportMode === "desktop" ? "var(--color-primary)" : "transparent",
                  color: viewportMode === "desktop" ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Desktop
              </button>
              <button
                onClick={() => setViewportMode("tablet")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewportMode === "tablet" ? "var(--color-primary)" : "transparent",
                  color: viewportMode === "tablet" ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tablet
              </button>
              <button
                onClick={() => setViewportMode("mobile")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewportMode === "mobile" ? "var(--color-primary)" : "transparent",
                  color: viewportMode === "mobile" ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mobile
              </button>
            </div>
          ) : resource.type === "VIDEO" ? null : (
            /* Standard Document Navigation */
            <>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--color-surface)", padding: "3px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <button style={navBtnStyle} onClick={handlePrev} disabled={currentPage === 1}>
                    ◀
                  </button>
                  <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "90px", textAlign: "center" }}>
                    {resource.type === "SLIDE_DECK" ? "Folie" : "Seite"} {currentPage} / {totalPages}
                  </span>
                  <button style={navBtnStyle} onClick={handleNext} disabled={currentPage === totalPages}>
                    ▶
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--color-surface)", padding: "3px 6px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                <button style={navBtnStyle} onClick={handleZoomOut} disabled={zoom <= 0.6}>
                  −
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Klick für 100%"
                  aria-label="Zoom auf 100 Prozent zurücksetzen"
                  style={{ fontSize: "12px", minWidth: "45px", textAlign: "center", cursor: "pointer", color: zoom !== 1 ? "var(--color-primary)" : "inherit", background: "transparent", border: "none", padding: 0, fontFamily: "inherit" }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button style={navBtnStyle} onClick={handleZoomIn} disabled={zoom >= 2.5}>
                  +
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {resource.type === "VIDEO" && (
            <a
              href={resource.assetPaths[0]}
              download
              className="resource-viewer-header-download"
              style={{
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-raised)",
                color: "var(--color-primary)",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Video herunterladen ↗
            </a>
          )}
          {resource.type === "INTERACTIVE_HTML" && (
            <a
              href="/resources/landingpage/index.html"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-raised)",
                color: "var(--color-primary)",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              In neuem Tab ↗
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowMetadata(!showMetadata)}>
            Info {showMetadata ? "▲" : "▼"}
          </Button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: "18px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Document Display Viewport */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: "var(--space-4)",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          {resource.type === "INTERACTIVE_HTML" ? (
            <div
              style={{
                width: getViewportWidth(),
                height: "100%",
                maxWidth: "100%",
                background: "#fff",
                borderRadius: viewportMode === "desktop" ? "0" : "var(--radius-lg)",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                transition: "width 250ms ease",
              }}
            >
              <iframe
                src="/resources/landingpage/index.html"
                title="LeadPilot Live Landingpage"
                style={{ width: "100%", height: "100%", border: "none" }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : resource.type === "VIDEO" ? (
            <div
              style={{
                width: "100%",
                maxWidth: "960px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--space-4)",
              }}
            >
              <video
                controls
                playsInline
                preload="metadata"
                poster={resource.thumbnailPath}
                aria-label="LeadPilot Werbespot"
                style={{
                  width: "100%",
                  maxHeight: "72vh",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                  background: "#000",
                }}
              >
                <source src={resource.assetPaths[0]} type="video/webm" />
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", padding: "16px", textAlign: "center" }}>
                  Ihr Browser unterstützt kein HTML5-WebM-Video. Sie können die{" "}
                  <a
                    href={resource.assetPaths[0]}
                    download
                    style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                  >
                    Videodatei direkt herunterladen ({resource.originalSource})
                  </a>.
                </p>
              </video>
              <div
                style={{
                  marginTop: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  width: "100%",
                }}
              >
                <a
                  href={resource.assetPaths[0]}
                  download
                  style={{
                    textDecoration: "none",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-raised)",
                    color: "var(--color-primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid var(--color-border)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>↓</span> Video herunterladen ({resource.originalSource})
                </a>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                  }}
                >
                  Fallback-Option:{" "}
                  <a
                    href={resource.assetPaths[0]}
                    download
                    style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                  >
                    leadpilot-werbespot.webm direkt herunterladen ({resource.originalSource})
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 120ms ease-out",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <img
                src={currentAssetPath}
                alt={`${resource.title} - Seite ${currentPage}`}
                style={{
                  maxWidth: "92vw",
                  maxHeight: "78vh",
                  objectFit: "contain",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                  background: "#111",
                }}
              />
            </div>
          )}
        </main>

        {/* Metadata Sidebar Drawer */}
        {showMetadata && (
          <aside
            style={{
              width: "320px",
              background: "var(--color-surface)",
              borderLeft: "1px solid var(--color-border)",
              padding: "var(--space-5)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "16px", color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
              Resource-Details
            </h4>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Titel</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>{resource.title}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Beschreibung</div>
              <div style={{ fontSize: "12.5px", color: "var(--color-text-muted)", lineHeight: 1.4 }}>{resource.description}</div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Kategorie & Typ</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <Badge variant="cyan">{resource.category}</Badge>
                <Badge variant="orange">{resource.type}</Badge>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Originalquelle</div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--color-text)", background: "var(--color-bg-deep)", padding: "6px 8px", borderRadius: "var(--radius-sm)" }}>
                {resource.originalSource}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>Historische Referenz-ID</div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
                {resource.historicalId}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Schlagworte (Tags)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {resource.tags.map((t) => (
                  <span key={t} style={{ fontSize: "11px", background: "var(--color-surface-raised)", padding: "2px 8px", borderRadius: "12px", color: "var(--color-text-muted)" }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Thumbnail Strip (for multi-page / slide decks) */}
      {totalPages > 1 && (
        <footer
          style={{
            height: "80px",
            background: "var(--color-bg-deep)",
            borderTop: "1px solid var(--color-border)",
            padding: "0 var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            overflowX: "auto",
          }}
        >
          {resource.assetPaths.map((path, idx) => {
            const pageNum = idx + 1;
            const isActive = pageNum === currentPage;
            return (
              <div
                key={path}
                role="button"
                tabIndex={0}
                aria-label={`Seite ${pageNum} anzeigen`}
                onClick={() => setCurrentPage(pageNum)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCurrentPage(pageNum);
                  }
                }}
                style={{
                  height: "60px",
                  width: resource.type === "SLIDE_DECK" ? "95px" : "45px",
                  flexShrink: 0,
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: isActive ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  opacity: isActive ? 1 : 0.6,
                  transition: "opacity 150ms ease, border-color 150ms ease",
                  position: "relative",
                  background: "#111",
                }}
              >
                <img
                  src={path}
                  alt={`Vorschau ${pageNum}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    right: "2px",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    fontSize: "9px",
                    padding: "1px 3px",
                    borderRadius: "2px",
                  }}
                >
                  {pageNum}
                </div>
              </div>
            );
          })}
        </footer>
      )}
    </div>
  );
}
