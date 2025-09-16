import React, { useState } from 'react';
import { SignInButton } from "@clerk/clerk-react";
import { UserPlus, Menu, X } from "lucide-react";
import { PremiumHeaderProps } from './types';

const PremiumHeader: React.FC<PremiumHeaderProps> = ({ isScrolled, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigate = (section: string) => {
    onNavigate(section);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <header 
      className={`premium-header fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled 
          ? 'backdrop-blur-md bg-[rgba(250,249,247,0.95)] shadow-sm' 
          : 'backdrop-blur-sm bg-[rgba(250,249,247,0.8)]'
      }`}
    >
      <div className="container mx-auto h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 
            className="logo text-xl md:text-2xl lg:text-3xl font-light text-logo text-[#2C2C2C] hover:text-[#8B7355] transition-colors duration-300 cursor-pointer"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 100,
            }}
            onClick={() => handleNavigate('hero')}
          >
            SUAVIZAR
          </h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav items-center space-x-8">
          <button
            onClick={() => handleNavigate('services')}
            className="relative text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide group touch-target"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 300,
              letterSpacing: '1px',
            }}
          >
            Serviços
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#B8967D] transition-all duration-300 group-hover:w-full"></span>
          </button>
          
          <button
            onClick={() => handleNavigate('about')}
            className="relative text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide group touch-target"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 300,
              letterSpacing: '1px',
            }}
          >
            Sobre
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#B8967D] transition-all duration-300 group-hover:w-full"></span>
          </button>
          
          <button
            onClick={() => handleNavigate('contact')}
            className="relative text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide group touch-target"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 300,
              letterSpacing: '1px',
            }}
          >
            Contato
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#B8967D] transition-all duration-300 group-hover:w-full"></span>
          </button>
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="desktop-nav items-center space-x-3">
          <SignInButton 
            mode="modal"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          >
            <button 
              className="premium-button bg-transparent border-2 border-[#B8967D] text-[#B8967D] hover:bg-[#B8967D] hover:text-[#FAF9F7] hover:scale-105 transition-all duration-500 ease-in-out touch-target px-6 py-3 rounded-md flex items-center"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                letterSpacing: '1px',
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Área do Profissional
            </button>
          </SignInButton>
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-nav">
          <button
            onClick={toggleMobileMenu}
            className="touch-target-lg text-[#666666] hover:text-[#8B7355] transition-colors duration-300"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-nav absolute top-full left-0 right-0 bg-[rgba(250,249,247,0.98)] backdrop-blur-md border-t border-[#B8967D]/20 shadow-lg">
          <div className="container mx-auto py-4 px-4">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => handleNavigate('services')}
                className="text-left text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide touch-target py-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 300,
                  letterSpacing: '1px',
                }}
              >
                Serviços
              </button>
              
              <button
                onClick={() => handleNavigate('about')}
                className="text-left text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide touch-target py-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 300,
                  letterSpacing: '1px',
                }}
              >
                Sobre
              </button>
              
              <button
                onClick={() => handleNavigate('contact')}
                className="text-left text-[#666666] hover:text-[#8B7355] transition-all duration-300 font-light tracking-wide touch-target py-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 300,
                  letterSpacing: '1px',
                }}
              >
                Contato
              </button>

              {/* Mobile Auth Buttons */}
              <div className="flex flex-col space-y-3 pt-4 border-t border-[#B8967D]/20">
                <SignInButton 
                  mode="modal"
                  forceRedirectUrl="/dashboard"
                  fallbackRedirectUrl="/dashboard"
                >
                  <button 
                    className="btn-mobile premium-button bg-transparent border-2 border-[#B8967D] text-[#B8967D] hover:bg-[#B8967D] hover:text-[#FAF9F7] transition-all duration-500 ease-in-out justify-start px-4 py-3 rounded-md flex items-center w-full"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      letterSpacing: '1px',
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Área do Profissional
                  </button>
                </SignInButton>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default PremiumHeader;