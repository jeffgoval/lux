/**
 * 🏠 LANDING PAGE COMPONENT
 * 
 * This component serves as the public landing page for unauthenticated users.
 * It uses Clerk's SignedOut wrapper to ensure it only shows to users who
 * are not logged in, and provides SignInButton and SignUpButton for authentication.
 */

import { SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Shield, Star, Users, Award, LogIn, UserPlus, Sparkles, Heart, Zap } from "lucide-react";
import suavizarLogo from "@/assets/suavizar-logo.png";
import { useEffect, useState } from "react";

export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    services: false,
    cta: false
  });

  useEffect(() => {
    // Throttle scroll handler to reduce performance impact
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setScrollY(window.scrollY);
      }, 16); // ~60fps
    };

    // Throttle mouse move handler
    let mouseTimeout: NodeJS.Timeout;
    const handleMouseMove = (e: MouseEvent) => {
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        setMousePosition({
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: (e.clientY / window.innerHeight) * 2 - 1,
        });
      }, 32); // ~30fps
    };

    // Intersection Observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setIsVisible(prev => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe sections
    const sections = ['hero', 'features', 'services', 'cta'];
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    // Trigger hero animation immediately
    setTimeout(() => setIsVisible(prev => ({ ...prev, hero: true })), 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  const services = [
    {
      title: "Harmonização Facial",
      description: "Procedimentos minimamente invasivos para realçar sua beleza natural",
      icon: Sparkles,
      gradient: "from-pink-500/20 to-purple-500/20",
    },
    {
      title: "Rejuvenescimento",
      description: "Tratamentos avançados para uma pele mais jovem e radiante",
      icon: Star,
      gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
      title: "Bioestimuladores",
      description: "Estímulo natural do colágeno para resultados duradouros",
      icon: Zap,
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Skincare Médico",
      description: "Cuidados personalizados para cada tipo de pele",
      icon: Heart,
      gradient: "from-rose-500/20 to-pink-500/20",
    },
  ];

  const features = [
    {
      icon: Award,
      title: "Excelência Médica",
      description: "Profissionais especialistas com anos de experiência"
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Protocolos rigorosos e equipamentos de última geração"
    },
    {
      icon: Users,
      title: "Atendimento Personalizado",
      description: "Cada cliente recebe um plano único e exclusivo"
    }
  ];

  return (
    <SignedOut>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="glass-effect sticky top-0 z-50 border-b border-border/20 animate-fade-in">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3 animate-scale-in">
              <img
                src={suavizarLogo}
                alt="Suavizar Clínica Estética"
                className="h-8 w-auto hover-lift transition-spring"
              />
            </div>

            <nav className="hidden md:flex items-center space-x-8 animate-fade-in animate-delay-200">
              <a href="#services" className="text-muted-foreground hover:text-primary transition-smooth hover-fade relative group">
                Serviços
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#features" className="text-muted-foreground hover:text-primary transition-smooth hover-fade relative group">
                Diferenciais
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
            </nav>

            <div className="flex items-center space-x-3 animate-scale-in animate-delay-300">
              <SignInButton mode="modal">
                <Button variant="ghost" className="hover-lift group relative overflow-hidden">
                  <LogIn className="mr-2 h-4 w-4" />
                  <span className="relative z-10">Entrar</span>
                </Button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <Button className="btn-premium hover-lift group relative overflow-hidden">
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span className="relative z-10">Cadastrar</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-spring group-hover:translate-x-1 relative z-10" />
                </Button>
              </SignUpButton>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="hero" className="relative py-20 lg:py-32 overflow-hidden min-h-[90vh] flex items-center">
          {/* Animated Background */}
          <div
            className="absolute inset-0 bg-gradient-subtle opacity-50"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`,
            }}
          />

          {/* Floating Orbs */}
          <div
            className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float"
            style={{
              transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
            }}
          />
          <div
            className="absolute bottom-20 right-10 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl animate-float"
            style={{
              transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
              animationDelay: '1s',
            }}
          />

          <div className="container relative mx-auto px-6 z-10">
            <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
              <Badge variant="secondary" className="mb-8 px-6 py-3 text-sm font-light shimmer hover-glow animate-fade-in animate-delay-200">
                ✨ Sistema de Gestão Clínica ✨
              </Badge>

              <h1 className="heading-premium text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-light mb-4 leading-tight animate-slide-up animate-delay-300">
                <span className="text-warm block text-gradient animate-float relative">
                  SUAVIZAR
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-transparent to-primary-light/20 blur-xl -z-10 animate-pulse-soft"></div>
                </span>
              </h1>

              <p className="text-premium text-xl lg:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in animate-delay-400 font-light">
                Sistema completo de gestão para clínicas estéticas. Gerencie clientes, agendamentos, serviços e muito mais.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-scale-in animate-delay-500">
                <SignUpButton mode="modal">
                  <Button
                    size="lg"
                    className="px-10 py-5 text-lg btn-premium hover-lift group relative overflow-hidden"
                  >
                    <UserPlus className="mr-3 h-6 w-6" />
                    Começar Agora
                    <ArrowRight className="ml-3 h-6 w-6 transition-spring group-hover:translate-x-1" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </Button>
                </SignUpButton>

                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-10 py-5 text-lg hover-lift group relative overflow-hidden"
                  >
                    <LogIn className="mr-3 h-6 w-6" />
                    Já tenho conta
                  </Button>
                </SignInButton>
              </div>

              <p className="text-muted-foreground text-sm mt-6 animate-fade-in animate-delay-700">
                Acesso seguro e rápido ao seu sistema de gestão
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-muted/30 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className={`text-center mb-16 transition-all duration-700 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-6 text-gradient">
                Por que escolher nosso sistema?
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className={`p-10 text-center hover-elegant hover-lift border-0 shadow-soft group relative overflow-hidden transition-all duration-700 ${isVisible.features ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                    }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-10 w-10 text-primary group-hover:text-primary-light transition-colors" />
                    </div>
                    <h3 className="heading-premium text-xl mb-4 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-premium leading-relaxed group-hover:text-foreground transition-colors">{feature.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section id="services" className="py-24 relative">
          <div className="container mx-auto px-6 relative z-10">
            <div className={`max-w-4xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible.services ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-6 text-gradient">
                Funcionalidades do Sistema
              </h2>
              <p className="text-premium text-xl leading-relaxed">
                Tudo que você precisa para gerenciar sua clínica estética de forma eficiente
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto mt-8 rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.map((service, index) => (
                <Card
                  key={index}
                  className={`p-8 text-center hover-elegant hover-lift group cursor-pointer border-0 shadow-soft relative overflow-hidden transition-all duration-700 ${isVisible.services ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                    }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <service.icon className="h-8 w-8 text-primary group-hover:text-primary-light transition-colors" />
                    </div>
                    <h3 className="heading-premium text-lg mb-4 group-hover:text-primary transition-colors font-medium">{service.title}</h3>
                    <p className="text-premium text-sm leading-relaxed group-hover:text-foreground transition-colors">{service.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <Card className={`max-w-5xl mx-auto p-16 text-center bg-gradient-primary border-0 text-primary-foreground shadow-premium hover-lift relative overflow-hidden transition-all duration-700 ${isVisible.cta ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
              }`}>
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-8 bg-white/10 rounded-2xl flex items-center justify-center animate-float">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>

                <h2 className="text-4xl lg:text-5xl font-light mb-8 leading-tight">
                  Pronto para começar?
                </h2>
                <p className="text-xl mb-12 opacity-90 max-w-3xl mx-auto leading-relaxed">
                  Cadastre-se agora e tenha acesso completo ao sistema de gestão mais moderno para clínicas estéticas.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <SignUpButton mode="modal">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="px-12 py-6 text-lg bg-white/90 text-primary hover:bg-white hover-lift group relative overflow-hidden"
                    >
                      <UserPlus className="mr-3 h-6 w-6" />
                      Criar Conta Grátis
                      <ArrowRight className="ml-3 h-6 w-6 transition-spring group-hover:translate-x-1" />
                    </Button>
                  </SignUpButton>

                  <SignInButton mode="modal">
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-12 py-6 text-lg border-white/30 text-white hover:bg-white/10 hover-lift"
                    >
                      <LogIn className="mr-3 h-6 w-6" />
                      Fazer Login
                    </Button>
                  </SignInButton>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-border/20 bg-gradient-to-br from-background to-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <img
                  src={suavizarLogo}
                  alt="Suavizar"
                  className="h-8 w-auto"
                />
                <span className="text-2xl font-light text-gradient">Suavizar</span>
              </div>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Sistema completo de gestão para clínicas estéticas. Simplifique sua rotina e foque no que realmente importa: seus clientes.
              </p>
              <div className="flex justify-center space-x-6">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Cadastrar
                  </Button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SignedOut>
  );
}