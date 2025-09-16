import React from 'react';
import PremiumContact from './PremiumContact';
import { sampleContactInfo } from './sampleData';

/**
 * Example usage of PremiumContact component
 * This demonstrates the component with sample data and verifies it renders correctly
 */
const PremiumContactExample: React.FC = () => {
  return (
    <div className="premium-contact-example">
      <h2 style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Inter', fontWeight: 300 }}>
        Premium Contact Component Example
      </h2>
      
      <PremiumContact contactInfo={sampleContactInfo} />
      
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Inter', fontWeight: 300 }}>
        <p>This component demonstrates:</p>
        <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
          <li>Background color #B8967D as specified</li>
          <li>White/off-white text (#FAF9F7) for all content</li>
          <li>Centered layout with horizontal organization</li>
          <li>3rem vertical padding for proper spacing</li>
          <li>Inter 300 typography with letter-spacing: 1px</li>
          <li>Proper contrast ratios for accessibility</li>
          <li>Visual consistency with overall premium design</li>
        </ul>
      </div>
    </div>
  );
};

export default PremiumContactExample;