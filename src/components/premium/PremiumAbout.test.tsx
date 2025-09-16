import React from 'react';
import { render, screen } from '@testing-library/react';
import PremiumAbout from './PremiumAbout';
import { sampleAboutContent } from './sampleData';

describe('PremiumAbout', () => {
  it('renders the about section with correct content', () => {
    render(<PremiumAbout content={sampleAboutContent} />);
    
    // Check if title is rendered
    expect(screen.getByText(sampleAboutContent.title)).toBeInTheDocument();
    
    // Check if description is rendered
    expect(screen.getByText(sampleAboutContent.description)).toBeInTheDocument();
    
    // Check if all highlights are rendered
    sampleAboutContent.highlights.forEach(highlight => {
      expect(screen.getByText(highlight)).toBeInTheDocument();
    });
  });

  it('has the correct CSS classes applied', () => {
    const { container } = render(<PremiumAbout content={sampleAboutContent} />);
    
    // Check if main section has correct class
    expect(container.querySelector('.premium-about-section')).toBeInTheDocument();
    
    // Check if container has correct class
    expect(container.querySelector('.premium-about-container')).toBeInTheDocument();
    
    // Check if content area has correct class
    expect(container.querySelector('.premium-about-content')).toBeInTheDocument();
    
    // Check if visual area has correct class
    expect(container.querySelector('.premium-about-visual')).toBeInTheDocument();
  });

  it('renders all highlight items with proper structure', () => {
    const { container } = render(<PremiumAbout content={sampleAboutContent} />);
    
    const highlights = container.querySelectorAll('.premium-about-highlight');
    expect(highlights).toHaveLength(sampleAboutContent.highlights.length);
  });
});