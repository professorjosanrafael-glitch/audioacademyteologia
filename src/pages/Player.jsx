import React, { useState, useEffect, useRef } from "react";
// [ALTERAÇÃO 1: REMOÇÃO E NOVOS IMPORTS DE BACKEND]
// REMOVIDO: import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Crown, Lock, FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

// [ADICIONAR: Imports do Firebase - PASSO 1]
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig"; // ADICIONADO: db
import { getUserProfile } from "@/firebase/dataService";
import { doc, getDoc } from "firebase/firestore"; // ADICIONADO: doc, getDoc

import { getAudiobookById, listEpisodesByAudiobook } from "@/firebase/dataService"; // Dados

export default function Player() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get("episodeId");

  // [ALTERAÇÃO 2: Estado de Usuário e Auth]
  const [user, setUser] = useState(null); // Armazena o perfil do Firestore
  const [authReady, setAuthReady] = useState(false); // Flag para garantir que Auth carregou
  // [ADICIONAR: Estado para Categoria - PASSO 2]
  const [categoryData, setCategoryData] = useState(null); // ADICIONADO
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  // ❌ REMOVIDO: const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // 👇 INÍCIO DA ADIÇÃO DOS ESTADOS DE MODAIS DUPLOS E VELOCIDADE (Passo 1) 👇
  const [showAudioUpgradeDialog, setShowAudioUpgradeDialog] = useState(false);
  const [showLessonUpgradeDialog, setShowLessonUpgradeDialog] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedDialog, setShowSpeedDialog] = useState(false);
  // 👆 FIM DA ADIÇÃO DOS ESTADOS DE MODAIS DUPLOS E VELOCIDADE 👆

  // 👇 INÍCIO DO NOVO useEffect PARA SCROLL TO TOP (Comando) 👇
  // Sempre começar a página do player no topo
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);
  // 👆 FIM DO NOVO useEffect PARA SCROLL TO TOP (Comando) 👆


  // [ALTERAÇÃO 3: Substituir base44.auth.me() pelo listener do Firebase]
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setAuthReady(true);
      if (authUser) {
        try {
          const profile = await getUserProfile(authUser.uid); 
          setUser(profile);
        } catch (error) {
          console.error("Erro ao carregar perfil do Firestore:", error);
          setUser(null);
        }
      } else {
        // Usuário não logado/anônimo = 'free'
        setUser({ subscription_tier: 'free' }); 
      }
    });

    return () => unsubscribe();
  }, []);

  // [ADICIONAR: Carregar a categoria quando o audiobook carregar - PASSO 3 - Correção para buscar o NOME]
  // MOVENDO ESTE BLOCO APÓS 'audiobook' para evitar ReferenceError
  
  // [ALTERAÇÃO 4: useQuery para Episode]
  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    // Substitui base44.entities.Episode.filter
    queryFn: async () => {
  const ref = doc(db, "episodios", episodeId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
},
    // Garante que só busca se o ID e o Auth estiverem prontos
    enabled: !!episodeId && authReady,
  });

  // [ALTERAÇÃO 5: useQuery para Audiobook]
  const { data: audiobook } = useQuery({
    queryKey: ['audiobook', episode?.audiobook_id],
    // Substitui base44.entities.Audiobook.filter
    queryFn: () => getAudiobookById(episode.audiobook_id),
    // Garante que só busca se o ID do livro for conhecido e o Auth estiver pronto
    enabled: !!episode?.audiobook_id && authReady,
  });
  
  // O bloco de busca da categoria é movido para aqui, após a definição de 'audiobook'
  useEffect(() => {
    if (!audiobook?.category) return;

    async function loadCategory() {
      const ref = doc(db, "categorias", audiobook.category);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setCategoryData(snap.data()); 
      }
    }

    loadCategory();
  }, [audiobook]);


  // [ALTERAÇÃO 6: useQuery para All Episodes]
  const { data: allEpisodes = [] } = useQuery({
    queryKey: ['allEpisodes', episode?.audiobook_id],
    // Substitui base44.entities.Episode.filter
    queryFn: () => listEpisodesByAudiobook(episode.audiobook_id),
    // Garante que só busca se o ID do livro for conhecido e o Auth estiver pronto
    enabled: !!episode?.audiobook_id && authReady,
  });

  // 👇 INÍCIO DA SUBSTITUIÇÃO DO useEffect (Tempo/Duração) 👇
  useEffect(() => {
    // só configura os eventos quando o episódio já foi carregado
    if (!episode) return;

    const audio = audioRef.current;
    if (!audio) return;

    // zera estado sempre que TROCAR DE EPISÓDIO
    setCurrentTime(0);
    setIsPlaying(false);

    // duração vinda do Firestore (campo "duracao" em segundos, string)
    const fallbackFromFirestore = episode.duracao ? Number(episode.duracao) : null;

    const handleLoaded = () => {
      const metaDuration =
        !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : null;
      const finalDuration = metaDuration ?? fallbackFromFirestore ?? 0;
      setDuration(finalDuration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    // chama uma vez (caso o metadata já tenha carregado)
    handleLoaded();

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [episodeId, episode]); 
  // 👆 FIM DA SUBSTITUIÇÃO DO useEffect (Tempo/Duração) 👆
  
  // 👇 INÍCIO DO NOVO useEffect PARA VELOCIDADE 👇
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);
  // 👆 FIM DO NOVO useEffect PARA VELOCIDADE 👆


  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skipTime = (seconds) => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
  };

  // 👇 INÍCIO DA SUBSTITUIÇÃO DA FUNÇÃO goToNextEpisode (Passo 2) 👇
  const goToNextEpisode = () => {
    const currentIndex = allEpisodes.findIndex(ep => ep.id === episodeId);
  
    if (currentIndex < allEpisodes.length - 1) {
      const nextEp = allEpisodes[currentIndex + 1];
  
      // 🔐 VERIFICA SE O EPISÓDIO É PREMIUM
      const isPremiumEp = nextEp.ispremium === true;
  
      // 🔐 PEGA O TIER DO USUÁRIO
      const userTier = user?.subscription_tier || "free";
  
      // ❌ Usuário FREE tentando acessar ÁUDIO premium → BLOQUEIA
      if (userTier === "free" && isPremiumEp) {
        setShowAudioUpgradeDialog(true);
        return;
      }
  
      // ✔ Basic & Premium podem ouvir qualquer áudio
      // Nenhuma regra extra aqui
  
      // ✔ PREMIUM → ACESSA TUDO
      navigate(createPageUrl("Player") + `?episodeId=${nextEp.id}`);
    }
  };
  // 👆 FIM DA SUBSTITUIÇÃO DA FUNÇÃO goToNextEpisode (Passo 2) 👆


  const goToPreviousEpisode = () => {
    const currentIndex = allEpisodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex > 0) {
      navigate(createPageUrl("Player") + `?episodeId=${allEpisodes[currentIndex - 1].id}`);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // [ALTERAÇÃO 7: Lógica de Acesso]
  // O acesso é baseado no 'subscription_tier' obtido do Firestore.
  const userTier = user?.subscription_tier || 'free';
  const canAccessLesson = userTier === 'premium'; // Mantendo a regra original

  const handleLessonClick = () => {
    if (!canAccessLesson) {
      // 🔥 SUBSTITUIÇÃO AQUI: Usa o modal específico para Aula Escrita (Passo 3)
      setShowLessonUpgradeDialog(true);
    }
  };

  // [ALTERAÇÃO 8: Tela de Carregamento]
  // Adicionar '|| !authReady' à condição de carregamento
  if (!episode || !authReady) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-400">Carregando episódio e perfil de usuário...</p>
      </div>
    );
  }

  // 👇 INÍCIO DA ADIÇÃO DA VARIÁVEL durationToShow 👇
  const durationToShow = duration || (episode.duracao ? Number(episode.duracao) : 0);
  // 👆 FIM DA ADIÇÃO DA VARIÁVEL durationToShow 👆

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Button
  variant="ghost"
  onClick={() => navigate(-1)}
  className="mb-8 text-slate-300 hover:text-white hover:bg-slate-800/50"
>
  <ArrowLeft className="w-4 h-4 mr-2" />
  Voltar
</Button>

      {/* Player Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10" /> {/* ALTERADO: from-violet-600/10 to-fuchsia-600/10 para from-cyan-500/10 to-blue-500/10 */}
        
        <div className="relative p-8 md:p-12">
          {/* Episode Info */}
          <div className="text-center mb-8">
            {/* [SUBSTITUIÇÃO DE BLOCO COMPLETA] */}
            {categoryData && (
  <Badge
    className="mb-4 border-0 text-white"
    style={{
      background: `linear-gradient(90deg, ${categoryData.gradient_from}, ${categoryData.gradient_to})`,
      color: "white"
    }}
  >
    {categoryData.name}
  </Badge>
)}


            
            {/* REMOVIDO NO FLUXO ORIGINAL: 
            <Badge className="mb-4 bg-slate-700 text-slate-300 border-0">
              Episódio {episode.episode_number}
            </Badge>
            */}

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {episode.title}
            </h1>
            {audiobook && (
              <p className="text-lg text-slate-400">
                {audiobook.title} • {audiobook.author}
              </p>
            )}
            {episode.description && (
              <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
                {episode.description}
              </p>
            )}
          </div>

          {/* Audio Element */}
          <audio ref={audioRef} src={episode.audio_url} preload="metadata" />

          {/* Progress Bar */}
          <div className="mb-6">
            {/* 👇 INÍCIO DA SUBSTITUIÇÃO DO SLIDER E LABELS (Etapa 3) 👇 */}
            <Slider
              value={[currentTime]}
              max={durationToShow || 1}
              step={1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-sm text-slate-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(durationToShow)}</span>
            </div>
            {/* 👆 FIM DA SUBSTITUIÇÃO DO SLIDER E LABELS (Etapa 3) 👆 */}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousEpisode}
              disabled={!allEpisodes[0] || allEpisodes[0].id === episodeId}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skipTime(-10)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span className="text-sm font-semibold">-10s</span>
            </Button>

            <Button
              size="icon"
              onClick={togglePlayPause}
              className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-full shadow-lg shadow-blue-500/25" /* ALTERADO: from-violet-600 to-fuchsia-600 e shadow-violet-500/25 */
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => skipTime(10)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <span className="text-sm font-semibold">+10s</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextEpisode}
              disabled={!allEpisodes[allEpisodes.length - 1] || allEpisodes[allEpisodes.length - 1].id === episodeId}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

                 
          
          
          {/* Speed Control */}
<div className="flex items-center justify-center mt-4">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowSpeedDialog(true)}
    className="text-slate-300 hover:text-white hover:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700"
  >
    Velocidade {playbackRate}×
  </Button>
</div>

<Dialog open={showSpeedDialog} onOpenChange={setShowSpeedDialog}>
  <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
    <DialogHeader>
      <DialogTitle className="text-white text-xl">Velocidade de Reprodução</DialogTitle>
    </DialogHeader>

    <div className="grid grid-cols-3 gap-3 py-4">
      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
        <Button
          key={rate}
          // 👇 INÍCIO DA CORREÇÃO DO onClick (Etapa 3) 👇
          onClick={() => {
            setPlaybackRate(rate);
            setShowSpeedDialog(false);
          }}
          // 👆 FIM DA CORREÇÃO DO onClick (Etapa 3) 👆
          className={`py-3 ${
            playbackRate === rate
              ? "bg-cyan-600 text-white" /* ALTERADO: bg-violet-600 para bg-cyan-600 */
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {rate}×
        </Button>
      ))}
    </div>
  </DialogContent>
</Dialog>

        </div>
      </div>

      {/* Lesson Content */}
      <div className="rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
        <Tabs defaultValue="lesson" className="w-full">
          <TabsList className="w-full grid grid-cols-1 bg-slate-900/50 border-b border-slate-700 rounded-none h-auto">
            <TabsTrigger
  value="lesson"
  onClick={handleLessonClick}
  className="
    flex items-center justify-center gap-2
    data-[state=active]:bg-slate-800 
    data-[state=active]:text-white 
    text-slate-300 
    rounded-none 
    py-4
  "
>
  <FileText className="w-4 h-4" />
  <span>Aula Escrita</span>

  {!canAccessLesson && (
    <Crown className="w-4 h-4 text-amber-400" />
  )}
</TabsTrigger>

          </TabsList>
          
          <TabsContent value="lesson" className="p-0 m-0">
            {canAccessLesson ? (
              <div className="p-8">
                {episode.written_lesson ? (
                  <div className="prose prose-invert max-w-none [&>*]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_p]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-slate-200 [&_code]:text-cyan-300 [&_a]:text-cyan-400"> {/* ALTERADO: text-violet-300 e text-violet-400 para text-cyan-300 e text-cyan-400 */}
                    <ReactMarkdown>{episode.written_lesson}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aula escrita não disponível para este episódio</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Conteúdo Premium
                  </h3>
                  <p className="text-slate-400 mb-6">
                    As aulas escritas estão disponíveis apenas para assinantes Premium. 
                    Faça upgrade para ter acesso completo a análises detalhadas e material de estudo.
                  </p>
                  <Link to={createPageUrl("Pricing")}>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"> {/* ALTERADO: from-violet-600 to-fuchsia-600 */}
                      <Crown className="w-4 h-4 mr-2" />
                      Fazer Upgrade
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: upgrade para ouvir áudio premium (Passo 4) */}
      <Dialog open={showAudioUpgradeDialog} onOpenChange={setShowAudioUpgradeDialog}>
        <DialogContent className="bg-slate-900 border border-slate-800 relative">

          {/* Botão X */}
          <button
            onClick={() => setShowAudioUpgradeDialog(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-4">
            <Crown className="text-yellow-400 w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Assine para continuar</h2>
          </div>

          <p className="text-slate-300 mb-6">
            Esse episódio é exclusivo para assinantes. Assine um plano para continuar ouvindo!
          </p>

          <Button
            onClick={() => navigate(createPageUrl("Pricing"))}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white" /* ALTERADO: from-fuchsia-500 to-violet-600 */
          >
            Ver Planos
          </Button>

        </DialogContent>
      </Dialog>
      
      {/* Modal: upgrade para acessar aulas escritas (Passo 5) */}
      <Dialog open={showLessonUpgradeDialog} onOpenChange={setShowLessonUpgradeDialog}>
        <DialogContent className="bg-slate-900 border border-slate-800 relative">

          {/* Botão X */}
          <button
            onClick={() => setShowLessonUpgradeDialog(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-4">
            <Crown className="text-yellow-400 w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Assine Premium</h2>
          </div>

          <p className="text-slate-300 mb-6">
            As aulas escritas são exclusivas para assinantes Premium. Tenha acesso completo ao conteúdo aprofundado!
          </p>

          <Button
            onClick={() => navigate(createPageUrl("Pricing"))}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white" /* ALTERADO: from-fuchsia-500 to-violet-600 */
          >
            Ver Planos Premium
          </Button>

        </DialogContent>
      </Dialog>
    </div>
  );
}