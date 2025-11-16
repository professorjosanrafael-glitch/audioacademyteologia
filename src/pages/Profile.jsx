import React, { useState, useEffect } from "react";
// [ALTERAÇÃO 1: REMOÇÃO E NOVOS IMPORTS DE BACKEND]
// REMOVIDO: import { base44 } from "@/api/base44Client";
import { User, Mail, Lock, Crown, MessageCircle, Save, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// [ADICIONAR: Imports do Firebase]
import { onAuthStateChanged, updatePassword } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { getUserProfile } from "@/firebase/dataService";  // nova função correta
import { db } from "@/firebase/firebaseConfig";

import { doc, setDoc } from "firebase/firestore"; // Para atualização do Firestore
import { getFunctions, httpsCallable } from "firebase/functions"; // Para gestão de assinatura Stripe (se necessário)

const tierConfig = {
  free: {
    label: "Free",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    gradient: "from-gray-600 to-gray-700",
    icon: Sparkles,
    description: "Acesso básico à plataforma"
  },
  basic: {
    label: "Básico",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    gradient: "from-blue-600 to-cyan-600",
    icon: User,
    description: "Acesso a todos os episódios em áudio"
  },
  premium: {
    label: "Premium",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    gradient: "from-cyan-500 to-blue-500", // ALTERADO: from-violet-600 to-fuchsia-600
    icon: Crown,
    description: "Acesso completo incluindo aulas escritas"
  }
};

export default function Profile() {
  const [user, setUser] = useState(null); // Documento de perfil do Firestore
  const [currentUser, setCurrentUser] = useState(null); // Objeto de usuário do Firebase Auth
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // [ALTERAÇÃO 2: Substituir base44.auth.me() pelo listener do Firebase]
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && !authUser.isAnonymous) {
        setCurrentUser(authUser); // Guarda o objeto de autenticação para updatePassword
        try {
          const profile = await getUserProfile(authUser.uid);
          setUser(profile);
          setFullName(profile.full_name || "");
          setEmail(authUser.email || ""); // Pega o email diretamente do objeto Auth
        } catch (error) {
          console.error("Erro ao carregar perfil:", error);
          // Em um app real, redirecionaria para o login se falhar
        }
      } else {
        // Redireciona se não estiver logado ou se for usuário anônimo
        // REMOVIDO: base44.auth.redirectToLogin(window.location.href);
        // Em um app React, você faria um navigate, mas vamos deixar carregar null por enquanto
      }
    });

    return () => unsubscribe();
  }, []);

  // [ALTERAÇÃO 3: Lógica de Salvar Dados e Senha com Firebase/Firestore]
  const handleSave = async () => {
    if (!currentUser || !user) {
        toast.error("Usuário não autenticado.");
        return;
    }

    setLoading(true);
    let success = true;

    try {
        // --- 1. Atualizar Nome no Firestore ---
        const profileRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profiles', currentUser.uid);
        await setDoc(profileRef, {
            full_name: fullName,
        }, { merge: true }); // Merge garante que outros campos (como tier) não sejam apagados
        
        // Atualiza o estado local
        setUser({ ...user, full_name: fullName });

        // --- 2. Atualizar Senha no Firebase Auth ---
        if (newPassword) {
            if (newPassword.length < 6) {
                toast.error("A nova senha deve ter pelo menos 6 caracteres.");
                setLoading(false);
                return;
            }
            // OBS: updatePassword requer que o usuário tenha feito login recentemente.
            // Se o usuário ficar inativo, o Firebase pedirá reautenticação (não tratada aqui).
            await updatePassword(currentUser, newPassword);
            setNewPassword(""); // Limpa o campo após sucesso
            toast.success("Nome e senha atualizados com sucesso!");
        } else {
             toast.success("Nome atualizado com sucesso!");
        }
    } catch (error) {
        success = false;
        console.error("Erro ao atualizar dados:", error);
        
        // Trata erros comuns do Firebase Auth
        if (error.code === 'auth/requires-recent-login') {
             toast.error("Por favor, saia e faça login novamente para alterar sua senha.");
        } else {
             toast.error("Erro ao salvar alterações. Verifique o console.");
        }
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSupport = () => {
    const phoneNumber = "5511999999999"; // Substitua pelo número real
    const message = encodeURIComponent("Olá! Gostaria de falar sobre o AudioAcademy.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  // [ALTERAÇÃO 4: Condição de Carregamento/Não Autenticado]
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-400">Carregando perfil...</p>
      </div>
    );
  }

  const currentTier = user.subscription_tier || 'free';
  const tierInfo = tierConfig[currentTier];
  const TierIcon = tierInfo.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Meu Perfil</h1>
        <p className="text-slate-400">Gerencie suas informações e preferências</p>
      </div>

      <div className="grid gap-6">
        {/* Personal Data Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> {/* ALTERADO: text-violet-400 para text-cyan-400 */}
              Dados Pessoais
            </CardTitle>
            <CardDescription className="text-slate-400">
              Atualize suas informações de conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="pl-10 bg-slate-900/50 border-slate-700 text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" // ALTERADO: from-violet-600 to-fuchsia-600
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Status da Assinatura
            </CardTitle>
            <CardDescription className="text-slate-400">
              Seu plano atual e benefícios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 p-6">
              <div className={`absolute inset-0 bg-gradient-to-br ${tierInfo.gradient} opacity-10`} />
              
              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tierInfo.gradient} flex items-center justify-center`}>
                    <TierIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      Plano {tierInfo.label}
                    </h3>
                    <p className="text-sm text-slate-400">{tierInfo.description}</p>
                  </div>
                </div>
                <Badge className={`${tierInfo.bgColor} ${tierInfo.color} border-0 text-sm px-3 py-1`}>
                  Ativo
                </Badge>
              </div>

              {currentTier !== 'premium' && (
                <div className="relative pt-4 border-t border-slate-700">
                  <p className="text-slate-300 mb-3">
                    Faça upgrade e tenha acesso a mais recursos
                  </p>
                  <Link to={createPageUrl("Pricing")}>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"> {/* ALTERADO: from-violet-600 to-fuchsia-600 */}
                      <Crown className="w-4 h-4 mr-2" />
                      Ver Planos
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              Suporte e Atendimento
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tire suas dúvidas ou envie sugestões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">Atendimento Humano</h4>
                <p className="text-sm text-slate-400 mb-3">
                  Nossa equipe está pronta para ajudar você com dúvidas, sugestões ou qualquer problema que encontrar.
                </p>
                <Button
                  onClick={handleWhatsAppSupport}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar no WhatsApp
                </Button>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              <p className="mb-2">Horário de atendimento:</p>
              <p>Segunda a Sexta: 9h às 18h</p>
              <p>Sábado: 9h às 13h</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}