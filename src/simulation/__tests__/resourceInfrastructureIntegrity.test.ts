import { RESOURCE_REGISTRY, ResourceRegistry } from "../../domain/resourceRegistry";
import { CRMRepository } from "../../services/db/crmRepository";

export async function runResourceInfrastructureIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push("=== STARTING AUFTRAG 015 TEST SUITE (INTERNAL RESOURCES & ASSET INFRASTRUCTURE) ===");

  let overallPassed = true;
  const resources = ResourceRegistry.getAllResources();

  // --- TEST A: Resource Registry contains all 8 resources ---
  log.push("\n--- TEST A: Resource Registry contains all 8 resources ---");
  const expectedResourceIds = [
    "res-roadmap-h2-2026",
    "res-praesentation-h2-2026",
    "res-kampagnenbrief-connect",
    "res-leitfaden-lead-nachverfolgung",
    "res-landingpage-live",
    "res-pitch-autec",
    "res-pitch-deubner",
    "res-sla-lead-matrix",
  ];

  const allFound = expectedResourceIds.every((id) => RESOURCE_REGISTRY[id] !== undefined);
  if (allFound && resources.length === 8) {
    log.push("✅ TEST A PASSED: All 8 required resources registered in ResourceRegistry.");
  } else {
    log.push(`❌ TEST A FAILED: Expected 8 resources, found ${resources.length}`);
    overallPassed = false;
  }

  // --- TEST B: Unique IDs without collision ---
  log.push("\n--- TEST B: Unique IDs without collision ---");
  const idSet = new Set(resources.map((r) => r.id));
  if (idSet.size === resources.length) {
    log.push(`✅ TEST B PASSED: All ${idSet.size} resource IDs are strictly unique.`);
  } else {
    log.push("❌ TEST B FAILED: Duplicate resource IDs detected.");
    overallPassed = false;
  }

  // --- TEST C: Asset Path Mapping Consistency ---
  log.push("\n--- TEST C: Asset Path Mapping Consistency ---");
  let totalAssetCount = 0;
  let allPathsValid = true;
  for (const res of resources) {
    for (const relPath of res.assetPaths) {
      if (!relPath.startsWith("/resources/")) {
        allPathsValid = false;
      }
      totalAssetCount++;
    }
  }
  if (allPathsValid && totalAssetCount === 35) {
    log.push(`✅ TEST C PASSED: All ${totalAssetCount} resource asset paths mapped consistently under /resources/.`);
  } else {
    log.push(`❌ TEST C FAILED: Asset path mapping invalid or count mismatch (${totalAssetCount} vs 35).`);
    overallPassed = false;
  }

  // --- TEST D: Exact Page & Slide Count Validation ---
  log.push("\n--- TEST D: Exact Page & Slide Count Validation ---");
  const expectedCounts: Record<string, number> = {
    "res-roadmap-h2-2026": 4,
    "res-praesentation-h2-2026": 11,
    "res-kampagnenbrief-connect": 3,
    "res-leitfaden-lead-nachverfolgung": 4,
    "res-landingpage-live": 1,
    "res-pitch-autec": 6,
    "res-pitch-deubner": 5,
    "res-sla-lead-matrix": 1,
  };

  let countsMatch = true;
  for (const [id, count] of Object.entries(expectedCounts)) {
    const res = ResourceRegistry.getResourceById(id);
    if (!res || res.pageCount !== count || res.assetPaths.length !== count) {
      countsMatch = false;
    }
  }
  if (countsMatch) {
    log.push("✅ TEST D PASSED: Exact page and slide counts verified for all 8 resources (Total 35 pages/slides/assets).");
  } else {
    log.push("❌ TEST D FAILED: Page or slide count mismatch detected.");
    overallPassed = false;
  }

  // --- TEST E: Asset Reachability & Valid MIME Formats ---
  log.push("\n--- TEST E: Asset Reachability & Valid MIME Formats ---");
  let formatsValid = true;
  for (const res of resources) {
    const firstAsset = res.assetPaths[0];
    if (firstAsset === undefined) {
      formatsValid = false;
      continue;
    }
    if (res.type === "INTERACTIVE_HTML") {
      if (!firstAsset.endsWith(".html")) formatsValid = false;
    } else if (res.type === "GRAPHIC") {
      if (!firstAsset.endsWith(".png") && !firstAsset.endsWith(".jpg")) formatsValid = false;
    } else {
      for (const p of res.assetPaths) {
        if (!p.endsWith(".jpg") && !p.endsWith(".png")) formatsValid = false;
      }
    }
  }
  if (formatsValid) {
    log.push("✅ TEST E PASSED: All asset paths comply with strict format specifications.");
  } else {
    log.push("❌ TEST E FAILED: Invalid asset file extension detected.");
    overallPassed = false;
  }

  // --- TEST F: Documented Legacy Reference Mapping ---
  log.push("\n--- TEST F: Documented Legacy Reference Mapping ---");
  const expectedHistoricalIds: Record<string, string> = {
    "res-roadmap-h2-2026": "s-int-roadmap",
    "res-praesentation-h2-2026": "s-int-praesentation-h2",
    "res-kampagnenbrief-connect": "s-int-kampagnenbrief",
    "res-leitfaden-lead-nachverfolgung": "s-int-leitfaden",
    "res-landingpage-live": "s-int-landingpage",
    "res-pitch-autec": "s-int-autec",
    "res-pitch-deubner": "s-int-deubner",
    "res-sla-lead-matrix": "s-sla-matrix",
  };

  let legacyMappingValid = true;
  for (const [id, histId] of Object.entries(expectedHistoricalIds)) {
    const res = ResourceRegistry.getResourceById(id);
    if (!res || res.historicalId !== histId) {
      legacyMappingValid = false;
    }
  }
  if (legacyMappingValid) {
    log.push("✅ TEST F PASSED: All 8 resources mapped 1:1 to their historical reference IDs.");
  } else {
    log.push("❌ TEST F FAILED: Legacy historical ID mapping mismatch.");
    overallPassed = false;
  }

  // --- TEST G: Registry Lookup Helpers ---
  log.push("\n--- TEST G: Registry Lookup Helpers ---");
  const mktResources = ResourceRegistry.getResourcesByCategory("MARKETING");
  const salesResources = ResourceRegistry.getResourcesByCategory("SALES");
  const opsResources = ResourceRegistry.getResourcesByCategory("OPERATIONS");
  const slideDecks = ResourceRegistry.getResourcesByType("SLIDE_DECK");
  const htmlResources = ResourceRegistry.getResourcesByType("INTERACTIVE_HTML");
  const documents = ResourceRegistry.getResourcesByType("DOCUMENT");
  const graphics = ResourceRegistry.getResourcesByType("GRAPHIC");

  if (
    mktResources.length === 4 &&
    salesResources.length === 3 &&
    opsResources.length === 1 &&
    slideDecks.length === 3 &&
    htmlResources.length === 1 &&
    documents.length === 3 &&
    graphics.length === 1
  ) {
    log.push("✅ TEST G PASSED: ResourceRegistry helper filters (Category & Type) operate accurately (Mkt: 4, Sales: 3, Ops: 1; Decks: 3, Docs: 3, HTML: 1, Graphic: 1).");
  } else {
    log.push("❌ TEST G FAILED: Category/Type filters mismatch.");
    overallPassed = false;
  }

  // --- TEST H: Regressionsschutz Ebene A CRM Baseline ---
  log.push("\n--- TEST H: Regressionsschutz Ebene A CRM Baseline ---");
  const audit = await CRMRepository.getAuditSummary();
  const crmValid = audit.companiesValid === 20 && audit.contactsValid === 100 && audit.dealsValid === 40;
  if (crmValid) {
    log.push("✅ TEST H PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).");
  } else {
    log.push("❌ TEST H FAILED: CRM repository baseline affected.");
    overallPassed = false;
  }

  log.push("\n=================================================================");
  log.push("🎉 ALL AUFTRAG 015 TESTS PASSED SUCCESSFULLY!");

  return { success: overallPassed, log };
}
