export interface NavSubItem {
  id: string;
  label: string;
}

export interface NavCategory {
  id: string;
  label: string;
  status: 'live' | 'planned';
  items: NavSubItem[];
}

export interface StatItem {
  label: string;
  value: string;
  delta: string;
  featured?: boolean;
}
