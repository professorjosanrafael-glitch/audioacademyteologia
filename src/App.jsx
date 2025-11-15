import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
// [ADICIONAR: TanStack Query para gerenciamento de dados]
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
// [ADICIONAR: Toaster para notificações]
import { Toaster } from "sonner";

// [ADICIONAR: Import do Stripe para carregamento]
import { loadStripe } from '@stripe/stripe-js'; 

// Importa Layout e Páginas que estamos adaptando
import Layout from "./layouts/Layout.jsx";
import Home from "./pages/Home.jsx";
import Pricing from "./pages/Pricing.jsx";
import AudiobookDetails from "./pages/AudiobookDetails.jsx";
import Player from "./pages/Player.jsx";
import Login from "./pages/Login.jsx"; // Próxima a ser adaptada
import Profile from "./pages/Profile.jsx"; // Ainda não adaptada

// Inicializa o cliente do TanStack Query
const queryClient = new QueryClient();

// [CONFIGURAÇÃO CRÍTICA DO STRIPE]
// SUBSTITUA 'SUA_CHAVE_PÚBLICA_DO_STRIPE' pela chave pública real (pk_test_... ou pk_live_...)
const stripePromise = loadStripe('pk_live_51I7vxjEaNvDjXAylE2bqj1HvYTQplVQj2eNqPC3roPDup2fUCRAaUAEQlxL06IBA0x5ElTEXCLzq37TCB9Bw1Kdj00hSedfFeP');

// Expomos o stripePromise globalmente para que Pricing.jsx (que usa window.Stripe) funcione.
window.stripePromise = stripePromise; 

// Funções utilitárias de roteamento (Simula o "@/utils")
const createPageUrl = (pageName) => {
    const routes = {
        "Home": "/",
        "Pricing": "/pricing",
        "AudiobookDetails": "/audiobookdetails",

        "Player": "/player",
        "Login": "/login",
        "Profile": "/profile",
    };
    return routes[pageName] || "/";
};

export default function App() {
    return (
        // Envolve toda a aplicação no QueryClientProvider
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    {/* Rotas principais com Layout */}
                    <Route path={createPageUrl("Home")} element={<Layout currentPageName="Home"><Home /></Layout>} />
                    <Route path={createPageUrl("Pricing")} element={<Layout currentPageName="Pricing"><Pricing /></Layout>} />
                    
                    {/* Rotas que PODEM NÃO usar o Layout (ex: Login, tela cheia) */}
                    <Route path={createPageUrl("Login")} element={<Login />} /> 
                    
                    {/* Rotas detalhadas com Layout */}
                    <Route path={createPageUrl("AudiobookDetails")} element={<Layout currentPageName="AudiobookDetails"><AudiobookDetails /></Layout>} />
                    <Route path={createPageUrl("Player")} element={<Layout currentPageName="Player"><Player /></Layout>} />
                    <Route path={createPageUrl("Profile")} element={<Layout currentPageName="Profile"><Profile /></Layout>} />

                    {/* Rota 404 (Fallback) */}
                    <Route path="*" element={<div className="min-h-screen bg-slate-950 text-white p-10 text-center flex items-center justify-center">404 - Página não encontrada</div>} />
                </Routes>
            </BrowserRouter>
            {/* Componente Toast para notificações */}
            <Toaster richColors />
        </QueryClientProvider>
    );
}