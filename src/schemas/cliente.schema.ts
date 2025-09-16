/**
 * Zod validation schemas for client data
 * Implements comprehensive validation for client forms
 */

import { z } from 'zod';

// Phone number validation regex (Brazilian format)
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

// CPF validation regex
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

// CEP validation regex
const cepRegex = /^\d{5}-\d{3}$/;

// Email validation
const emailSchema = z.string()
  .email('Email inválido')
  .min(1, 'Email é obrigatório');

// Phone validation
const phoneSchema = z.string()
  .min(1, 'Telefone é obrigatório')
  .regex(phoneRegex, 'Formato de telefone inválido. Use (XX) XXXXX-XXXX');

// CPF validation (optional)
const cpfSchema = z.string()
  .optional()
  .refine((val) => !val || cpfRegex.test(val), {
    message: 'Formato de CPF inválido. Use XXX.XXX.XXX-XX'
  });

// CEP validation (optional)
const cepSchema = z.string()
  .optional()
  .refine((val) => !val || cepRegex.test(val), {
    message: 'Formato de CEP inválido. Use XXXXX-XXX'
  });

// Address schema
export const enderecoSchema = z.object({
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: cepSchema,
});

// Main client schema - Simplified for development (only name required)
export const clienteSchema = z.object({
  // Required fields - Only name for now
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  // Optional fields - All others are optional during development
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  telefone: z.string()
    .optional()
    .refine((val) => !val || val === '' || phoneRegex.test(val), {
      message: 'Formato de telefone inválido. Use (XX) XXXXX-XXXX'
    }),
  
  // Optional personal data
  cpf: cpfSchema,
  dataNascimento: z.string().optional(),
  
  // Address (optional)
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: cepSchema,
  
  // Additional info (optional)
  profissao: z.string().optional(),
  estadoCivil: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo']).optional(),
  categoria: z.enum(['premium', 'vip', 'regular']).optional(),
  observacoes: z.string().optional(),
  
  // Consent (optional for development)
  consentimento: z.boolean().optional(),
  
  // Marketing consent (optional)
  marketing: z.boolean().optional(),
});

// Schema for client update (all fields optional except id)
export const clienteUpdateSchema = clienteSchema.partial().extend({
  id: z.string().min(1, 'ID é obrigatório'),
  consentimento: z.boolean().optional(), // Allow partial updates without re-consent
});

// Type inference
export type ClienteFormData = z.infer<typeof clienteSchema>;
export type ClienteUpdateData = z.infer<typeof clienteUpdateSchema>;

// Validation helper functions
export const validateClienteForm = (data: unknown) => {
  return clienteSchema.safeParse(data);
};

export const validateClienteUpdate = (data: unknown) => {
  return clienteUpdateSchema.safeParse(data);
};