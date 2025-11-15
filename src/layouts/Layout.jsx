import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils/createPageUrl"; 
import { Headphones, Library, Crown, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";



// [ALTERAÇÃO NECESSÁRIA 1: Importar Firebase Auth e o Serviço de Usuário]
// REMOVER: import { base44 } from "@/api/base44Client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { getUserProfile } from "@/firebase/dataService";


// [ALTERAÇÃO NECESSÁRIA 2: Definir o tipo de usuário esperado do Firestore]
// O tipo 'user' agora refletirá a estrutura do seu documento do Firestore
// O 'user' do Firebase Auth (authUser) é usado para o estado de login,
// e o 'profile' do Firestore (userProfile) é usado para dados como full_name e subscription_tier.

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  // [ALTERAÇÃO: user agora é o objeto de perfil do Firestore]
  const [userProfile, setUserProfile] = useState(null); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // [NOVA VARIÁVEL: Para rastrear o estado de autenticação base do Firebase]
  const [isAuthenticated, setIsAuthenticated] = useState(false); 

  useEffect(() => {
    // [ALTERAÇÃO NECESSÁRIA 3: Subscrição ao estado de autenticação do Firebase]
    // A função 'onAuthStateChanged' substitui o base44.auth.me()
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setIsAuthenticated(true);
        // O user.uid é o ID principal. Usamos ele para buscar os dados no Firestore.
        try {
          // A função getUserProfile (a ser criada em authService) busca full_name e subscription_tier no Firestore
          const profile = await getUserProfile(authUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Erro ao carregar perfil do Firestore:", error);
          setUserProfile(null);
        }
      } else {
        // Usuário deslogado
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    });

    // Limpeza da subscrição quando o componente for desmontado
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      // [ALTERAÇÃO NECESSÁRIA 4: Usar signOut do Firebase]
      await signOut(auth);
      // O useEffect acima irá lidar com a atualização do estado após o logout
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isActive = (pageName) => location.pathname === createPageUrl(pageName);

  const tierColors = {
    free: "text-gray-400",
    basic: "text-blue-500",
    premium: "text-amber-500"
  };

  const tierLabels = {
    free: "Free",
    basic: "Básico",
    premium: "Premium"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  AudioAcademy
                </h1>
                <p className="text-xs text-slate-400 -mt-1">Livros universitários em áudio</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to={createPageUrl("Home")}>
                <Button 
                  variant="ghost" 
                  className={`gap-2 ${isActive("Home") ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800/50"}`}
                >
                  <Library className="w-4 h-4" />
                  Biblioteca
                </Button>
              </Link>
              <Link to={createPageUrl("Pricing")}>
                <Button 
                  variant="ghost"
                  className={`gap-2 ${isActive("Pricing") ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800/50"}`}
                >
                  <Crown className="w-4 h-4" />
                  Planos
                </Button>
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* [ALTERAÇÃO: Usar userProfile para exibir nome e tier] */}
              {userProfile && (
                <Link to={createPageUrl("Profile")}>
                  <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 transition-all">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{userProfile.full_name}</span>
                    <span className={`text-xs font-semibold ${tierColors[userProfile.subscription_tier || 'free']}`}>
                      {tierLabels[userProfile.subscription_tier || 'free']}
                    </span>
                  </button>
                </Link>
              )}
              {/* [ALTERAÇÃO: Usar isAuthenticated para exibir botão de Logout] */}
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  // [ALTERAÇÃO: Chamar a função handleLogout]
                  onClick={handleLogout} 
                  className="text-slate-400 hover:text-white hover:bg-slate-800/50"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-300"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <nav className="flex flex-col gap-2">
                {/* [ALTERAÇÃO: Usar isAuthenticated para exibir 'Meu Perfil'] */}
                {isAuthenticated && (
                  <Link to={createPageUrl("Profile")} onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start gap-2 ${isActive("Profile") ? "bg-slate-800 text-white" : "text-slate-300"}`}
                    >
                      <User className="w-4 h-4" />
                      Meu Perfil
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl("Home")} onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start gap-2 ${isActive("Home") ? "bg-slate-800 text-white" : "text-slate-300"}`}
                  >
                    <Library className="w-4 h-4" />
                    Biblioteca
                  </Button>
                </Link>
                <Link to={createPageUrl("Pricing")} onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost"
                    className={`w-full justify-start gap-2 ${isActive("Pricing") ? "bg-slate-800 text-white" : "text-slate-300"}`}
                  >
                    <Crown className="w-4 h-4" />
                    Planos
                  </Button>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}