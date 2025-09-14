// Script para debugar a página de auth
// Execute este script no console do navegador na página /auth

console.log('🔍 DEBUGANDO PÁGINA DE AUTH...\n');

// 1. Verificar elementos na página
console.log('1. Elementos na página:');
const allElements = document.querySelectorAll('*');
console.log(`Total de elementos: ${allElements.length}`);

// 2. Procurar por texto "não autenticado" ou similar
console.log('\n2. Procurando por textos suspeitos:');
const suspiciousTexts = [
  'não autenticado',
  'Usuário não autenticado',
  'não está autenticado',
  'Acesso negado',
  'Não autenticado'
];

suspiciousTexts.forEach(text => {
  const elements = Array.from(allElements).filter(el => 
    el.textContent && el.textContent.toLowerCase().includes(text.toLowerCase())
  );
  
  if (elements.length > 0) {
    console.log(`❌ ENCONTRADO: "${text}"`);
    elements.forEach(el => {
      console.log(`   Elemento: ${el.tagName}`);
      console.log(`   Classe: ${el.className}`);
      console.log(`   Texto: ${el.textContent.trim()}`);
      console.log(`   HTML: ${el.outerHTML.substring(0, 200)}...`);
      console.log('---');
    });
  } else {
    console.log(`✅ Não encontrado: "${text}"`);
  }
});

// 3. Verificar toasts/alerts
console.log('\n3. Verificando toasts e alerts:');
const toasts = document.querySelectorAll('[data-sonner-toast], .toast, [role="alert"]');
console.log(`Toasts encontrados: ${toasts.length}`);
toasts.forEach((toast, i) => {
  console.log(`Toast ${i + 1}: ${toast.textContent}`);
});

// 4. Verificar erros no console
console.log('\n4. Verificando erros recentes no console:');
// (Os erros já aparecerão no console)

// 5. Verificar estado do contexto de auth
console.log('\n5. Verificando contexto de auth:');
try {
  // Tentar acessar o contexto React (se disponível)
  const reactFiber = document.querySelector('#root')._reactInternalInstance || 
                     document.querySelector('#root')._reactInternals;
  console.log('React fiber encontrado:', !!reactFiber);
} catch (e) {
  console.log('Não foi possível acessar o contexto React');
}

// 6. Verificar URL atual
console.log('\n6. Informações da página:');
console.log(`URL: ${window.location.href}`);
console.log(`Path: ${window.location.pathname}`);
console.log(`Search: ${window.location.search}`);

// 7. Verificar localStorage/sessionStorage
console.log('\n7. Verificando storage:');
console.log('LocalStorage keys:', Object.keys(localStorage));
console.log('SessionStorage keys:', Object.keys(sessionStorage));

// Verificar tokens
const supabaseKeys = Object.keys(localStorage).filter(key => 
  key.includes('supabase') || key.includes('auth')
);
console.log('Chaves relacionadas a auth:', supabaseKeys);

console.log('\n🎯 CONCLUSÃO:');
console.log('Se você viu "❌ ENCONTRADO" acima, essa é a fonte da mensagem.');
console.log('Se não encontrou nada, a mensagem pode estar vindo de:');
console.log('1. Um toast que já desapareceu');
console.log('2. Um componente que renderiza condicionalmente');
console.log('3. Um erro JavaScript que não foi capturado');
console.log('4. Um componente de loading/erro global');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Recarregue a página e execute este script imediatamente');
console.log('2. Verifique o Network tab para requests falhando');
console.log('3. Verifique se há guards sendo aplicados incorretamente');
