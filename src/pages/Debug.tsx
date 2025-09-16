/**
 * 🔍 PÁGINA DE DEBUG
 * 
 * Página para debugar problemas de autenticação
 */

import React from 'react';
import { AuthDebug } from '@/components/debug/AuthDebug';

export default function Debug() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Debug da Aplicação</h1>
        <AuthDebug />
      </div>
    </div>
  );
}