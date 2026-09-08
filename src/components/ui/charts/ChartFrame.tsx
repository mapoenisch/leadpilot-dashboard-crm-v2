import React from 'react';
import { Card } from '../Card';
import { StatusChip } from '../StatusChip';

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  headerAction?: React.ReactNode;
  height?: number | string;
  minHeight?: number | string;
  children: React.ReactNode;
  insight?: React.ReactNode;
  style?: React.CSSProperties;
}

export function ChartFrame({
  title,
  subtitle,
  sourceLabel,
  headerAction,
  height,
  minHeight = '240px',
  children,
  insight,
  style,
}: ChartFrameProps) {
  return (
    <Card
      padding="var(--space-4)"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        ...style,
      }}
    >
      {/* Chart Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            {sourceLabel && (
              <StatusChip variant="neutral" label={sourceLabel} size="sm" />
            )}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '3px 0 0 0',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {headerAction && (
          <div style={{ flexShrink: 0 }}>
            {headerAction}
          </div>
        )}
      </div>

      {/* Chart Canvas Area */}
      <div
        style={{
          width: '100%',
          minWidth: 0,
          minHeight,
          height: height || 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
          overflowX: 'auto',
        }}
      >
        {children}
      </div>

      {/* Optional Insight Callout */}
      {insight && (
        <div
          style={{
            marginTop: '4px',
            paddingTop: '8px',
            borderTop: '1px solid var(--color-border-soft)',
            fontSize: '11.5px',
            color: 'var(--color-text-muted)',
          }}
        >
          {insight}
        </div>
      )}
    </Card>
  );
}
