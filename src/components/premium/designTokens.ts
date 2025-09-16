import { DesignTokens } from './types';

export const designTokens: DesignTokens = {
  colors: {
    primary: '#D4B5A0',      // Cor clara principal
    primaryDark: '#B8967D',   // Cor escura principal  
    textWarm: '#8B7355',      // Text warm
    background: '#FAF9F7',    // Background premium
    textPrimary: '#2C2C2C',   // Texto principal
    textSecondary: '#666666', // Texto secundário
    white: '#FFFFFF',
  },
  typography: {
    fontFamily: 'Inter',
    weights: [100, 300, 400, 500],
    letterSpacing: {
      tight: '1px',
      normal: '2px',
      wide: '4px',
      wider: '6px',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '2rem',
    lg: '3rem',
    xl: '4rem',
    xxl: '6rem',
  },
  transitions: {
    fast: '0.3s ease',
    smooth: '0.5s ease-in-out',
    spring: '0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};