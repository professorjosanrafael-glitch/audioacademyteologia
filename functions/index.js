const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');
const cors = require('cors')({ origin: true });

// Inicializa o Admin SDK do Firebase para ter acesso total ao Firestore
admin.initializeApp();
const db = admin.firestore();

// O Stripe é inicializado com a chave secreta configurada via Firebase CLI.
const stripeSecretKey = functions.config().stripe.secret_key;
const stripeClient = stripe(stripeSecretKey);

// [AJUSTE PRINCIPAL] Define o caminho base para a Coleção de Perfis do Usuário.
// Usa o ID do projeto do Google Cloud (que geralmente é o AppId do Canvas)
// como fallback seguro.
const getProfileDocRef = (uid) => {
    // process.env.GCLOUD_PROJECT é o ID do projeto Firebase
    const appId = process.env.GCLOUD_PROJECT || 'default-app-id'; 
    
    // Caminho: artifacts/{appId}/users/{userId}/profiles/{userId}
    return db.collection('artifacts').doc(appId)
             .collection('users').doc(uid)
             .collection('profiles').doc(uid);
};

// -------------------------------------------------------------
// 1. FUNÇÃO CHAMÁVEL (Inicia o Checkout do Stripe a partir do React)
// -------------------------------------------------------------

/**
 * Cria uma sessão de Checkout no Stripe.
 * @param {Object} data - Contém priceId, successUrl e cancelUrl.
 * @param {Object} context - Contém o objeto de autenticação do Firebase.
 */
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
    // 1. Validação de segurança
    const uid = context.auth?.uid;

    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { priceId, successUrl, cancelUrl } = data;

    if (!priceId || !successUrl || !cancelUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'Argumentos obrigatórios ausentes.');
    }

    try {
        // 2. Cria a sessão de checkout no Stripe
        const session = await stripeClient.checkout.sessions.create({
            mode: 'subscription', 
            line_items: [{
                price: priceId, 
                quantity: 1,
            }],
            client_reference_id: uid, // ID do usuário do Firebase
            customer_email: context.auth.token.email, 
            
            success_url: successUrl,
            cancel_url: cancelUrl,

            // Metadados CRÍTICOS para o Webhook
            metadata: {
                firebaseUid: uid,
                planId: priceId, 
            },
        });

        // 3. Retorna o ID da sessão para o Front-end
        return { sessionId: session.id };

    } catch (error) {
        console.error("Erro ao criar sessão do Stripe:", error);
        throw new functions.https.HttpsError('internal', 'Erro interno ao iniciar o checkout.');
    }
});


// -------------------------------------------------------------
// 2. FUNÇÃO WEBHOOK (Atualiza o Firestore após confirmação do Stripe)
// -------------------------------------------------------------

/**
 * Recebe eventos do Stripe e atualiza o status de assinatura do usuário no Firestore.
 */
exports.handleStripeWebhook = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        const sig = request.headers['stripe-signature'];
        const webhookSecret = functions.config().stripe.webhook_secret; 
        
        let event;

        try {
            // Constrói o evento para verificar a autenticidade
            event = stripeClient.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
        } catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            return response.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Evento de pagamento concluído
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const firebaseUid = session.client_reference_id;
            const priceId = session.metadata.planId;
            const subscriptionId = session.subscription; 

            if (!firebaseUid) {
                console.error('Webhook: UID do Firebase ausente na sessão.');
                return response.status(400).end();
            }

            try {
                // [LÓGICA CRÍTICA DE MAPEAMENTO]
                let subscriptionTier = 'basic'; 
                // Assumindo que o Price ID contenha a palavra-chave do plano
                if (priceId.includes('premium')) { 
                    subscriptionTier = 'premium';
                }

                // Usa a função robusta para obter a referência do perfil
                const profileRef = getProfileDocRef(firebaseUid);

                // Atualiza o documento de perfil do usuário no Firestore
                await profileRef.set({
                    subscription_tier: subscriptionTier,
                    stripeCustomerId: session.customer, 
                    stripeSubscriptionId: subscriptionId, 
                    // Em um app real, você adicionaria lógica de cancelamento e faturamento aqui
                }, { merge: true });

                console.log(`Webhook SUCESSO: Assinatura do usuário ${firebaseUid} atualizada para ${subscriptionTier}.`);

            } catch (error) {
                console.error(`Webhook ERRO: Falha ao atualizar Firestore para ${firebaseUid}:`, error);
                return response.status(500).end();
            }
        }

        // Retorna um 200 para o Stripe
        return response.json({ received: true });
    });
});