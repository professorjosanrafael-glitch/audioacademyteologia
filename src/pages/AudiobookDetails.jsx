import React, { useState, useEffect } from "react";
// [ALTERAÇÃO 1: REMOÇÃO E NOVOS IMPORTS DE BACKEND]
// REMOVIDO: import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Play, Lock, Clock, FileText, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// [ALTERAÇÃO 2: IMPORTAR SERVIÇOS DO FIREBASE]
// Importar a função de estado de autenticação (onAuthStateChanged) e as funções de dados
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { getUserProfile } from "@/firebase/dataService";

import { getAudiobookById, listEpisodesByAudiobook } from "@/firebase/dataService"; // NOVO

export default function AudiobookDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const audiobookId = urlParams.get("id");
  
  // [ALTERAÇÃO 3: O USUÁRIO É O userProfile (dados do Firestore)]
  const [user, setUser] = useState(null); 
  const [authReady, setAuthReady] = useState(false); // Novo estado para garantir que a autenticação terminou
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  // [ALTERAÇÃO 4: NOVO useEffect para Autenticação e Perfil]
  // Este hook substitui a chamada base44.auth.me() e usa o listener do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setAuthReady(true);
      if (authUser) {
        try {
          // Busca o perfil do Firestore para obter o 'subscription_tier'
          const profile = await getUserProfile(authUser.uid); 
          setUser(profile);
        } catch (error) {
          console.error("Erro ao carregar perfil do Firestore:", error);
          setUser(null);
        }
      } else {
        // Usuário não autenticado ou anônimo
        setUser({ subscription_tier: 'free' }); 
      }
    });

    return () => unsubscribe();
  }, []);

  // [ALTERAÇÃO 5: useQuery para Audiobook]
  const { data: audiobook, isLoading: loadingBook } = useQuery({
    queryKey: ['audiobook', audiobookId],
    // queryFn agora chama a nova função do serviço de dados
    queryFn: () => getAudiobookById(audiobookId), 
    // Garante que a query só execute se o ID existir e o Auth estiver pronto
    enabled: !!audiobookId && authReady, 
  });

  // [ALTERAÇÃO 6: useQuery para Episodes]
  const { data: episodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ['episodes', audiobookId],
    // queryFn agora chama a nova função do serviço de dados
    queryFn: () => listEpisodesByAudiobook(audiobookId), 
    // Garante que a query só execute se o ID existir e o Auth estiver pronto
    enabled: !!audiobookId && authReady, 
  });

  const userTier = user?.subscription_tier || 'free';

  const canAccessEpisode = (episodeNumber) => {
    if (userTier === 'premium') return true;
    if (userTier === 'basic' && episodeNumber <= 5) return true; // Exemplo: plano 'basic' libera 5 episódios
    return episodeNumber === 1; // Usuários 'free' só podem acessar o primeiro episódio
  };

  const handleEpisodeClick = (episode) => {
    if (!canAccessEpisode(episode.episode_number)) {
      setUpgradeMessage("Assine um plano para ter acesso a todos os episódios e continuar seu aprendizado!");
      setShowUpgradeDialog(true);
      return;
    }
    navigate(createPageUrl("Player") + `?episodeId=${episode.id}`);
  };

  // Enquanto o livro está carregando OU a autenticação não terminou
  if (loadingBook || !authReady) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-8 w-32 mb-8 bg-slate-700" />
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Skeleton className="h-96 rounded-2xl bg-slate-700" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4 bg-slate-700" />
            <Skeleton className="h-6 w-1/2 bg-slate-700" />
            <Skeleton className="h-32 w-full bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  if (!audiobook) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-slate-400">Audiobook não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Home"))}
        className="mb-8 text-slate-300 hover:text-white hover:bg-slate-800/50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {/* Audiobook Header */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {/* Cover */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 rounded-3xl blur-2xl" />
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            {audiobook.cover_image ? (
              <img 
                src={audiobook.cover_image} 
                alt={audiobook.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 text-white">
              {audiobook.category}
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {audiobook.difficulty_level}
            </Badge>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {audiobook.title}
          </h1>
          <p className="text-xl text-slate-400 mb-6">{audiobook.author}</p>
          
          <p className="text-slate-300 leading-relaxed mb-6">
            {audiobook.description}
          </p>

          {audiobook.total_duration && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-5 h-5" />
              <span>{Math.round(audiobook.total_duration / 3600)}h de conteúdo total</span>
            </div>
          )}
        </div>
      </div>

      {/* Episodes List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Episódios</h2>
        
        {loadingEpisodes ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-slate-700" />
            ))}
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-slate-800/30 border border-slate-700">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum episódio disponível ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => {
              const canAccess = canAccessEpisode(episode.episode_number);
              const isLocked = !canAccess;

              return (
                <button
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode)}
                  className={`w-full text-left p-6 rounded-xl border transition-all group ${
                    isLocked 
                      ? "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50" 
                      : "bg-slate-800/50 border-slate-700 hover:border-violet-500/50 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Episode Number / Icon */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                      isLocked 
                        ? "bg-slate-700/50" 
                        : "bg-gradient-to-br from-violet-600 to-fuchsia-600 group-hover:shadow-lg group-hover:shadow-violet-500/25"
                    }`}>
                      {isLocked ? (
                        <Lock className="w-6 h-6 text-slate-500" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </div>

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-400">
                          Episódio {episode.episode_number}
                        </span>
                        {isLocked && (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <h3 className={`text-lg font-semibold mb-1 ${isLocked ? "text-slate-500" : "text-white group-hover:text-violet-400"} transition-colors`}>
                        {episode.title}
                      </h3>
                      {episode.description && (
                        <p className="text-sm text-slate-400 line-clamp-1">
                          {episode.description}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    {episode.duration && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{episode.duration} min</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              Assine para continuar
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base pt-4">
              {upgradeMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Link to={createPageUrl("Pricing")} className="w-full">
              <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
                Ver Planos
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => setShowUpgradeDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Continuar navegando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}