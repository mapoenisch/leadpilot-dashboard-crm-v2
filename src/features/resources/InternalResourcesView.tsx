import React, { useState, useMemo } from "react";
import { ResourceCategory, ResourceMetadata, ResourceType } from "../../types/resource";
import { ResourceRegistry } from "../../domain/resourceRegistry";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResourceCard } from "./components/ResourceCard";
import { ResourceViewer } from "./components/ResourceViewer";

export function InternalResourcesView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeResource, setActiveResource] = useState<ResourceMetadata | null>(null);

  const allResources = useMemo(() => ResourceRegistry.getAllDashboardResources(), []);

  const filteredResources = useMemo(() => {
    return allResources.filter((res) => {
      // Category filter
      if (selectedCategory !== "ALL" && res.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesSub = res.subtitle.toLowerCase().includes(q);
        const matchesDesc = res.description.toLowerCase().includes(q);
        const matchesTags = res.tags.some((t) => t.toLowerCase().includes(q));
        const matchesSource = res.originalSource.toLowerCase().includes(q);
        return matchesTitle || matchesSub || matchesDesc || matchesTags || matchesSource;
      }
      return true;
    });
  }, [allResources, selectedCategory, searchQuery]);

  const totalPages = allResources.reduce((acc, r) => acc + r.pageCount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Section Header */}
      <SectionHeader
        eyebrow="Originalmaterialien"
        title="Internal Resources & Dokumentenbibliothek"
        description="Authentische Primärquellen, Marketing-Roadmaps, Sales Decks, Playbooks und Live-Landingpage der LeadPilot GmbH."
      />

      {/* Top Banner with Stats & Quick Actions */}
      <Card padding="var(--space-4)">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Dokumente & Decks:</span>
              <strong style={{ color: "var(--color-text)", fontSize: "15px" }}>{allResources.length}</strong>
            </div>
            <div style={{ width: "1px", height: "18px", background: "var(--color-border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Seiten / Folien:</span>
              <strong style={{ color: "var(--color-primary)", fontSize: "15px" }}>{totalPages}</strong>
            </div>
            <div style={{ width: "1px", height: "18px", background: "var(--color-border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Status:</span>
              <Badge variant="mint">100% Verlustfrei integriert</Badge>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              placeholder="Dokument oder Tag suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--color-bg-deep)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                color: "var(--color-text)",
                fontSize: "13px",
                width: "220px",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--color-border-soft)", paddingBottom: "8px" }}>
        {[
          { id: "ALL", label: "Alle Materialien" },
          { id: "MARKETING", label: "Marketing & Roadmaps" },
          { id: "SALES", label: "Vertrieb & Pitch-Decks" },
          { id: "OPERATIONS", label: "Operations & SLA" },
        ].map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: isActive ? "var(--color-primary-soft)" : "transparent",
                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Resources Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-5)",
        }}
      >
        {filteredResources.map((res) => (
          <ResourceCard key={res.id} resource={res} onOpen={(r) => setActiveResource(r)} />
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
          Keine Ressourcen für den Suchbegriff &bdquo;{searchQuery}&ldquo; gefunden.
        </div>
      )}

      {/* Fullscreen Resource Viewer Modal */}
      {activeResource && (
        <ResourceViewer resource={activeResource} onClose={() => setActiveResource(null)} />
      )}
    </div>
  );
}
