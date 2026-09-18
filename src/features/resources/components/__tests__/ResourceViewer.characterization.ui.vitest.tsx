import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ResourceViewer } from '../ResourceViewer';
import { ResourceViewerContent } from '../ResourceViewerContent';
import { ResourceMetadataDrawer, ResourceThumbnailStrip } from '../ResourceViewerPanels';
import { useResourceViewerControls } from '../useResourceViewerControls';
import { ResourceRegistry } from '@/domain/resourceRegistry';

const docResource = ResourceRegistry.getResourceById('res-roadmap-h2-2026')!;
const videoResource = ResourceRegistry.getResourceById('res-leadpilot-werbespot')!;
const interactiveResource = ResourceRegistry.getResourceById('res-landingpage-live')!;
const graphicResource = ResourceRegistry.getResourceById('res-sla-lead-matrix')!;

describe('ResourceViewer (characterization: Dokument)', () => {
  it('rendert Titel, Seitennavigation und Zoom', () => {
    render(<ResourceViewer resource={docResource} onClose={() => {}} />);
    expect(screen.getByText('Marketingplanung H2-2026 – Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Seite 1 / 4')).toBeInTheDocument();
    expect(screen.getByAltText(/Seite 1$/)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('wechselt Seiten per Pfeil und Thumbnails', () => {
    render(<ResourceViewer resource={docResource} onClose={() => {}} />);
    fireEvent.click(screen.getByText('▶'));
    expect(screen.getByText('Seite 2 / 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seite 4 anzeigen' }));
    expect(screen.getByText('Seite 4 / 4')).toBeInTheDocument();
    fireEvent.click(screen.getByText('◀'));
    expect(screen.getByText('Seite 3 / 4')).toBeInTheDocument();
  });

  it('zoomt per Plus/Minus und setzt per Prozent-Button zurück', () => {
    render(<ResourceViewer resource={docResource} onClose={() => {}} />);
    fireEvent.click(screen.getByText('+'));
    expect(screen.getByText('120%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('−'));
    expect(screen.getByText('100%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom auf 100 Prozent zurücksetzen' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('schließt per Zurück, Kreuz und Escape und toggelt Metadaten', () => {
    const onClose = vi.fn();
    const { container } = render(<ResourceViewer resource={docResource} onClose={onClose} />);
    expect(container.textContent).not.toContain('Resource-Details');
    fireEvent.click(screen.getByRole('button', { name: /Info/ }));
    expect(screen.getByText('Resource-Details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Zurück' }));
    fireEvent.click(screen.getAllByText('✕')[0] as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('ResourceViewer (characterization: Video & Interaktiv)', () => {
  it('rendert Video mit Player und Download', () => {
    const { container } = render(<ResourceViewer resource={videoResource} onClose={() => {}} />);
    expect(screen.getByLabelText('LeadPilot Werbespot')).toBeInTheDocument();
    expect(container.textContent).toContain('Video herunterladen');
    // Keine Dokumentennavigation beim Video
    expect(screen.queryByText(/Seite 1 \//)).not.toBeInTheDocument();
  });

  it('rendert Viewport-Umschalter für interaktive Ressourcen', () => {
    const { container } = render(
      <ResourceViewer resource={interactiveResource} onClose={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(container.querySelector('iframe[title="LeadPilot Live Landingpage"]')).not.toBeNull();
  });
});

describe('ResourceViewer-Teilkomponenten (characterization)', () => {
  it('ResourceViewerContent zeigt Grafikbild direkt', () => {
    render(
      <ResourceViewerContent
        resource={graphicResource}
        currentPage={1}
        currentAssetPath={graphicResource.assetPaths[0]}
        viewportMode="desktop"
        zoom={1}
      />,
    );
    expect(screen.getByAltText(/Seite 1$/)).toBeInTheDocument();
  });

  it('ResourceMetadataDrawer zeigt Details und Tags', () => {
    render(<ResourceMetadataDrawer resource={docResource} />);
    expect(screen.getByText('Resource-Details')).toBeInTheDocument();
    expect(screen.getByText('Marketingplanung H2-2026 – Roadmap')).toBeInTheDocument();
    expect(screen.getByText('#Roadmap')).toBeInTheDocument();
  });

  it('ResourceThumbnailStrip rendert nichts bei einer Seite und sonst wählbare Seiten', () => {
    const { container, rerender } = render(
      <ResourceThumbnailStrip
        resource={graphicResource}
        currentPage={1}
        totalPages={1}
        onSelect={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    const onSelect = vi.fn();
    rerender(
      <ResourceThumbnailStrip
        resource={docResource}
        currentPage={1}
        totalPages={4}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Seite 2 anzeigen' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('useResourceViewerControls klemmt Seiten und Zoom an Grenzen', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useResourceViewerControls(docResource, onClose));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.zoom).toBe(1);
    act(() => {
      result.current.handlePrev();
    });
    expect(result.current.currentPage).toBe(1);
    act(() => {
      result.current.setCurrentPage(4);
      result.current.handleNext();
    });
    expect(result.current.currentPage).toBe(4);
    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.handleZoomIn();
    });
    expect(result.current.zoom).toBe(2.5);
    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.handleZoomOut();
    });
    expect(result.current.zoom).toBe(0.6);
    act(() => {
      result.current.handleZoomReset();
    });
    expect(result.current.zoom).toBe(1);
  });
});
