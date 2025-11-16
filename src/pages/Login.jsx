import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // 👈 CORREÇÃO: Link ADICIONADO AQUI
import { createPageUrl } from "@/utils";
import { Mail, Lock, User, LogIn, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// [ADICIONAR: Imports do Firebase Auth e Firestore]
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; // 👈 ADICIONADO: getDoc
import { auth } from "@/firebase/firebaseConfig";
import { db } from "@/firebase/firebaseConfig";


// --- Criar documento do usuário automaticamente (PASSO 1) ---
async function ensureUserDocument(user) {
  if (!user) return;

  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return; // já existe, não faz nada

  await setDoc(ref, {
    full_name: user.displayName || "",
    email: user.email,
    subscription_tier: "free", // novo usuário sempre entra como FREE
    created_at: new Date().toISOString(),
  });
}


export default function Login() {
    const navigate = useNavigate();
    const [isLoginView, setIsLoginView] = useState(true); // Alterna entre Login e Cadastro
    const [loading, setLoading] = useState(false);

    // Campos de Formulário
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState(""); // Apenas para o Cadastro

    // --- FUNÇÕES DE AUTHENTICAÇÃO ---

    /**
     * Lida com o Login (SignIn) usando Firebase Auth.
     */
    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 👇 INÍCIO DA CORREÇÃO DE LOGIN (PASSO 3) 👇
            const result = await signInWithEmailAndPassword(auth, email, password);
            // Garantir criação automática no Firestore
            await ensureUserDocument(result.user);

            toast.success("Login realizado com sucesso!");
            // Redireciona para a Home
            navigate(createPageUrl("Home")); 
            // 👆 FIM DA CORREÇÃO DE LOGIN (PASSO 3) 👆

        } catch (error) {
            console.error("Erro no Login:", error);
            
            let message = "Ocorreu um erro no login.";
            if (error.code === 'auth/invalid-email') {
                message = "Email inválido.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = "Email ou senha incorretos.";
            } else if (error.code === 'auth/too-many-requests') {
                 message = "Acesso temporariamente bloqueado. Tente novamente mais tarde.";
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Lida com o Cadastro (SignUp) usando Firebase Auth E cria o documento no Firestore.
     */
    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (password.length < 6) {
             toast.error("A senha deve ter pelo menos 6 caracteres.");
             setLoading(false);
             return;
        }

        try {
            // 1. Cria o usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 👇 INÍCIO DA CORREÇÃO DE CADASTRO (PASSO 2) 👇
            // 2. Criar documento no Firestore na coleção correta (usuarios)
            const ref = doc(db, "usuarios", uid);
            await setDoc(ref, {
              full_name: fullName,
              email: email,
              subscription_tier: "free",
              created_at: new Date().toISOString(),
            });
            // 👆 FIM DA CORREÇÃO DE CADASTRO (PASSO 2) 👆

            toast.success("Conta criada com sucesso! Redirecionando...");
            // Redireciona para a Home
            navigate(createPageUrl("Home"));

        } catch (error) {
            console.error("Erro no Cadastro:", error);

            let message = "Ocorreu um erro no cadastro.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Este email já está cadastrado.";
            } else if (error.code === 'auth/invalid-email') {
                message = "Email inválido.";
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = isLoginView ? handleSignIn : handleSignUp;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <Card className="w-full max-w-md bg-slate-800/80 border-slate-700 backdrop-blur-sm shadow-2xl shadow-violet-500/10">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-white mb-2">
                        {isLoginView ? "Entrar na Conta" : "Criar Nova Conta"}
                    </CardTitle>
                    <p className="text-sm text-slate-400">
                        {isLoginView 
                            ? "Acesse a biblioteca universitária em áudio" 
                            : "Comece sua jornada de aprendizado Premium"
                        }
                    </p>
                </CardHeader>
                
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Campo Nome Completo (Apenas Cadastro) */}
                        {!isLoginView && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-300">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required={!isLoginView}
                                        disabled={loading}
                                        className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Campo Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="seu.email@exemplo.com"
                                />
                            </div>
                        </div>

                        {/* Campo Senha */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        {/* Botão de Submissão */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                        >
                            {isLoginView ? (
                                <>
                                    <LogIn className="w-4 h-4 mr-2" />
                                    {loading ? "Entrando..." : "Entrar"}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {loading ? "Cadastrando..." : "Criar Conta"}
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Alternar entre Login e Cadastro */}
                    <div className="mt-6 text-center text-sm text-slate-400">
                        {isLoginView ? (
                            <p>
                                Não tem conta?{" "}
                                <button 
                                    type="button" 
                                    onClick={() => { setIsLoginView(false); setEmail(""); setPassword(""); setFullName(""); }}
                                    className="text-violet-400 hover:text-violet-300 font-medium"
                                >
                                    Crie uma agora
                                </button>
                            </p>
                        ) : (
                            <p>
                                Já é membro?{" "}
                                <button 
                                    type="button" 
                                    onClick={() => { setIsLoginView(true); setEmail(""); setPassword(""); setFullName(""); }}
                                    className="text-violet-400 hover:text-violet-300 font-medium"
                                >
                                    Fazer Login
                                </button>
                            </p>
                        )}
                        <p className="mt-4">
                            <Link to={createPageUrl("Home")} className="text-slate-500 hover:text-slate-400">
                                Voltar para a Home
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}