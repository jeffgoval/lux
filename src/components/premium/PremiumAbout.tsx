import React from 'react';
import { PremiumAboutProps } from './types';

const PremiumAbout: React.FC<PremiumAboutProps> = ({ content }) => {
  return (
    <section className="premium-about-section">
      <div className="premium-about-container">
        {/* Text Content Side */}
        <div className="premium-about-content">
          <h2 className="premium-about-title">
            {content.title}
          </h2>
          <p className="premium-about-description">
            {content.description}
          </p>
          <div className="premium-about-highlights">
            {content.highlights.map((highlight, index) => (
              <div key={index} className="premium-about-highlight">
                {highlight}
              </div>
            ))}
          </div>
        </div>
        
        {/* Visual Space Side */}
        <div className="premium-about-visual">
          {/* This space is intentionally left for visual elements or breathing room */}
        </div>
      </div>
    </section>
  );
};

export default PremiumAbout;