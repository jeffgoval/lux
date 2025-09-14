/**
 * VipConcierge - Concierge Virtual para Clientes VIP
 * Interface de chat inteligente com assistência personalizada 24h
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Sparkles,
  Crown,
  Clock,
  Calendar,
  CreditCard,
  Phone,
  MapPin,
  Star,
  Smile,
  Mic,
  MicOff,
  Paperclip,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  User,
  Bot,
  Zap,
  Gift
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =====================================================
// INTERFACES
// =====================================================

interface VipConciergeProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'concierge';
  timestamp: Date;
  type: 'text' | 'action' | 'suggestion' | 'appointment' | 'credit';
  metadata?: MessageMetadata;
  attachments?: ChatAttachment[];
}

interface MessageMetadata {
  actionId?: string;
  appointmentId?: string;
  creditAmount?: number;
  suggestions?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  size: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  premium?: boolean;
}

interface SuggestionChip {
  id: string;
  text: string;
  category: 'appointment' | 'service' | 'info' | 'support';
}

// =====================================================
// DADOS MOCK
// =====================================================

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Olá! Sou seu Concierge Virtual premium. Como posso ajudá-la hoje? 🌟',
    sender: 'concierge',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    type: 'text',
    metadata: { priority: 'normal' }
  },
  {
    id: '2',
    content: 'Gostaria de reagendar meu próximo agendamento',
    sender: 'user',
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    type: 'text'
  },
  {
    id: '3',
    content: 'Perfeito! Vejo que você tem um agendamento de Harmonização Facial Premium para hoje às 14:00. Como cliente Diamond, você pode reagendar sem nenhuma taxa, até mesmo com menos de 2h de antecedência. ✨',
    sender: 'concierge',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    type: 'action',
    metadata: { 
      appointmentId: '123',
      suggestions: ['Reagendar para amanhã', 'Ver próxima semana', 'Horário de urgência']
    }
  }
];

const quickActions: QuickAction[] = [
  {
    id: 'schedule',
    label: 'Novo Agendamento',
    icon: Calendar,
    action: () => ,
    premium: true
  },
  {
    id: 'reschedule',
    label: 'Reagendar',
    icon: Clock,
    action: () => 
  },
  {
    id: 'credits',
    label: 'Meus Créditos',
    icon: CreditCard,
    action: () => 
  },
  {
    id: 'support',
    label: 'Suporte VIP',
    icon: Phone,
    action: () => ,
    premium: true
  }
];

const suggestionChips: SuggestionChip[] = [
  { id: '1', text: 'Reagendar próximo agendamento', category: 'appointment' },
  { id: '2', text: 'Ver meus benefícios VIP', category: 'info' },
  { id: '3', text: 'Consultar saldo de créditos', category: 'info' },
  { id: '4', text: 'Agendar limpeza de pele', category: 'service' },
  { id: '5', text: 'Falar com especialista', category: 'support' }
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const VipConcierge: React.FC<VipConciergeProps> = ({ className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simular resposta do concierge
    setTimeout(() => {
      const conciergeResponse = generateConciergeResponse(inputValue);
      setMessages(prev => [...prev, conciergeResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const generateConciergeResponse = (userInput: string): ChatMessage => {
    const responses = [
      'Entendi perfeitamente! Vou processar sua solicitação imediatamente. Como cliente Diamond, você tem acesso aos nossos melhores horários. ✨',
      'Perfeito! Já estou verificando as melhores opções para você. Sua experiência VIP é nossa prioridade. 👑',
      'Claro! Vou cuidar disso pessoalmente. Você merece apenas o melhor atendimento. 🌟',
      'Excelente escolha! Como cliente premium, vou garantir que tudo seja perfeito para você. ⭐'
    ];

    return {
      id: Date.now().toString(),
      content: responses[Math.floor(Math.random() * responses.length)],
      sender: 'concierge',
      timestamp: new Date(),
      type: 'text',
      metadata: { priority: 'normal' }
    };
  };

  const handleSuggestionClick = (suggestion: SuggestionChip) => {
    setInputValue(suggestion.text);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implementar gravação de áudio
  };

  const MessageBubble: React.FC<{ message: ChatMessage; isLast: boolean }> = ({ message, isLast }) => {
    const isUser = message.sender === 'user';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex mb-4",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {!isUser && (
          <Avatar className="mr-2 ring-2 ring-yellow-400/50">
            <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black">
              <Crown className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl relative",
          isUser 
            ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black ml-auto" 
            : "bg-white/10 text-white backdrop-blur-sm border border-purple-200/20"
        )}>
          {message.type === 'action' && message.metadata?.suggestions && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {message.metadata.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          <div className={cn(
            "flex items-center justify-between mt-2 text-xs opacity-70",
            isUser ? "text-black/70" : "text-white/70"
          )}>
            <span>{format(message.timestamp, 'HH:mm', { locale: ptBR })}</span>
            {isUser && <CheckCircle className="h-3 w-3" />}
          </div>
          
          {!isUser && (
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="h-3 w-3 text-yellow-400" />
            </motion.div>
          )}
        </div>
        
        {isUser && (
          <Avatar className="ml-2">
            <AvatarFallback className="bg-purple-600 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn("min-h-screen p-8", className)}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
                  <Crown className="h-6 w-6 text-black" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isConnected ? "bg-green-400" : "bg-red-400"
                  )} />
                </motion.div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-white">Concierge Premium</h1>
                <div className="flex items-center space-x-2 text-sm text-purple-200/60">
                  <span>Assistência VIP 24h</span>
                  <div className="w-1 h-1 bg-purple-200/60 rounded-full" />
                  <span className={cn(
                    "flex items-center",
                    isConnected ? "text-green-400" : "text-red-400"
                  )}>
                    <div className="w-1 h-1 bg-current rounded-full mr-1" />
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-purple-200/60 hover:text-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mais opções</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Chat Principal */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm h-[600px] flex flex-col">
              
              {/* Chat Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-yellow-400" />
                    <CardTitle className="text-white">Chat Premium</CardTitle>
                    <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                      VIP
                    </Badge>
                  </div>
                  
                  {isTyping && (
                    <div className="flex items-center space-x-2 text-sm text-purple-200/60">
                      <Bot className="h-4 w-4" />
                      <span>Concierge digitando...</span>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex space-x-1"
                      >
                        <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                        <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                        <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                      </motion.div>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {/* Chat Messages */}
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLast={index === messages.length - 1}
                    />
                  ))}
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 mb-4"
                    >
                      <Avatar className="ring-2 ring-yellow-400/50">
                        <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black">
                          <Crown className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="flex space-x-1"
                        >
                          <div className="w-2 h-2 bg-white rounded-full" />
                          <div className="w-2 h-2 bg-white rounded-full" />
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </ScrollArea>
                
                <Separator className="bg-purple-200/10" />
                
                {/* Input Area */}
                <div className="p-4 space-y-3">
                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2">
                    {suggestionChips.slice(0, 3).map(suggestion => (
                      <Button
                        key={suggestion.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="bg-white/5 border-purple-200/20 text-purple-200 hover:bg-white/10 text-xs"
                      >
                        {suggestion.text}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Input */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-purple-200/60 hover:text-white"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite sua mensagem..."
                        className="bg-white/10 border-purple-200/20 text-white placeholder:text-purple-200/40 pr-12"
                      />
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleRecording}
                        className={cn(
                          "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
                          isRecording ? "text-red-400" : "text-purple-200/60 hover:text-white"
                        )}
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar - Actions */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            
            {/* Quick Actions */}
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {quickActions.map(action => {
                  const Icon = action.icon;
                  
                  return (
                    <Button
                      key={action.id}
                      onClick={action.action}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left font-medium transition-all duration-200",
                        action.premium 
                          ? "text-yellow-300 hover:bg-yellow-400/10 border border-yellow-400/20" 
                          : "text-purple-200 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {action.label}
                      {action.premium && <Crown className="ml-auto h-3 w-3" />}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Status VIP */}
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Gift className="h-5 w-5 mr-2 text-yellow-400" />
                  Status VIP
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg inline-block mb-2">
                    <Crown className="h-6 w-6 text-black" />
                  </div>
                  <p className="text-white font-semibold">Diamond</p>
                  <p className="text-xs text-purple-200/60">Nível Premium</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">Reagendamentos</span>
                    <span className="text-white">Ilimitados</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">Suporte</span>
                    <span className="text-green-400">24h Premium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">Desconto</span>
                    <span className="text-yellow-400">20%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VipConcierge;
