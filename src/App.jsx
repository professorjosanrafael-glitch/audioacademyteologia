import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // 👈 ADD Navigate
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "sonner";
import { loadStripe } from '@stripe/stripe-js';

import Layout from "./layouts/Layout.jsx";
import Home from "./pages/Home.jsx";
import Pricing from "./pages/Pricing.jsx";
import AudiobookDetails from "./pages/AudiobookDetails.jsx";
import Player from "./pages/Player.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";

const queryClient = new QueryClient();

const stripePromise = loadStripe('pk_live_51I7vxjEaNvDjXAylE2bqj1HvYTQplVQj2eNqPC3roPDup2fUCRAaUAEQlxL06IBA0x5ElTEXCLzq37TCB9Bw1Kdj00hSedfFeP');
window.stripePromise = stripePromise;

// 🔧 ROTAS CORRIGIDAS
const createPageUrl = (pageName) => {
  const routes = {
    Home: "/home",                 // 👈 agora casa com o utils e com a URL do navegador
    Pricing: "/pricing",
    AudiobookDetails: "/audiobookdetails",
    Player: "/player",
    Login: "/login",
    Profile: "/profile",
  };
  return routes[pageName] || "/home";
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Redirect da raiz / para /home */}
          <Route
            path="/"
            element={<Navigate to={createPageUrl("Home")} replace />}
          />

          {/* Home correta em /home */}
          <Route
            path={createPageUrl("Home")}
            element={<Layout currentPageName="Home"><Home /></Layout>}
          />

          <Route
            path={createPageUrl("Pricing")}
            element={<Layout currentPageName="Pricing"><Pricing /></Layout>}
          />

          <Route path={createPageUrl("Login")} element={<Login />} />

          <Route
            path={createPageUrl("AudiobookDetails")}
            element={<Layout currentPageName="AudiobookDetails"><AudiobookDetails /></Layout>}
          />
          <Route
            path={createPageUrl("Player")}
            element={<Layout currentPageName="Player"><Player /></Layout>}
          />
          <Route
            path={createPageUrl("Profile")}
            element={<Layout currentPageName="Profile"><Profile /></Layout>}
          />

          <Route
            path="*"
            element={
              <div className="min-h-screen bg-slate-950 text-white p-10 text-center flex items-center justify-center">
                404 - Página não encontrada
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </QueryClientProvider>
  );
}
