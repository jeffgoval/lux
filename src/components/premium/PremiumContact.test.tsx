import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PremiumContact from './PremiumContact';
import { sampleContactInfo } from './sampleData';

describe('PremiumContact', () => {
  it('renders contact information correctly', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    // Check if contact information is displayed
    expect(screen.getByText('TELEFONE')).toBeInTheDocument();
    expect(screen.getByText('EMAIL')).toBeInTheDocument();
    expect(screen.getByText('ENDEREÇO')).toBeInTheDocument();
    
    // Check if contact values are displayed
    expect(screen.getByText(sampleContactInfo.phone)).toBeInTheDocument();
    expect(screen.getByText(sampleContactInfo.email)).toBeInTheDocument();
    expect(screen.getByText(sampleContactInfo.address)).toBeInTheDocument();
  });

  it('renders social links when provided', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    // Check if social links are displayed
    expect(screen.getByText('INSTAGRAM')).toBeInTheDocument();
    expect(screen.getByText('WHATSAPP')).toBeInTheDocument();
    expect(screen.getByText('FACEBOOK')).toBeInTheDocument();
  });

  it('creates proper links for contact methods', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    // Check if phone link is correct
    const phoneLink = screen.getByRole('link', { name: sampleContactInfo.phone });
    expect(phoneLink).toHaveAttribute('href', 'tel:11999999999');
    
    // Check if email link is correct
    const emailLink = screen.getByRole('link', { name: sampleContactInfo.email });
    expect(emailLink).toHaveAttribute('href', `mailto:${sampleContactInfo.email}`);
  });

  it('creates proper social media links', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    // Check Instagram link
    const instagramLink = screen.getByRole('link', { name: 'INSTAGRAM' });
    expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/suavizar.estetica');
    expect(instagramLink).toHaveAttribute('target', '_blank');
    expect(instagramLink).toHaveAttribute('rel', 'noopener noreferrer');
    
    // Check WhatsApp link
    const whatsappLink = screen.getByRole('link', { name: 'WHATSAPP' });
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/5511999999999');
    
    // Check Facebook link
    const facebookLink = screen.getByRole('link', { name: 'FACEBOOK' });
    expect(facebookLink).toHaveAttribute('href', 'https://facebook.com/suavizar.estetica');
  });

  it('renders copyright information', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    expect(screen.getByText('© 2024 SUAVIZAR. TODOS OS DIREITOS RESERVADOS.')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    render(<PremiumContact contactInfo={sampleContactInfo} />);
    
    // Check if main footer has correct class
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('premium-contact');
  });

  it('handles missing social links gracefully', () => {
    const contactInfoWithoutSocial = {
      ...sampleContactInfo,
      social: {}
    };
    
    render(<PremiumContact contactInfo={contactInfoWithoutSocial} />);
    
    // Should not render social links section
    expect(screen.queryByText('INSTAGRAM')).not.toBeInTheDocument();
    expect(screen.queryByText('WHATSAPP')).not.toBeInTheDocument();
    expect(screen.queryByText('FACEBOOK')).not.toBeInTheDocument();
  });
});