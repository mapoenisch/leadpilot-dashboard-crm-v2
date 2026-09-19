import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalRunway } from '../GoalRunway';
import { OKR } from '@/domain/strategieData';

const origObjectives = OKR.objectives.map((o) => ({ ...o, krs: [...(o.krs ?? [])] }));

afterEach(() => {
  OKR.objectives.splice(0, OKR.objectives.length, ...origObjectives);
});

describe('GoalRunway (branch3)', () => {
  it('rendert Titel, Objectives, KR-Anzahl und Notiz-Chips', () => {
    render(<GoalRunway />);
    expect(screen.getByText('Ziele & Strategische OKRs 2026')).toBeInTheDocument();
    expect(screen.getByText('O1: Umsatzwachstum & Skalierung der Kundenbasis')).toBeInTheDocument();
    expect(screen.getByText('3 Key Results')).toBeInTheDocument();
    expect(screen.getByText('4 Key Results')).toBeInTheDocument();
    expect(screen.getByText('+50,5 % Wachstum')).toBeInTheDocument();
    expect(screen.getAllByText('Lücke zur Zielstation')).toHaveLength(7);
  });

  it('nicht parsbare Key Results nutzen Fallback mit Strichen', () => {
    OKR.objectives.splice(0, OKR.objectives.length, {
      title: 'OX: Freitext-Ziel',
      krs: ['Freitext ohne Pfeilformat'],
    } as never);
    render(<GoalRunway />);
    expect(screen.getByText('Freitext ohne Pfeilformat')).toBeInTheDocument();
    expect(screen.getByText('1 Key Results')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('Objective ohne Key Results zeigt Null-Zähler ohne Startbahn', () => {
    OKR.objectives.splice(0, OKR.objectives.length, { title: 'Leeres Objective' } as never);
    render(<GoalRunway />);
    expect(screen.getByText('Leeres Objective')).toBeInTheDocument();
    expect(screen.getByText('0 Key Results')).toBeInTheDocument();
    expect(screen.queryByText('Lücke zur Zielstation')).not.toBeInTheDocument();
  });

  it('leere Objectives rendern nur den Kopfbereich', () => {
    OKR.objectives.splice(0, OKR.objectives.length);
    render(<GoalRunway />);
    expect(screen.getByText('Ziele & Strategische OKRs 2026')).toBeInTheDocument();
    expect(screen.queryByText(/Key Results/)).not.toBeInTheDocument();
  });

  it('eigene Key Results mit und ohne Notiz trennen Basis und Ziel', () => {
    OKR.objectives.splice(0, OKR.objectives.length, {
      title: 'OT: Testbahn',
      krs: ['KR 1: Testlauf von A auf B (Pilot)', 'KR 2: Ausbau von X auf Y'],
    } as never);
    render(<GoalRunway />);
    expect(screen.getByText('Pilot')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Ausbau')).toBeInTheDocument();
    expect(screen.getAllByText('Lücke zur Zielstation')).toHaveLength(2);
  });
});
