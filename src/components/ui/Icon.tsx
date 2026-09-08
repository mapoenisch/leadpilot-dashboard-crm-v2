import React from 'react';
import { 
  CheckCircle2, 
  User, 
  Send, 
  Settings, 
  TrendingUp, 
  Building2, 
  Package, 
  Target, 
  Users, 
  PieChart, 
  DollarSign, 
  Briefcase, 
  Award, 
  FileText, 
  Layers, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Bell, 
  Search,
  Filter,
  Plus
} from 'lucide-react';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ICON_MAP: Record<string, React.ElementType> = {
  checkCircle: CheckCircle2,
  user: User,
  send: Send,
  settings: Settings,
  trendingUp: TrendingUp,
  building: Building2,
  product: Package,
  target: Target,
  users: Users,
  pieChart: PieChart,
  dollar: DollarSign,
  briefcase: Briefcase,
  award: Award,
  fileText: FileText,
  layers: Layers,
  play: Play,
  pause: Pause,
  reset: RotateCcw,
  zap: Zap,
  bell: Bell,
  search: Search,
  filter: Filter,
  plus: Plus,
};

export function Icon({ name, size = 18, color = 'currentColor', style, className }: IconProps) {
  const IconComponent = ICON_MAP[name] || CheckCircle2;
  return <IconComponent size={size} color={color} style={style} className={className} />;
}
