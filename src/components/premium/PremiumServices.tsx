import React from 'react';
import { PremiumServicesProps } from './types';

const PremiumServices: React.FC<PremiumServicesProps> = ({ services }) => {
  return (
    <section className="premium-services">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-responsive-3xl md:text-responsive-4xl font-thin mb-4 tracking-wide" 
              style={{ color: 'var(--color-text-primary)' }}>
            TRATAMENTOS
          </h2>
          <p className="text-responsive-lg font-light uppercase tracking-wider" 
             style={{ color: 'var(--color-text-warm)' }}>
            Expertise · Elegância · Exclusividade
          </p>
        </div>

        {/* Services Grid - CSS Grid with 3 columns desktop, 1 column mobile */}
        <div className="services-grid">
          {services.map((service, index) => (
            <div
              key={index}
              className="service-card"
            >
              {/* Icon - 24px, color: #B8967D */}
              <div className="mb-6 flex justify-center">
                <div className="service-icon">
                  <service.icon />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-responsive-xl font-normal mb-4 text-center tracking-wide" 
                  style={{ color: 'var(--color-text-primary)' }}>
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-responsive-base font-light leading-relaxed text-center" 
                 style={{ color: 'var(--color-text-secondary)' }}>
                {service.description}
              </p>

              {/* Category Badge */}
              <div className="mt-6 flex justify-center">
                <span className="text-responsive-xs uppercase tracking-widest font-light" 
                      style={{ color: 'var(--color-text-warm)' }}>
                  {service.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PremiumServices;