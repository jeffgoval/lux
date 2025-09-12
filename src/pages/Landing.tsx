import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Shield, Star, Users, Award, Phone, MapPin, Instagram, Sparkles, Heart, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import suavizarLogo from "@/assets/suavizar-logo.png";
import { useEffect, useState } from "react";

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    services: false,
    about: false,
    cta: false,
    contact: false
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
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
    const sections = ['hero', 'features', 'services', 'about', 'cta', 'contact'];
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
            <a href="#about" className="text-muted-foreground hover:text-primary transition-smooth hover-fade relative group">
              Sobre
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-primary transition-smooth hover-fade relative group">
              Contato
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
          </nav>

          <div className="animate-scale-in animate-delay-300">
            <Link to="/auth">
              <Button className="btn-premium hover-lift group relative overflow-hidden">
                <span className="relative z-10">Área do Profissional</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-spring group-hover:translate-x-1 relative z-10" />
              </Button>
            </Link>
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
        <div
          className="absolute top-1/2 left-1/2 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse-soft"
          style={{
            transform: `translate(-50%, -50%) translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
          }}
        />

        {/* Sparkle Effects */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="container relative mx-auto px-6 z-10">
          <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}>
            <Badge variant="secondary" className="mb-8 px-6 py-3 text-sm font-light shimmer hover-glow animate-fade-in animate-delay-200">
              ✨ Clínica Estética de Excelência ✨
            </Badge>

            <h1 className="heading-premium text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-light mb-4 leading-tight animate-slide-up animate-delay-300">
              <span className="text-warm block text-gradient animate-float relative">
                SUAVIZAR
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-transparent to-primary-light/20 blur-xl -z-10 animate-pulse-soft"></div>
              </span>
            </h1>

            <p className="text-premium text-xl lg:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in animate-delay-400 font-light">
              Estética Especializada
            </p>

            <div className="flex justify-center items-center animate-scale-in animate-delay-500">
              <div className="relative group">
                <Button
                  size="lg"
                  className="px-10 py-5 text-lg bg-gradient-to-r from-muted to-muted/80 text-muted-foreground cursor-not-allowed border-2 border-dashed border-muted-foreground/30 relative overflow-hidden"
                  disabled
                >
                  <Calendar className="mr-3 h-6 w-6" />
                  Agendar Avaliação
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </Button>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary-light/20 rounded-lg blur opacity-30 animate-pulse-soft"></div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mt-6 animate-fade-in animate-delay-700">
              Em breve: Sistema de agendamento online
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className={`text-center mb-16 transition-all duration-700 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
            <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-6 text-gradient">
              Por que escolher a Suavizar?
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
                {/* Card Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-10 w-10 text-primary group-hover:text-primary-light transition-colors" />
                  </div>
                  <h3 className="heading-premium text-xl mb-4 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-premium leading-relaxed group-hover:text-foreground transition-colors">{feature.description}</p>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 relative">
        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-primary-light/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className={`max-w-4xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible.services ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
            <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-6 text-gradient">
              Nossos Serviços
            </h2>
            <p className="text-premium text-xl leading-relaxed">
              Oferecemos uma gama completa de tratamentos estéticos com tecnologia de ponta e cuidado personalizado
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
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                <div className="relative z-10">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="h-8 w-8 text-primary group-hover:text-primary-light transition-colors" />
                  </div>
                  <h3 className="heading-premium text-lg mb-4 group-hover:text-primary transition-colors font-medium">{service.title}</h3>
                  <p className="text-premium text-sm leading-relaxed group-hover:text-foreground transition-colors">{service.description}</p>
                </div>

                {/* Hover Border Effect */}
                <div className="absolute inset-0 border-2 border-primary/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Card>
            ))}
          </div>

          <div className={`text-center mt-16 transition-all duration-700 ${isVisible.services ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
            <div className="relative inline-block">
              <Button
                className="px-8 py-4 bg-gradient-to-r from-muted to-muted/80 text-muted-foreground cursor-not-allowed border-2 border-dashed border-muted-foreground/30 relative overflow-hidden group"
                disabled
              >
                Ver Todos os Serviços
                <ArrowRight className="ml-2 h-4 w-4" />
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </Button>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary-light/20 rounded-lg blur opacity-30 animate-pulse-soft"></div>
            </div>
            <p className="text-muted-foreground text-sm mt-4">
              Em breve: Catálogo completo de serviços
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-primary-light/20"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className={`transition-all duration-700 ${isVisible.about ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                }`}>
                <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-8 text-gradient">
                  Sobre a Suavizar
                </h2>
                <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary-light mb-8 rounded-full"></div>

                <p className="text-premium text-xl mb-8 leading-relaxed">
                  Há mais de uma década, a Clínica Suavizar tem sido referência em estética
                  médica, combinando expertise científica com um olhar sensível para a beleza única
                  de cada pessoa.
                </p>
                <p className="text-premium text-lg mb-12 leading-relaxed">
                  Nossa filosofia está baseada na harmonia entre ciência e arte, proporcionando
                  resultados naturais que realçam sua confiança e bem-estar.
                </p>

                <div className="grid grid-cols-3 gap-8">
                  {[
                    { number: "1000+", label: "Clientes Satisfeitos", icon: Users },
                    { number: "10+", label: "Anos de Experiência", icon: Award },
                    { number: "5★", label: "Avaliação Média", icon: Star }
                  ].map((stat, index) => (
                    <div key={index} className="text-center group hover-lift transition-spring">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <stat.icon className="h-8 w-8 text-primary group-hover:text-primary-light transition-colors" />
                      </div>
                      <div className="text-3xl font-light text-primary mb-2 animate-pulse-soft">{stat.number}</div>
                      <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`relative transition-all duration-700 delay-300 ${isVisible.about ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'
                }`}>
                {/* Main Visual Element */}
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary-light/30 rounded-3xl animate-float relative overflow-hidden">
                    {/* Inner Glow */}
                    <div className="absolute inset-8 bg-background/80 rounded-2xl shadow-elegant backdrop-blur-sm"></div>

                    {/* Floating Icons */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        {[Sparkles, Heart, Star, Zap].map((Icon, index) => (
                          <div
                            key={index}
                            className="absolute w-8 h-8 text-primary/60 animate-float"
                            style={{
                              top: `${25 + Math.cos(index * Math.PI / 2) * 30}%`,
                              left: `${25 + Math.sin(index * Math.PI / 2) * 30}%`,
                              animationDelay: `${index * 0.5}s`,
                            }}
                          >
                            <Icon className="w-full h-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse-soft"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary-light/10 rounded-full blur-2xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-24 relative overflow-hidden hidden md:block">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary-light/5"></div>

        <div className="container mx-auto px-6 relative z-10">
          <Card className={`max-w-5xl mx-auto p-16 text-center bg-gradient-primary border-0 text-primary-foreground shadow-premium hover-lift relative overflow-hidden transition-all duration-700 ${isVisible.cta ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
            }`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
                backgroundSize: '30px 30px'
              }}></div>
            </div>

            {/* Floating Stars */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <Star
                  key={i}
                  className="absolute w-4 h-4 text-white/20 animate-pulse"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-8 bg-white/10 rounded-2xl flex items-center justify-center animate-float">
                <Sparkles className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-4xl lg:text-5xl font-light mb-8 leading-tight">
                Pronta para sua transformação?
              </h2>
              <p className="text-xl mb-12 opacity-90 max-w-3xl mx-auto leading-relaxed">
                Agende sua consulta de avaliação e descubra como podemos realçar sua beleza natural
                com segurança e excelência. Sua jornada de transformação começa aqui.
              </p>

              <div className="relative inline-block">
                <Button
                  size="lg"
                  variant="secondary"
                  className="px-12 py-6 text-lg bg-white/90 text-primary hover:bg-white cursor-not-allowed opacity-60 relative overflow-hidden group"
                  disabled
                >
                  <Calendar className="mr-3 h-6 w-6" />
                  Agendar Agora
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </Button>
                <div className="absolute -inset-2 bg-white/20 rounded-lg blur opacity-50 animate-pulse-soft"></div>
              </div>

              <p className="text-white/70 text-sm mt-6">
                🚀 Em breve: Sistema de agendamento online disponível
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 bg-muted/30 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(45deg, hsl(var(--primary)) 1px, transparent 1px), linear-gradient(-45deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className={`text-center mb-20 transition-all duration-700 ${isVisible.contact ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <h2 className="heading-premium text-4xl lg:text-5xl font-light mb-6 text-gradient">
                Entre em Contato
              </h2>
              <p className="text-premium text-xl leading-relaxed max-w-3xl mx-auto">
                Estamos aqui para esclarecer suas dúvidas e ajudá-la a dar o primeiro passo
                em sua jornada de transformação
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-primary to-primary-light mx-auto mt-8 rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: MapPin,
                  title: "Localização",
                  content: "Rua das Flores, 123\nJardins, São Paulo - SP",
                  gradient: "from-blue-500/10 to-cyan-500/10"
                },
                {
                  icon: Phone,
                  title: "Telefone",
                  content: "(11) 99999-9999\nSegunda à Sexta: 9h às 18h",
                  gradient: "from-green-500/10 to-emerald-500/10"
                },
                {
                  icon: Instagram,
                  title: "Redes Sociais",
                  content: "@suavizarestetica\nAcompanhe nosso dia a dia",
                  gradient: "from-pink-500/10 to-rose-500/10"
                }
              ].map((contact, index) => (
                <Card
                  key={index}
                  className={`p-8 text-center hover-elegant hover-lift border-0 shadow-soft group relative overflow-hidden transition-all duration-700 ${isVisible.contact ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                    }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${contact.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <contact.icon className="h-10 w-10 text-primary group-hover:text-primary-light transition-colors" />
                    </div>
                    <h3 className="heading-premium text-xl mb-4 group-hover:text-primary transition-colors font-medium">{contact.title}</h3>
                    <p className="text-premium leading-relaxed group-hover:text-foreground transition-colors whitespace-pre-line">
                      {contact.content}
                    </p>
                  </div>

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                </Card>
              ))}
            </div>

            {/* Additional Contact Info */}
            <div className={`text-center mt-16 transition-all duration-700 ${isVisible.contact ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
              <div className="bg-gradient-to-r from-primary/5 to-primary-light/5 rounded-2xl p-8 border border-primary/10">
                <h3 className="heading-premium text-2xl mb-4 text-gradient">Horário de Funcionamento</h3>
                <div className="grid md:grid-cols-2 gap-6 text-premium">
                  <div>
                    <p className="font-medium mb-2">Segunda à Sexta</p>
                    <p className="text-lg">9:00 - 18:00</p>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Sábados</p>
                    <p className="text-lg">9:00 - 14:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/20 bg-gradient-to-br from-background to-muted/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/20 via-transparent to-primary-light/20"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo and Brand */}
            <div className="mb-8 animate-fade-in">
              <img
                src={suavizarLogo}
                alt="Suavizar"
                className="h-12 w-auto mx-auto mb-4 hover-lift transition-spring"
              />
              <h3 className="heading-premium text-2xl mb-2 text-gradient">SUAVIZAR</h3>
              <p className="text-premium">Estética Especializada</p>
            </div>

            {/* Divider */}
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-8"></div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-8 mb-8 animate-fade-in animate-delay-200">
              <a href="#services" className="text-muted-foreground hover:text-primary transition-smooth hover-fade">
                Serviços
              </a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-smooth hover-fade">
                Sobre
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-smooth hover-fade">
                Contato
              </a>
              <Link to="/auth" className="text-muted-foreground hover:text-primary transition-smooth hover-fade">
                Área do Profissional
              </Link>
            </div>

            {/* Copyright */}
            <div className="pt-8 border-t border-border/20 animate-fade-in animate-delay-400">
              <p className="text-muted-foreground text-sm">
                © 2024 Suavizar Clínica Estética. Todos os direitos reservados.
              </p>
              <p className="text-muted-foreground/60 text-xs mt-2">
                Desenvolvido com ❤️ para transformar vidas através da beleza
              </p>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute bottom-10 left-10 w-16 h-16 bg-primary/5 rounded-full blur-xl animate-pulse-soft"></div>
        <div className="absolute top-10 right-10 w-20 h-20 bg-primary-light/5 rounded-full blur-2xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </footer>
    </div>
  );
}