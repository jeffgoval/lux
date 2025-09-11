import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Shield, Star, Users, Award, Phone, MapPin, Mail, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import suavizarLogo from "@/assets/suavizar-logo.png";

export default function Landing() {
  const services = [
    {
      title: "Harmonização Facial",
      description: "Procedimentos minimamente invasivos para realçar sua beleza natural",
      icon: "✨",
    },
    {
      title: "Rejuvenescimento",
      description: "Tratamentos avançados para uma pele mais jovem e radiante",
      icon: "🌟",
    },
    {
      title: "Bioestimuladores",
      description: "Estímulo natural do colágeno para resultados duradouros",
      icon: "💫",
    },
    {
      title: "Skincare Médico",
      description: "Cuidados personalizados para cada tipo de pele",
      icon: "🌸",
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
      <header className="glass-effect sticky top-0 z-50 border-b border-border/20">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={suavizarLogo} 
              alt="Suavizar Clínica Estética" 
              className="h-8 w-auto"
            />
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#servicos" className="text-muted-foreground hover:text-primary transition-colors">
              Serviços
            </a>
            <a href="#sobre" className="text-muted-foreground hover:text-primary transition-colors">
              Sobre
            </a>
            <a href="#contato" className="text-muted-foreground hover:text-primary transition-colors">
              Contato
            </a>
          </nav>

          <Link to="/auth">
            <Button className="btn-premium">
              Agendar Consulta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-subtle opacity-50" />
        
        <div className="container relative mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-light">
              Clínica Estética de Excelência
            </Badge>
            
            <h1 className="heading-premium text-4xl lg:text-6xl font-light mb-6 leading-tight">
              Desperte sua
              <span className="text-warm block">beleza natural</span>
            </h1>
            
            <p className="text-premium text-lg lg:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Na Suavizar, transformamos sonhos em realidade através de procedimentos estéticos 
              seguros e personalizados, respeitando sua individualidade.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="btn-premium px-8 py-4 text-lg">
                  <Calendar className="mr-2 h-5 w-5" />
                  Agendar Avaliação
                </Button>
              </Link>
              
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                <Phone className="mr-2 h-5 w-5" />
                (11) 99999-9999
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 text-center hover-elegant border-0 shadow-soft">
                <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="heading-premium text-xl mb-3">{feature.title}</h3>
                <p className="text-premium">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="heading-premium text-3xl lg:text-4xl font-light mb-6">
              Nossos Serviços
            </h2>
            <p className="text-premium text-lg">
              Oferecemos uma gama completa de tratamentos estéticos com tecnologia de ponta
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="p-6 hover-elegant group cursor-pointer border-0 shadow-soft">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {service.icon}
                </div>
                <h3 className="heading-premium text-lg mb-3">{service.title}</h3>
                <p className="text-premium text-sm leading-relaxed">{service.description}</p>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/auth">
              <Button className="btn-premium">
                Ver Todos os Serviços
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="heading-premium text-3xl lg:text-4xl font-light mb-6">
                  Sobre a Suavizar
                </h2>
                <p className="text-premium text-lg mb-6 leading-relaxed">
                  Há mais de uma década, a Clínica Suavizar tem sido referência em estética 
                  médica, combinando expertise científica com um olhar sensível para a beleza única 
                  de cada pessoa.
                </p>
                <p className="text-premium mb-8 leading-relaxed">
                  Nossa filosofia está baseada na harmonia entre ciência e arte, proporcionando 
                  resultados naturais que realçam sua confiança e bem-estar.
                </p>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-light text-primary mb-1">1000+</div>
                    <div className="text-sm text-muted-foreground">Clientes Satisfeitos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-primary mb-1">10+</div>
                    <div className="text-sm text-muted-foreground">Anos de Experiência</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-primary mb-1">5★</div>
                    <div className="text-sm text-muted-foreground">Avaliação Média</div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="aspect-square bg-gradient-primary rounded-2xl opacity-20" />
                <div className="absolute inset-4 bg-background rounded-xl shadow-elegant" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-primary border-0 text-primary-foreground">
            <Star className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl lg:text-4xl font-light mb-6">
              Pronta para sua transformação?
            </h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Agende sua consulta de avaliação e descubra como podemos realçar sua beleza natural 
              com segurança e excelência.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Agora
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section id="contato" className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="heading-premium text-3xl lg:text-4xl font-light mb-6">
                Entre em Contato
              </h2>
              <p className="text-premium text-lg">
                Estamos aqui para esclarecer suas dúvidas e ajudá-la a dar o primeiro passo
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="p-6 text-center hover-elegant border-0 shadow-soft">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="heading-premium text-lg mb-2">Localização</h3>
                <p className="text-premium text-sm">
                  Rua das Flores, 123<br />
                  Jardins, São Paulo - SP
                </p>
              </Card>
              
              <Card className="p-6 text-center hover-elegant border-0 shadow-soft">
                <Phone className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="heading-premium text-lg mb-2">Telefone</h3>
                <p className="text-premium text-sm">
                  (11) 99999-9999<br />
                  Segunda à Sexta: 9h às 18h
                </p>
              </Card>
              
              <Card className="p-6 text-center hover-elegant border-0 shadow-soft">
                <Instagram className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="heading-premium text-lg mb-2">Redes Sociais</h3>
                <p className="text-premium text-sm">
                  @suavizarestetica<br />
                  Acompanhe nosso dia a dia
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <img 
                src={suavizarLogo} 
                alt="Suavizar" 
                className="h-6 w-auto opacity-60"
              />
            </div>
            
            <p className="text-muted-foreground text-sm">
              © 2024 Suavizar Clínica Estética. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}