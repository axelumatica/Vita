// src/design/Icon.tsx
//
// Universal icon wrapper for Vita. All icons render as SVG paths via
// react-native-svg (already installed) — no fonts, no native config.
//
// Usage:
//   <Icon name="Home" />                         // defaults to theme color, size 18
//   <Icon name="Mic" size={21} color={accent} /> // explicit overrides
//
// All names are Lucide icon names. See https://lucide.dev/icons for the full set.

import React from 'react';
import {
  Home,
  BookOpen,
  Archive,
  Mic,
  Brain,
  Target,
  Search,
  OctagonAlert,
  Check,
  Settings,
  Volume2,
  RotateCcw,
  Timer,
  Clock,
  Play,
  Lightbulb,
  Lock,
  Folder,
  Loader,
  ShieldAlert,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Hand,
  ArrowUp,
  ArrowDown,
  Zap,
  List,
  Trophy,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from './ThemeProvider';

const ICONS = {
  Home,
  BookOpen,
  Archive,
  Mic,
  Brain,
  Target,
  Search,
  OctagonAlert,
  Check,
  Settings,
  Volume2,
  RotateCcw,
  Timer,
  Clock,
  Play,
  Lightbulb,
  Lock,
  Folder,
  Loader,
  ShieldAlert,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Hand,
  ArrowUp,
  ArrowDown,
  Zap,
  List,
  Trophy,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<LucideProps, 'name'> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, color, strokeWidth = 1.5, ...rest }: IconProps) {
  const { colors } = useTheme();
  const Component = ICONS[name];
  if (!Component) {
    console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return <Component size={size} color={color ?? colors.text} strokeWidth={strokeWidth} {...rest} />;
}
