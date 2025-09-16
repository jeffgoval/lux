import React from 'react';
import { PremiumContactProps } from './types';

const PremiumContact: React.FC<PremiumContactProps> = ({ contactInfo }) => {
  return (
    <footer className="premium-contact">
      <div className="premium-contact__container">
        <div className="premium-contact__content">
          {/* Contact Information */}
          <div className="premium-contact__info">
            <div className="premium-contact__item">
              <span className="premium-contact__label">TELEFONE</span>
              <a href={`tel:${contactInfo.phone.replace(/\D/g, '')}`} className="premium-contact__link">
                {contactInfo.phone}
              </a>
            </div>
            
            <div className="premium-contact__item">
              <span className="premium-contact__label">EMAIL</span>
              <a href={`mailto:${contactInfo.email}`} className="premium-contact__link">
                {contactInfo.email}
              </a>
            </div>
            
            <div className="premium-contact__item">
              <span className="premium-contact__label">ENDEREÇO</span>
              <span className="premium-contact__text">
                {contactInfo.address}
              </span>
            </div>
          </div>

          {/* Social Links */}
          {contactInfo.social && (
            <div className="premium-contact__social">
              {contactInfo.social.instagram && (
                <a 
                  href={`https://instagram.com/${contactInfo.social.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-contact__social-link"
                >
                  INSTAGRAM
                </a>
              )}
              
              {contactInfo.social.whatsapp && (
                <a 
                  href={`https://wa.me/${contactInfo.social.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-contact__social-link"
                >
                  WHATSAPP
                </a>
              )}
              
              {contactInfo.social.facebook && (
                <a 
                  href={`https://facebook.com/${contactInfo.social.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-contact__social-link"
                >
                  FACEBOOK
                </a>
              )}
            </div>
          )}
        </div>
        
        {/* Copyright */}
        <div className="premium-contact__copyright">
          <span>© 2024 SUAVIZAR. TODOS OS DIREITOS RESERVADOS.</span>
        </div>
      </div>
    </footer>
  );
};

export default PremiumContact;