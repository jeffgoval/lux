import React from 'react';
import { SignUpButton } from '@clerk/clerk-react';
import { PremiumHeroProps } from './types';

const PremiumHero: React.FC<PremiumHeroProps> = ({ onCTAClick }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Subtle gradient background using #FAF9F7 */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #FAF9F7 0%, #f5f4f2 100%)'
        }}
      />
      
      {/* Content container */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Main title with responsive sizing */}
        <h1 
          className="text-hero mb-6 animate-fade-in"
          style={{
            fontSize: 'clamp(3rem, 8vw, 8rem)',
            fontWeight: 100,
            letterSpacing: '4px',
            lineHeight: 1.1,
            color: 'var(--color-text-primary)'
          }}
        >
          BELEZA NATURAL
        </h1>
        
        {/* Subtitle with uppercase, letter-spacing: 2px, color: #8B7355 */}
        <p 
          className="text-subtitle mb-12 animate-fade-in animate-delay-200"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.5rem)',
            fontWeight: 300,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#8B7355'
          }}
        >
          EXPERTISE · ELEGÂNCIA · EXCLUSIVIDADE
        </p>
        
        {/* Premium CTA Button with Clerk integration */}
        <div className="animate-fade-in animate-delay-400">
          <SignUpButton mode="modal">
            <button 
              className="premium-cta-button group relative overflow-hidden touch-target-xl"
              style={{
                border: '2px solid #B8967D',
                background: 'transparent',
                color: '#B8967D',
                padding: '1rem 2.5rem',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                letterSpacing: '1px',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.5s ease-in-out',
                borderRadius: '0',
                position: 'relative',
                minHeight: '56px',
                minWidth: '200px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B8967D';
                e.currentTarget.style.color = '#FAF9F7';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#B8967D';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Agendar Consulta
            </button>
          </SignUpButton>
        </div>
      </div>
      
      {/* Optional decorative elements */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-float">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-current to-transparent opacity-30" />
      </div>
    </section>
  );
};

export default PremiumHero;