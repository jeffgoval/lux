# 🚀 ESTRUTURA COMPLETA DO BANCO DE DADOS APPWRITE
## Sistema Multi-Tenant para Clínicas de Estética Premium

### 📋 SUMÁRIO EXECUTIVO

Este documento apresenta o planejamento completo para migração do Supabase para o Appwrite, contemplando:
- **32 Collections** organizadas em 9 módulos funcionais
- **Arquitetura Multi-Tenant** com isolamento por tenant
- **Segurança LGPD** com criptografia e auditoria
- **IA Integrada** para agendamentos e insights
- **Tempo estimado**: 4-5 semanas para implementação completa

---

## 🏗️ ARQUITETURA MULTI-TENANT

### Estratégia de Isolamento
```javascript
// Todas as collections terão:
{
  tenantId: string,      // ID da organização (isolamento)
  clinicId: string,      // ID da clínica específica
  // ... campos específicos
}
```

### Hierarquia de Acesso
1. **Super Admin**: Acesso total ao sistema
2. **Organização**: Acesso a todas as clínicas da organização
3. **Clínica**: Acesso apenas aos dados da clínica específica
4. **Usuário**: Acesso baseado em roles dentro da clínica

---

## 📊 ESTRUTURA DAS COLLECTIONS

### 1️⃣ MÓDULO DE IDENTIDADE E AUTORIZAÇÃO

#### `organizations` 
```typescript
{
  $id: string,
  name: string,              // Nome da organização
  cnpj?: string,             // CNPJ único
  plan: 'basico' | 'premium' | 'enterprise',
  status: 'active' | 'suspended' | 'cancelled',
  features: string[],        // Feature flags habilitadas
  billingInfo: {
    customerId: string,      // ID no gateway de pagamento
    subscriptionId: string,
    nextBillingDate: Date
  },
  settings: {
    theme?: object,          // Customização visual
    timezone: string,
    locale: string
  },
  limits: {
    maxClinics: number,
    maxUsers: number,
    maxStorageGB: number
  },
  createdBy: string,         // User ID do criador
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- cnpj (unique)
- status
- plan
- createdBy
```

#### `clinics`
```typescript
{
  $id: string,
  organizationId: string,    // FK para organizations
  name: string,
  slug: string,              // URL amigável única
  type: 'matriz' | 'filial',
  address: {
    street: string,
    number: string,
    complement?: string,
    neighborhood: string,
    city: string,
    state: string,
    zipCode: string,
    coordinates?: {
      lat: number,
      lng: number
    }
  },
  contact: {
    phone: string,
    whatsapp?: string,
    email: string,
    website?: string
  },
  businessHours: {
    [day: string]: {
      open: string,          // "09:00"
      close: string,         // "18:00"
      breaks?: Array<{
        start: string,
        end: string
      }>
    }
  },
  settings: {
    appointmentDuration: number,  // minutos padrão
    bufferTime: number,          // tempo entre atendimentos
    cancellationPolicy: {
      hoursInAdvance: number,
      fee?: number
    },
    notifications: {
      confirmationHours: number,
      reminderHours: number[]
    }
  },
  integrations: {
    whatsapp?: {
      phoneNumberId: string,
      accessToken: string
    },
    googleCalendar?: {
      calendarId: string,
      syncEnabled: boolean
    }
  },
  status: 'active' | 'inactive',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- organizationId
- slug (unique)
- status
- type
```

#### `users_profile`
```typescript
{
  $id: string,
  userId: string,            // Appwrite Auth User ID
  email: string,
  fullName: string,
  cpf?: string,              // Criptografado
  rg?: string,               // Criptografado
  birthDate?: Date,
  gender?: 'M' | 'F' | 'O',
  phone: string,
  whatsapp?: string,
  avatarUrl?: string,
  address?: {
    // Mesmo esquema de clinics.address
  },
  preferences: {
    language: string,
    notifications: {
      email: boolean,
      sms: boolean,
      whatsapp: boolean,
      push: boolean
    },
    theme: 'light' | 'dark' | 'auto'
  },
  metadata: {
    firstAccess: boolean,
    lastLoginAt?: Date,
    loginCount: number,
    source?: string          // Como conheceu
  },
  status: 'active' | 'inactive' | 'blocked',
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- userId (unique)
- email (unique)
- cpf (unique, hashed)
- status
```

#### `user_roles`
```typescript
{
  $id: string,
  userId: string,
  organizationId?: string,   // null para super_admin
  clinicId?: string,         // null para roles de organização
  role: 'super_admin' | 'owner' | 'admin' | 'manager' | 
        'professional' | 'receptionist' | 'client',
  permissions: string[],     // Lista de permissões específicas
  departments?: string[],    // Departamentos que pode acessar
  specialties?: string[],    // Para profissionais
  commissionRate?: number,   // % de comissão (profissionais)
  workSchedule?: {
    [day: string]: {
      start: string,
      end: string,
      breaks?: Array<{
        start: string,
        end: string
      }>
    }
  },
  validFrom: Date,
  validUntil?: Date,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- userId + clinicId (compound)
- organizationId
- role
- validFrom
```

### 2️⃣ MÓDULO DE CLIENTES/PACIENTES

#### `patients`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  code: string,              // Código interno único
  personalInfo: {
    fullName: string,
    cpf: string,             // Criptografado
    rg?: string,             // Criptografado
    birthDate: Date,
    gender: 'M' | 'F' | 'O',
    maritalStatus?: string,
    occupation?: string,
    education?: string
  },
  contact: {
    email: string,
    phone: string,
    whatsapp?: string,
    preferredChannel: 'email' | 'sms' | 'whatsapp',
    address: {
      // Mesmo esquema anterior
    }
  },
  healthInfo: {
    bloodType?: string,
    allergies?: string[],
    medications?: string[],
    conditions?: string[],
    surgeries?: Array<{
      procedure: string,
      date: Date,
      notes?: string
    }>,
    skinType?: string,
    aestheticConcerns?: string[],
    contraindications?: string[]
  },
  marketing: {
    source: string,          // Como conheceu
    tags: string[],          // Segmentação
    vipLevel?: 'bronze' | 'silver' | 'gold' | 'platinum',
    preferences: {
      products: string[],
      services: string[],
      professionals: string[]
    }
  },
  metrics: {
    ltv: number,             // Lifetime value
    totalSpent: number,
    appointmentCount: number,
    lastAppointment?: Date,
    nextAppointment?: Date,
    averageTicket: number,
    frequency: number,       // Visitas por mês
    nps?: number,
    churnRisk?: 'low' | 'medium' | 'high'
  },
  consent: {
    lgpd: boolean,
    lgpdDate: Date,
    marketing: boolean,
    imageUse: boolean,
    terms: Array<{
      type: string,
      version: string,
      acceptedAt: Date
    }>
  },
  notes?: string,
  status: 'active' | 'inactive' | 'blocked',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId
- code (unique per clinic)
- personalInfo.cpf (hashed, unique)
- contact.email
- metrics.lastAppointment
- marketing.vipLevel
- status
```

### 3️⃣ MÓDULO DE AGENDAMENTOS

#### `services`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  categoryId?: string,       // FK para service_categories
  name: string,
  description?: string,
  code: string,              // SKU único
  type: 'procedure' | 'consultation' | 'package',
  pricing: {
    basePrice: number,
    currency: string,
    variations?: Array<{
      name: string,
      price: number,
      conditions?: object
    }>,
    promotionalPrice?: number,
    validUntil?: Date
  },
  duration: {
    minutes: number,
    setupTime?: number,      // Tempo de preparação
    cleanupTime?: number     // Tempo de limpeza
  },
  requirements: {
    professionals?: string[], // IDs dos profissionais habilitados
    rooms?: string[],        // Salas específicas
    equipment?: string[],    // Equipamentos necessários
    products?: Array<{
      productId: string,
      quantity: number
    }>
  },
  protocols: {
    preService?: string,     // Instruções pré-atendimento
    duringService?: string,  // Protocolo de execução
    postService?: string,    // Cuidados pós
    contraindications?: string[]
  },
  commission: {
    type: 'percentage' | 'fixed',
    value: number,
    splitRules?: object      // Regras de divisão
  },
  media: {
    images?: string[],       // URLs
    videos?: string[],
    documents?: string[]
  },
  seo: {
    slug: string,
    metaTitle?: string,
    metaDescription?: string
  },
  status: 'active' | 'inactive' | 'draft',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId
- categoryId
- code (unique)
- status
- pricing.basePrice
```

#### `appointments`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  code: string,              // APPT-20240115-001
  patientId: string,
  professionalId: string,
  serviceId: string,
  roomId?: string,
  scheduling: {
    date: Date,
    startTime: string,       // "14:00"
    endTime: string,         // "15:00"
    duration: number,        // minutos
    timezone: string
  },
  source: 'app' | 'whatsapp' | 'phone' | 'walk-in' | 'ai',
  aiMetadata?: {
    conversationId?: string,
    confidence: number,      // 0-1
    suggestions?: string[],
    nlpData?: object
  },
  status: 'scheduled' | 'confirmed' | 'in-progress' | 
          'completed' | 'cancelled' | 'no-show',
  statusHistory: Array<{
    status: string,
    changedAt: Date,
    changedBy: string,
    reason?: string
  }>,
  financial: {
    servicePrice: number,
    discount?: number,
    discountReason?: string,
    finalPrice: number,
    paymentStatus: 'pending' | 'partial' | 'paid',
    paymentMethod?: string,
    commissionAmount?: number
  },
  checkin: {
    expectedAt: Date,
    arrivedAt?: Date,
    startedAt?: Date,
    completedAt?: Date
  },
  notes: {
    internal?: string,       // Notas da equipe
    forPatient?: string      // Observações para o paciente
  },
  reminders: Array<{
    type: 'confirmation' | 'reminder',
    scheduledFor: Date,
    sentAt?: Date,
    channel: string,
    status: string
  }>,
  rating?: {
    score: number,           // 1-5
    feedback?: string,
    ratedAt: Date
  },
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + scheduling.date
- patientId
- professionalId + scheduling.date
- status
- financial.paymentStatus
- code (unique)
```

#### `waiting_list`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  patientId: string,
  serviceId: string,
  professionalId?: string,   // Preferência
  preferences: {
    dates: Date[],           // Datas possíveis
    periods: Array<{
      dayOfWeek: number,
      startTime: string,
      endTime: string
    }>,
    flexible: boolean
  },
  priority: 'low' | 'medium' | 'high',
  reason?: string,
  aiScore?: number,          // Score de probabilidade de encaixe
  status: 'waiting' | 'notified' | 'scheduled' | 'expired',
  notifications: Array<{
    sentAt: Date,
    appointmentId?: string,
    response?: string
  }>,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + status
- patientId
- priority
- aiScore
```

### 4️⃣ MÓDULO DE PRONTUÁRIOS MÉDICOS

#### `medical_records`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  patientId: string,
  appointmentId?: string,
  type: 'anamnesis' | 'evolution' | 'prescription' | 'exam',
  template?: string,         // ID do template usado
  data: {
    // Estrutura dinâmica baseada no tipo
    encrypted: boolean,
    content: object | string // Se encrypted, string base64
  },
  attachments: Array<{
    type: 'image' | 'pdf' | 'video',
    fileId: string,
    description?: string,
    isEncrypted: boolean
  }>,
  signature: {
    professionalId: string,
    signedAt: Date,
    method: 'digital' | 'biometric',
    hash: string             // Hash do documento
  },
  revision: {
    version: number,
    previousVersion?: string, // ID da versão anterior
    changes?: object
  },
  access: {
    level: 'public' | 'restricted' | 'confidential',
    sharedWith?: string[],   // IDs de profissionais
    viewLog: Array<{
      userId: string,
      viewedAt: Date,
      ip?: string
    }>
  },
  compliance: {
    lgpd: boolean,
    retentionDays: number,
    deletionDate?: Date
  },
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + patientId
- appointmentId
- type
- signature.professionalId
- createdAt
```

#### `medical_images`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  patientId: string,
  recordId?: string,         // FK para medical_records
  appointmentId?: string,
  type: 'before' | 'after' | 'progress' | 'diagnostic',
  category: string,          // 'face', 'body', etc.
  metadata: {
    captureDate: Date,
    device?: string,
    settings?: object,       // Configurações da câmera
    measurements?: object,   // Medidas/análises
    aiAnalysis?: {
      provider: string,
      results: object,
      confidence: number
    }
  },
  files: Array<{
    original: {
      fileId: string,
      size: number,
      dimensions: {
        width: number,
        height: number
      }
    },
    processed?: {
      thumbnail: string,
      watermarked?: string,
      anonymized?: string
    }
  }>,
  comparison?: {
    beforeImageId?: string,
    percentage?: number,
    notes?: string
  },
  privacy: {
    isEncrypted: boolean,
    consentId: string,       // FK para consent_forms
    publicationAllowed: boolean,
    anonymizationRequired: boolean
  },
  tags?: string[],
  notes?: string,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + patientId
- type + category
- metadata.captureDate
- appointmentId
```

### 5️⃣ MÓDULO FINANCEIRO

#### `transactions`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  code: string,              // TRX-20240115-001
  type: 'income' | 'expense',
  category: string,          // 'service', 'product', 'salary', etc.
  subcategory?: string,
  description: string,
  amount: {
    value: number,
    currency: string
  },
  references: {
    appointmentId?: string,
    orderId?: string,
    patientId?: string,
    supplierId?: string,
    professionalId?: string
  },
  payment: {
    method: 'cash' | 'debit' | 'credit' | 'pix' | 'transfer',
    status: 'pending' | 'processing' | 'completed' | 'failed',
    dueDate?: Date,
    paidDate?: Date,
    installments?: {
      total: number,
      current: number
    },
    gateway?: {
      provider: string,
      transactionId: string,
      fee?: number
    }
  },
  accounting: {
    costCenter?: string,
    account?: string,
    tags?: string[],
    notes?: string
  },
  documents: Array<{
    type: 'invoice' | 'receipt' | 'contract',
    number?: string,
    fileId?: string
  }>,
  reconciliation: {
    status: 'pending' | 'reconciled' | 'error',
    reconciledAt?: Date,
    reconciledBy?: string
  },
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + createdAt
- type + category
- payment.status
- references.appointmentId
- references.patientId
- payment.dueDate
```

#### `commissions`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  professionalId: string,
  period: {
    month: number,
    year: number,
    startDate: Date,
    endDate: Date
  },
  appointments: Array<{
    appointmentId: string,
    serviceId: string,
    serviceAmount: number,
    commissionRate: number,
    commissionAmount: number,
    status: string
  }>,
  summary: {
    totalServices: number,
    totalServiceAmount: number,
    totalCommission: number,
    bonus?: number,
    deductions?: Array<{
      type: string,
      amount: number,
      reason: string
    }>,
    netAmount: number
  },
  payment: {
    status: 'pending' | 'approved' | 'paid',
    approvedBy?: string,
    approvedAt?: Date,
    paidAt?: Date,
    transactionId?: string
  },
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + period.year + period.month
- professionalId + period.year + period.month
- payment.status
```

### 6️⃣ MÓDULO DE ESTOQUE

#### `products`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  sku: string,               // Código único
  barcode?: string,
  name: string,
  description?: string,
  category: string,
  brand?: string,
  unit: 'un' | 'ml' | 'g' | 'cx',
  presentation?: string,     // "Caixa com 10 unidades"
  stock: {
    current: number,
    minimum: number,         // Estoque mínimo
    maximum?: number,        // Estoque máximo
    location?: string,       // Localização física
    lastCount?: {
      date: Date,
      quantity: number,
      countedBy: string
    }
  },
  costs: {
    lastPurchase: number,
    average: number,
    markup?: number,
    sellingPrice?: number
  },
  suppliers: Array<{
    supplierId: string,
    code?: string,           // Código no fornecedor
    leadTime?: number,       // Dias para entrega
    minOrder?: number
  }>,
  usage: {
    averageMonthly: number,
    lastUsed?: Date,
    services?: string[]      // IDs de serviços que usam
  },
  compliance: {
    needsPrescription?: boolean,
    anvisa?: string,
    expiryTracking: boolean,
    temperatureControl?: {
      min: number,
      max: number
    }
  },
  status: 'active' | 'inactive' | 'discontinued',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId
- sku (unique)
- barcode (unique)
- category
- stock.current
- status
```

#### `inventory_movements`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  movementType: 'in' | 'out' | 'adjustment' | 'transfer',
  reason: string,            // 'purchase', 'sale', 'usage', 'loss', etc.
  reference: {
    type: string,            // 'appointment', 'order', 'manual'
    id?: string
  },
  items: Array<{
    productId: string,
    sku: string,
    quantity: number,
    unit: string,
    batch?: {
      number: string,
      expiryDate?: Date
    },
    cost?: number,
    notes?: string
  }>,
  totals: {
    items: number,
    quantity: number,
    value?: number
  },
  source?: {
    clinicId?: string,       // Para transferências
    supplierId?: string,     // Para compras
    document?: string        // Nota fiscal
  },
  validation: {
    status: 'pending' | 'validated' | 'rejected',
    validatedBy?: string,
    validatedAt?: Date,
    notes?: string
  },
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId + createdAt
- movementType
- reference.type + reference.id
- validation.status
```

### 7️⃣ MÓDULO DE COMUNICAÇÃO

#### `communication_templates`
```typescript
{
  $id: string,
  tenantId?: string,         // null para templates globais
  clinicId?: string,
  name: string,
  code: string,              // 'appointment_confirmation'
  channel: 'email' | 'sms' | 'whatsapp' | 'push',
  type: 'transactional' | 'marketing' | 'internal',
  subject?: string,          // Para email
  content: {
    body: string,            // Com placeholders {{nome}}
    format: 'text' | 'html' | 'markdown',
    attachments?: string[],
    buttons?: Array<{
      text: string,
      url: string,
      style: string
    }>,
    mediaUrl?: string        // Para WhatsApp
  },
  variables: Array<{
    name: string,
    type: string,
    required: boolean,
    defaultValue?: any
  }>,
  settings: {
    priority: 'low' | 'medium' | 'high',
    retryPolicy?: {
      attempts: number,
      interval: number
    },
    scheduling?: {
      allowedHours?: {
        start: string,
        end: string
      },
      timezone: string
    }
  },
  analytics: {
    sent: number,
    delivered: number,
    opened: number,
    clicked: number,
    failed: number
  },
  status: 'active' | 'inactive' | 'draft',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId
- code (unique per tenant)
- channel
- type
- status
```

#### `campaigns`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  name: string,
  description?: string,
  type: 'one-time' | 'recurring' | 'triggered',
  objective: 'retention' | 'reactivation' | 'promotion' | 'education',
  target: {
    segment: {
      type: 'all' | 'filter' | 'list',
      filters?: object,      // MongoDB-style query
      listId?: string
    },
    estimatedSize: number,
    testGroup?: {
      percentage: number,
      control: boolean
    }
  },
  content: {
    templateId: string,
    variations?: Array<{     // Para A/B testing
      name: string,
      templateId: string,
      percentage: number
    }>
  },
  schedule: {
    startDate: Date,
    endDate?: Date,
    frequency?: {
      type: 'daily' | 'weekly' | 'monthly',
      interval: number,
      daysOfWeek?: number[],
      dayOfMonth?: number
    },
    timezone: string
  },
  budget?: {
    total: number,
    perMessage?: number,
    spent: number
  },
  performance: {
    sent: number,
    delivered: number,
    opened: number,
    clicked: number,
    converted: number,
    revenue: number,
    roi?: number
  },
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed',
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + clinicId
- type
- status
- schedule.startDate
```

### 8️⃣ MÓDULO DE ANALYTICS

#### `kpi_definitions`
```typescript
{
  $id: string,
  tenantId?: string,         // null para KPIs globais
  code: string,              // 'monthly_revenue'
  name: string,
  description: string,
  category: 'financial' | 'operational' | 'clinical' | 'marketing',
  calculation: {
    type: 'sum' | 'average' | 'count' | 'percentage' | 'custom',
    formula?: string,        // Para custom
    source: string,          // Collection
    field?: string,
    filters?: object,
    groupBy?: string[]
  },
  display: {
    unit: string,            // 'R$', '%', 'pts'
    format: string,          // 'currency', 'percentage'
    decimals: number,
    trend: 'higher' | 'lower', // Melhor se maior ou menor
    benchmarks?: Array<{
      label: string,
      value: number,
      color: string
    }>
  },
  refresh: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly',
    lastCalculated?: Date
  },
  access: {
    roles: string[],
    clinics?: string[]
  },
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- code (unique)
- category
- status
```

#### `analytics_data`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId: string,
  kpiCode: string,
  period: {
    type: 'hour' | 'day' | 'week' | 'month' | 'year',
    date: Date,              // Início do período
    year: number,
    month?: number,
    week?: number,
    day?: number,
    hour?: number
  },
  dimensions: {              // Para análises multidimensionais
    professional?: string,
    service?: string,
    category?: string,
    // ... outras dimensões
  },
  metrics: {
    value: number,
    previousValue?: number,  // Período anterior
    change?: number,         // Variação %
    breakdown?: object       // Detalhamento
  },
  metadata: {
    calculatedAt: Date,
    dataQuality: number,     // 0-1
    notes?: string
  },
  createdAt: Date
}

// Índices:
- tenantId + clinicId + kpiCode + period.date
- kpiCode + period.type
- period.year + period.month
- dimensions.professional
```

### 9️⃣ MÓDULO DE INTEGRAÇÕES E LOGS

#### `integrations_config`
```typescript
{
  $id: string,
  tenantId: string,
  clinicId?: string,         // null para org-wide
  provider: 'whatsapp' | 'google' | 'mercadopago' | 'twilio' | 'openai',
  credentials: {
    // Criptografado
    encrypted: string
  },
  settings: object,          // Configurações específicas
  permissions: string[],     // Escopos/permissões
  status: 'active' | 'inactive' | 'error',
  lastSync?: Date,
  errorLog?: Array<{
    date: Date,
    error: string
  }>,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Índices:
- tenantId + provider
- clinicId
- status
```

#### `audit_logs`
```typescript
{
  $id: string,
  tenantId: string,
  userId: string,
  action: string,            // 'create', 'update', 'delete', 'view'
  resource: {
    type: string,            // Collection name
    id: string,
    name?: string
  },
  changes?: {
    before?: object,
    after?: object
  },
  context: {
    ip: string,
    userAgent: string,
    clinicId?: string,
    sessionId?: string
  },
  compliance: {
    lgpd?: boolean,
    reason?: string,         // Justificativa para acesso
    authorizedBy?: string
  },
  createdAt: Date
}

// Índices:
- tenantId + createdAt
- userId + createdAt
- resource.type + resource.id
- action
```

---

## 🔐 SEGURANÇA E PERMISSÕES

### Regras ABAC (Attribute-Based Access Control)

```javascript
// Exemplo de regra para appointments
{
  "read": [
    // Super admin
    {"role": "super_admin"},
    
    // Owner da organização
    {"role": "owner", "organizationId": "$request.auth.organizationId"},
    
    // Staff da clínica
    {"role": ["admin", "manager", "professional", "receptionist"], 
     "clinicId": "$request.auth.clinicId"},
    
    // Paciente vê seus próprios
    {"role": "client", "patientId": "$request.auth.userId"}
  ],
  
  "write": [
    // Apenas staff pode criar/editar
    {"role": ["admin", "manager", "professional", "receptionist"],
     "clinicId": "$request.auth.clinicId"}
  ],
  
  "delete": [
    // Apenas admin pode deletar
    {"role": ["admin"], "clinicId": "$request.auth.clinicId"}
  ]
}
```

### Criptografia de Dados Sensíveis

```javascript
// Campos que devem ser criptografados:
const ENCRYPTED_FIELDS = [
  'patients.personalInfo.cpf',
  'patients.personalInfo.rg',
  'medical_records.data.content',
  'integrations_config.credentials'
];

// Usar Appwrite Functions para criptografar/descriptografar
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Infraestrutura Base (Semana 1)
1. ✅ Configurar Appwrite Cloud
2. ✅ Criar database principal
3. ⏳ Criar collections do módulo de identidade
4. ⏳ Implementar sistema de permissões
5. ⏳ Configurar índices essenciais

### Fase 2: Módulos Core (Semana 2-3)
1. Implementar módulo de pacientes
2. Implementar módulo de agendamentos
3. Criar Appwrite Functions para IA
4. Configurar realtime subscriptions
5. Testes de integração

### Fase 3: Módulos Avançados (Semana 4)
1. Implementar prontuários médicos com criptografia
2. Implementar módulo financeiro
3. Implementar gestão de estoque
4. Configurar analytics e KPIs

### Fase 4: Comunicação e Finalização (Semana 5)
1. Implementar templates e campanhas
2. Configurar integrações externas
3. Implementar audit logs
4. Migração de dados do Supabase
5. Testes de carga e otimização

---

## 📊 MÉTRICAS DE SUCESSO

### Performance
- Tempo de resposta < 200ms para queries
- Uptime > 99.9%
- Suporte a 10k requisições/segundo

### Escalabilidade  
- Capacidade para 1M+ documentos por collection
- Multi-região com latência < 100ms
- Backup automático a cada 6 horas

### Segurança
- 100% dos dados sensíveis criptografados
- Audit log completo de todas as operações
- Compliance LGPD/HIPAA

---

## 🛠️ SCRIPTS DE CRIAÇÃO

```bash
# Script exemplo para criar collection via CLI
appwrite databases createCollection \
  --databaseId "main" \
  --collectionId "patients" \
  --name "Pacientes" \
  --permissions "read([\"role:all\"])" \
  --documentSecurity true

# Adicionar atributos
appwrite databases createStringAttribute \
  --databaseId "main" \
  --collectionId "patients" \
  --key "tenantId" \
  --size 255 \
  --required true

# Criar índice
appwrite databases createIndex \
  --databaseId "main" \
  --collectionId "patients" \
  --key "tenantId_clinicId" \
  --type "key" \
  --attributes "tenantId,clinicId"
```

---

## 📝 CONSIDERAÇÕES FINAIS

Este planejamento contempla:
- ✅ Arquitetura multi-tenant escalável
- ✅ Segurança e compliance LGPD
- ✅ IA integrada nativamente
- ✅ Performance otimizada
- ✅ Módulos completos para operação

O sistema está pronto para suportar as demandas de clínicas de estética premium com foco em automação inteligente e experiência superior.