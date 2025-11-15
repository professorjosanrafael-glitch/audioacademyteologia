import React, { useState, useEffect } from "react";
// [ALTERAÇÃO 1: REMOÇÃO E NOVOS IMPORTS DE BACKEND]
// REMOVIDO: import { base44 } from "@/api/base44Client";
import { Check, Crown, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

// [ADICIONAR: Imports do Firebase]
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { getUserProfile } from "@/firebase/dataService";

import { getFunctions, httpsCallable } from "firebase/functions"; // Cloud Functions para Stripe

// Dados dos planos, inalterados, pois são estáticos no front-end:
const plans = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "grátis",
    icon: Sparkles,
    gradient: "from-slate-600 to-slate-700",
    features: [
      "Acesso ao primeiro episódio de cada audiobook",
      "Navegue pela biblioteca completa",
      "Qualidade de áudio padrão"
    ],
    limitations: [
      "Sem acesso a episódios completos",
      "Sem aulas escritas"
    ]
  },
  {
    id: "basic",
    name: "Básico",
    price: "R$ 29,90",
    period: "por mês",
    icon: Zap,
    gradient: "from-blue-600 to-cyan-600",
    popular: false,
    // [CHAVE INSERIDA: Price ID do Plano Básico]
    stripePriceId: "price_1SKq9jEaNvDjXAylOklnJVaX", 
    features: [
      "Acesso completo a todos os episódios em áudio",
      "Todos os audiobooks desbloqueados",
      "Qualidade de áudio HD",
      "Download para ouvir offline",
      "Sem anúncios"
    ],
    limitations: [
      "Sem acesso às aulas escritas"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 49,90",
    period: "por mês",
    icon: Crown,
    gradient: "from-violet-600 to-fuchsia-600",
    popular: true,
    // [CHAVE INSERIDA: Price ID do Plano Premium]
    stripePriceId: "price_1SKqCjEaNvDjXAylmQtnFMZZ", 
    features: [
      "Tudo do plano Básico",
      "Aulas escritas completas em markdown",
      "Análises detalhadas e resumos",
      "Material de apoio e referências",
      "Acesso antecipado a novos conteúdos",
      "Suporte prioritário"
    ],
    limitations: []
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  // 'user' armazena o perfil do Firestore (com subscription_tier)
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // [ALTERAÇÃO 2: Lógica de Autenticação com Firebase]
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setAuthReady(true);
      if (authUser) {
        try {
          // Busca o perfil do Firestore
          const profile = await getUserProfile(authUser.uid); 
          setUser(profile);
        } catch (error) {
          console.error("Erro ao carregar perfil do Firestore:", error);
          setUser(null);
        }
      } else {
        setUser(null); 
      }
    });

    return () => unsubscribe();
  }, []);

  // [ALTERAÇÃO 3: Nova Função para Assinatura usando Stripe/Cloud Functions]
  const handleSubscribe = async (planId) => {
    // 1. Caso Free: Apenas confirma o plano atual
    if (planId === 'free') {
      toast.info("Você já tem acesso ao plano Free. Para desbloquear mais, escolha um plano pago!");
      return;
    }

    // 2. Verifica Autenticação
    if (!user) {
      // Se não estiver logado, redireciona para o login.
      // O Stripe exige um usuário logado para criar a sessão.
      toast.info("Por favor, faça login ou cadastre-se para assinar um plano.");
      navigate(createPageUrl("Login")); // Assumindo que você tem uma página de Login
      return;
    }

    // 3. Verifica Plano Atual
    if (user.subscription_tier === planId) {
      toast.info("Você já está neste plano.");
      return;
    }
    
    // 4. Inicia o Checkout com Stripe
    setLoading(planId);
    
    try {
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan || !selectedPlan.stripePriceId) {
        throw new Error("ID de preço do Stripe não configurado para este plano.");
      }

      const functions = getFunctions();
      // O nome desta função 'createStripeCheckoutSession' será o nome do seu Cloud Function
      const createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');

      // Chamada da Cloud Function (Backend Serverless)
      const response = await createCheckoutSession({ 
        priceId: selectedPlan.stripePriceId,
        // Opcional: URL para onde o Stripe deve retornar após o sucesso/falha
        successUrl: window.location.origin + createPageUrl("Home"), 
        cancelUrl: window.location.href,
      });

      const { sessionId } = response.data;
      
      if (sessionId) {
        // [ADICIONAR: Importar e usar o Stripe.js para redirecionamento]
        // NOTA: Você precisará carregar o Stripe.js SDK na sua aplicação (npm install @stripe/stripe-js)
        // A chave pública do Stripe DEVE ser a mesma que você colocou no App.jsx.
        const stripe = window.Stripe('SUA_CHAVE_PÚBLICA_DO_STRIPE'); // ⚠️ SUBSTITUIR PELA CHAVE PÚBLICA REAL!
        
        // Redireciona o usuário para o Checkout seguro do Stripe
        await stripe.redirectToCheckout({ sessionId });

        // O processo de atualização do status do plano (Firestore) será feito pelo Webhook do Stripe (Cloud Function)
      } else {
        throw new Error("Não foi possível obter o ID da sessão de checkout.");
      }
      
    } catch (error) {
      console.error("Erro no processo de assinatura:", error);
      toast.error("Erro ao iniciar o pagamento. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };
  
  // Condição de carregamento enquanto o Auth não terminou
  if (!authReady) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <p className="text-slate-400">Carregando planos e perfil de usuário...</p>
        </div>
    );
  }

  const currentTier = user?.subscription_tier || 'free';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 mb-6">
          <Crown className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-slate-300">Escolha o melhor plano para você</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Planos e Preços
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
          Invista no seu conhecimento com acesso a audiobooks de qualidade e material didático completo
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentTier === plan.id;
          const isUpgrade = ['basic', 'premium'].indexOf(plan.id) > ['basic', 'premium'].indexOf(currentTier);

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl overflow-hidden border transition-all ${
                plan.popular
                  ? "border-violet-500 shadow-2xl shadow-violet-500/25 md:scale-105"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
              )}
              
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 text-white px-4 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}

              <div className="p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                {/* Plan Header */}
                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">/ {plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center mt-0.5`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, idx) => (
                    <div key={idx} className="flex items-start gap-3 opacity-50">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center mt-0.5">
                        <span className="text-xs text-slate-500">✕</span>
                      </div>
                      <span className="text-sm text-slate-400 line-through">{limitation}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  // [ALTERAÇÃO 4: Chama a nova função handleSubscribe]
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || loading === plan.id}
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                      : "bg-slate-700 hover:bg-slate-600"
                  } ${isCurrentPlan ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading === plan.id 
                    ? "Processando..." 
                    : isCurrentPlan 
                      ? "Plano Atual" 
                      : isUpgrade 
                        ? "Fazer Upgrade" 
                        : "Selecionar Plano"
                  }
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-8">Perguntas Frequentes</h2>
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Posso cancelar a qualquer momento?</h3>
            <p className="text-slate-400">
              Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas adicionais.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">O que são as aulas escritas?</h3>
            <p className="text-slate-400">
              São materiais complementares em formato texto/markdown com análises detalhadas, resumos e referências para aprofundar seu estudo.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Posso fazer upgrade do meu plano?</h3>
            <p className="text-slate-400">
              Sim! Você pode fazer upgrade do Free para Básico ou Premium, ou do Básico para Premium a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}