import { ServiceCard, PremiumAboutProps, ContactInfo } from './types';
import { FacialIcon, CorporalIcon, HarmonizacaoIcon, SkincareIcon } from './icons';

// Sample about content for testing the PremiumAbout component
export const sampleAboutContent: PremiumAboutProps['content'] = {
  title: "EXCELÊNCIA EM ESTÉTICA",
  description: "Nossa clínica representa o que há de mais refinado em tratamentos estéticos, combinando técnicas avançadas com um atendimento personalizado e exclusivo. Cada procedimento é cuidadosamente planejado para realçar sua beleza natural com elegância e sofisticação.",
  highlights: [
    "Expertise reconhecida em harmonização facial",
    "Tecnologia de ponta em tratamentos não invasivos", 
    "Atendimento personalizado e exclusivo",
    "Ambiente sofisticado e acolhedor",
    "Resultados naturais e duradouros"
  ]
};

// Sample services data for testing the PremiumServices component
export const sampleServices: ServiceCard[] = [
  {
    title: "TRATAMENTOS FACIAIS",
    description: "Procedimentos personalizados para realçar a beleza natural do rosto, utilizando técnicas avançadas e produtos premium.",
    icon: FacialIcon,
    category: "facial"
  },
  {
    title: "CUIDADOS CORPORAIS",
    description: "Tratamentos corporais exclusivos que promovem bem-estar e elegância através de técnicas especializadas.",
    icon: CorporalIcon,
    category: "corporal"
  },
  {
    title: "HARMONIZAÇÃO FACIAL",
    description: "Procedimentos estéticos minimamente invasivos para harmonizar e realçar os traços naturais com sutileza.",
    icon: HarmonizacaoIcon,
    category: "harmonizacao"
  },
  {
    title: "SKINCARE AVANÇADO",
    description: "Protocolos personalizados de cuidados com a pele, utilizando tecnologia de ponta e ingredientes premium.",
    icon: SkincareIcon,
    category: "skincare"
  },
  {
    title: "REJUVENESCIMENTO",
    description: "Tratamentos anti-idade que promovem a renovação celular e mantêm a vitalidade da pele.",
    icon: FacialIcon,
    category: "facial"
  },
  {
    title: "WELLNESS PREMIUM",
    description: "Experiências exclusivas que combinam estética e bem-estar para resultados excepcionais.",
    icon: CorporalIcon,
    category: "corporal"
  }
];

// Sample contact information for testing the PremiumContact component
export const sampleContactInfo: ContactInfo = {
  phone: "(11) 99999-9999",
  email: "contato@suavizar.com.br",
  address: "Rua da Elegância, 123 - Jardins, São Paulo - SP",
  social: {
    instagram: "@suavizar.estetica",
    whatsapp: "5511999999999",
    facebook: "suavizar.estetica"
  }
};