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

// [ADICIONAR: Imports do Firebase]
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { getUserProfile } from "@/firebase/dataService";

import { getAudiobookById, listEpisodesByAudiobook } from "@/firebase/dataService"; // Dados

export default function Player() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get("episodeId");

  // [ALTERAÇÃO 2: Estado de Usuário e Auth]
  const [user, setUser] = useState(null); // Armazena o perfil do Firestore
  const [authReady, setAuthReady] = useState(false); // Flag para garantir que Auth carregou
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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

  // [ALTERAÇÃO 4: useQuery para Episode]
  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    // Substitui base44.entities.Episode.filter
    queryFn: async () => {
      // NOTE: getAudiobookById é um nome confuso aqui, mas se o getEpisodeById existir:
      // return await getEpisodeById(episodeId); 
      // Como não criamos getEpisodeById, usaremos a função de listagem com filtro
      const episodes = await listEpisodesByAudiobook(episode.audiobook_id); // Isso pode ser ineficiente
      return episodes.find(ep => ep.id === episodeId);
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

  // [ALTERAÇÃO 6: useQuery para All Episodes]
  const { data: allEpisodes = [] } = useQuery({
    queryKey: ['allEpisodes', episode?.audiobook_id],
    // Substitui base44.entities.Episode.filter
    queryFn: () => listEpisodesByAudiobook(episode.audiobook_id),
    // Garante que só busca se o ID do livro for conhecido e o Auth estiver pronto
    enabled: !!episode?.audiobook_id && authReady,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

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

  const goToNextEpisode = () => {
    const currentIndex = allEpisodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex < allEpisodes.length - 1) {
      navigate(createPageUrl("Player") + `?episodeId=${allEpisodes[currentIndex + 1].id}`);
    }
  };

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
      setShowUpgradeDialog(true);
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

      {/* Player Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10" />
        
        <div className="relative p-8 md:p-12">
          {/* Episode Info */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-slate-700 text-slate-300 border-0">
              Episódio {episode.episode_number}
            </Badge>
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
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-sm text-slate-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
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
              className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-full shadow-lg shadow-violet-500/25"
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

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
        <Tabs defaultValue="lesson" className="w-full">
          <TabsList className="w-full grid grid-cols-1 bg-slate-900/50 border-b border-slate-700 rounded-none h-auto">
            <TabsTrigger 
              value="lesson" 
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-300 rounded-none py-4"
              onClick={handleLessonClick}
            >
              <FileText className="w-4 h-4 mr-2" />
              Aula Escrita
              {!canAccessLesson && (
                <Crown className="w-4 h-4 ml-2 text-amber-400" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="lesson" className="p-0 m-0">
            {canAccessLesson ? (
              <div className="p-8">
                {episode.written_lesson ? (
                  <div className="prose prose-invert max-w-none [&>*]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_p]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-slate-200 [&_code]:text-violet-300 [&_a]:text-violet-400">
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
                    <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700">
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

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              Assine Premium
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base pt-4">
              As aulas escritas são exclusivas para assinantes Premium. Tenha acesso a análises detalhadas, resumos e material de apoio para todos os episódios.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Link to={createPageUrl("Pricing")} className="w-full">
              <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
                Ver Planos Premium
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => setShowUpgradeDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Continuar ouvindo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}