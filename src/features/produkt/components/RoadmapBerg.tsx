// Auftrag 095 (Paket G2, Welle 2): dekorative Berg-Illustration der Roadmap (Original-WebP
// 10-releases-roadmap): dunkles Gebirge, leuchtender Pfad mit Markierungen, Flagge am Gipfel.
// Reine Zierde ohne Aussage: aria-hidden, keine Beschriftung, keine Werte.
const PFAD = '170,500 330,470 190,400 280,340 140,290 250,240 150,190 260,130 200,80';
const PINS: Array<[number, number]> = [
  [330, 470],
  [190, 400],
  [280, 340],
  [140, 290],
  [250, 240],
];

export function RoadmapBerg() {
  return (
    <svg
      className="pd-berg"
      viewBox="0 0 400 560"
      aria-hidden="true"
      focusable="false"
      data-testid="roadmap-berg"
    >
      <defs>
        <linearGradient id="berg-flanke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3b40" />
          <stop offset="1" stopColor="#06161b" />
        </linearGradient>
        <filter id="berg-leuchten" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <polygon
        points="0,560 0,330 70,260 130,300 210,170 300,260 400,200 400,560"
        fill="url(#berg-flanke)"
        opacity="0.55"
      />
      <polygon points="40,560 120,380 200,70 290,330 400,420 400,560" fill="url(#berg-flanke)" />
      <polygon points="200,70 150,190 215,215 260,130" fill="#134a50" opacity="0.7" />
      <polygon points="150,190 140,290 250,240 215,215" fill="#0b2a2f" opacity="0.8" />
      <polyline className="pd-berg__glow" points={PFAD} fill="none" filter="url(#berg-leuchten)" />
      <polyline className="pd-berg__pfad" points={PFAD} fill="none" />
      {PINS.map(([x, y]) => (
        <g key={`${String(x)}-${String(y)}`} transform={`translate(${String(x)} ${String(y)})`}>
          <path
            className="pd-berg__pin"
            d="M0 0 C-10 -14 -12 -22 -12 -27 A12 12 0 1 1 12 -27 C12 -22 10 -14 0 0 Z"
          />
          <circle className="pd-berg__pinpunkt" cx="0" cy="-27" r="4.5" />
        </g>
      ))}
      <line className="pd-berg__mast" x1="200" y1="80" x2="200" y2="30" />
      <polygon className="pd-berg__flagge" points="200,30 240,42 200,56" />
    </svg>
  );
}
