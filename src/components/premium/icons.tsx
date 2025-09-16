import React from 'react';

// Abstract/Geometric Icons for Premium Services
export const FacialIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="9" cy="10" r="1" fill="currentColor"/>
    <circle cx="15" cy="10" r="1" fill="currentColor"/>
    <path d="M9 15c1 1 2 1.5 3 1.5s2-0.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const CorporalIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="8" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M10 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const HarmonizacaoIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" 
          stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const SkincareIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <path d="M12 5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 17v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 12h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Default icon for unknown categories
export const DefaultServiceIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

// Icon mapping function
export const getServiceIcon = (category: string): React.ComponentType => {
  switch (category) {
    case 'facial':
      return FacialIcon;
    case 'corporal':
      return CorporalIcon;
    case 'harmonizacao':
      return HarmonizacaoIcon;
    case 'skincare':
      return SkincareIcon;
    default:
      return DefaultServiceIcon;
  }
};