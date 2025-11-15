import React, { useState } from "react";
// [ALTERAÇÃO 1: REMOVER CLIENTE ANTIGO]
// REMOVIDO: import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Clock, TrendingUp, BookOpen, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// [ALTERAÇÃO 2: IMPORTAR SERVIÇO DE DADOS DO FIRESTORE]
// Precisamos de uma função para listar os audiobooks da coleção pública
// 📌 PASSO 1 — Importar categorias
// IMPORTANTE: listCategorias RENOMEADO para listCategories
import { listCategories, listAudiobooks } from "@/firebase/dataService"; // ESTE ARQUIVO DEVE SER CRIADO!

// 📌 PASSO 3 — Remover categorias fixas do código
// APAGADO:
// const categoryColors = {
//   filosofia: "from-purple-500 to-pink-500",
//   literatura: "from-blue-500 to-cyan-500",
//   ciencias: "from-green-500 to-emerald-500",
//   historia: "from-amber-500 to-orange-500",
//   economia: "from-red-500 to-rose-500",
//   direito: "from-indigo-500 to-blue-500",
//   psicologia: "from-violet-500 to-purple-500"
// };

// const categoryLabels = {
//   filosofia: "Filosofia",
//   literatura: "Literatura",
//   ciencias: "Ciências",
//   historia: "História",
//   economia: "Economia",
//   direito: "Direito",
//   psicologia: "Psicologia"
// };

const difficultyLabels = {
  intermediario: "Intermediário",
  avancado: "Avançado",
  expert: "Expert"
};

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // [ALTERAÇÃO 3: ADAPTAÇÃO DO useQuery PARA O NOVO SERVIÇO]
  // queryFn agora chama a nova função assíncrona que interage com o Firestore.
  // A ordenação (-created_date) será tratada DENTRO da função listAudiobooks.
  const { data: audiobooks = [], isLoading } = useQuery({
    queryKey: ['audiobooks'],
    queryFn: listAudiobooks, // Chama a função que busca dados no Firestore
  });
  
  // 📌 PASSO 2 — Criar React Query para categorias (CÓDIGO SUBSTITUÍDO/ADAPTADO)
  // Novo código solicitado, adaptado para manter a variável 'categorias' para compatibilidade
  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories() // Funçaõ importada atualizada
  });

  // 4. AGORA, TROQUE o filtro de audiobooks
  const filteredAudiobooks = selectedCategory === "all"
    ? audiobooks
    : audiobooks.filter(book => book.category === selectedCategory);

  // 📌 PASSO 3 — Substituir categorias fixas do código
  const categories = categorias;


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="relative mb-8"> {/* ALTERAÇÃO 1: Reduzindo mb-16 para mb-8 */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-3xl blur-3xl" />
        <div className="relative text-center py-16 px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-300">Aprenda com os clássicos universitários</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 py-3 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent"> {/* CORREÇÃO: Adicionando py-1 para dar espaço ao "g" */}
            Domine Livros Complexos <br />de Teologia
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto -mt-1"> {/* AJUSTE MAIS: Adicionando -mt-2 para aproximar do h1 */}
            Aulas em áudio de obras essenciais para universitários, com análises profundas e didáticas
          </p>

          {/* Search Bar */}
          {/* BLOCO DELETADO CONFORME SOLICITADO */}
          
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-12">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Categorias</h3>
        <div className="flex flex-wrap gap-2">
          {/* Botão TODOS (Estilo Restaurado) */}
          <button
            key="all"
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
          >
            Todos
          </button>

          {/* Categorias reais do Firestore (Estilo Restaurado) */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-slate-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Audiobooks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-slate-800/30">
              <Skeleton className="h-64 w-full bg-slate-700" />
              <div className="p-6 space-y-3">
                <Skeleton className="h-6 w-3/4 bg-slate-700" />
                <Skeleton className="h-4 w-1/2 bg-slate-700" />
                <Skeleton className="h-4 w-full bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAudiobooks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Search className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">Nenhum audiobook encontrado</h3>
          <p className="text-slate-500">Tente buscar por outro termo ou categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAudiobooks.map(book => {
            // 📌 PASSO 4 — Substituir referências
            const cat = categorias.find(c => c.id === book.category);

            const gradient = cat ? `from-[${cat.gradient_from}] to-[${cat.gradient_to}]` : 'from-slate-700 to-slate-800'; // Default se não encontrar

            return (
              <Link 
                key={book.id} 
                to={createPageUrl("AudiobookDetails") + `?id=${book.id}`}
                className="group"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
                  {/* Cover Image */}
                  <div className="relative h-64 overflow-hidden bg-slate-800">
                    {book.cover_image ? (
                      <img 
                        src={book.cover_image} 
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      // Substituição da cor/gradiente estático
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-80`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className={`bg-gradient-to-r ${gradient} border-0 text-white`}>
                        {cat ? cat.name : 'Sem Categoria'}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline" className="bg-slate-900/80 border-slate-700 text-slate-200">
                        {difficultyLabels[book.difficulty_level]}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">{book.author}</p>
                    <p className="text-sm text-slate-300 line-clamp-2 mb-4">
                      {book.description}
                    </p>
                    {book.total_duration && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        {/* total_duration está em segundos, convertido para horas */}
                        <span>{Math.round(book.total_duration / 3600)}h de conteúdo</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}