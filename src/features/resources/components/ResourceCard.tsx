import React from 'react';
import { ResourceMetadata } from '../../../types/resource';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';

export interface ResourceCardProps {
  resource: ResourceMetadata;
  onOpen: (resource: ResourceMetadata) => void;
}

export function ResourceCard({ resource, onOpen }: ResourceCardProps) {
  const getTypeBadge = () => {
    switch (resource.type) {
      case 'SLIDE_DECK':
        return <Badge variant="cyan">{resource.pageCount} Folien</Badge>;
      case 'DOCUMENT':
        return <Badge variant="orange">{resource.pageCount} Seiten</Badge>;
      case 'INTERACTIVE_HTML':
        return <Badge variant="mint">Live Web App</Badge>;
      case 'GRAPHIC':
        return <Badge variant="cyan">1 Grafik</Badge>;
      case 'VIDEO':
        return <Badge variant="cyan">Video</Badge>;
    }
  };

  const getCategoryLabel = () => {
    switch (resource.category) {
      case 'MARKETING': return 'Marketing';
      case 'SALES': return 'Vertrieb & Pitches';
      case 'PRODUCT': return 'Produkt';
      case 'OPERATIONS': return 'Operations & SLA';
    }
  };

  return (
    <div
      onClick={() => onOpen(resource)}
      style={{
        cursor: 'pointer',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Card
        padding="0"
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        {/* Thumbnail Viewport */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            background: 'var(--color-bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderBottom: '1px solid var(--color-border-soft)',
          }}
        >
          {resource.type === 'INTERACTIVE_HTML' ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: '8px' }}>
                <Icon name="zap" size={24} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Interaktive Landingpage</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Live-Demo & ROI-Rechner</div>
            </div>
          ) : (
            <img
              src={resource.thumbnailPath}
              alt={resource.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                transition: 'transform 200ms ease',
              }}
              loading="lazy"
            />
          )}

          {resource.type === 'VIDEO' && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.35)',
                transition: 'background 200ms ease',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(0, 217, 198, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0, 217, 198, 0.5)',
                  color: '#061613',
                  fontSize: '20px',
                  paddingLeft: '3px',
                }}
              >
                ▶
              </div>
            </div>
          )}

          {/* Type Badge Overlay */}
          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
            {getTypeBadge()}
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
              {getCategoryLabel()}
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {resource.title}
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {resource.subtitle}
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Quelle: {resource.originalSource}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Öffnen →
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
