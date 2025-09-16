import React from 'react';
import PremiumAbout from './PremiumAbout';
import { sampleAboutContent } from './sampleData';

// Demo component to test PremiumAbout visually
const PremiumAboutDemo: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh' }}>
      <PremiumAbout content={sampleAboutContent} />
    </div>
  );
};

export default PremiumAboutDemo;