import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy
} from "firebase/firestore";


// ===============================
// 0️⃣ BUSCAR PERFIL DO USUÁRIO
// ===============================
export async function getUserProfile(uid) {
  if (!uid) return null;

  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  return snap.exists() ? snap.data() : null;
}


// ===============================
// 1️⃣ LISTAR CATEGORIAS
// ===============================
export async function listCategories() {
  const ref = collection(db, "categorias");
  
  // Linhas de ordenação removidas para adequar-se à função solicitada:
  // const q = query(ref, orderBy("name", "asc"));
  // const snap = await getDocs(q);
  
  const snap = await getDocs(ref); // Modificado para usar ref diretamente

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}


// ===============================
// 2️⃣ LISTAR AUDIOBOOKS
// ===============================
export async function listAudiobooks() {
  const ref = collection(db, "audiobooks");

  // ATENÇÃO: Se o campo no Firestore for 'created_date', mude aqui.
  // Assumindo que você quer ordenar por 'created_at' como no código anterior:
  const q = query(ref, orderBy("created_at", "desc")); 

  const snap = await getDocs(q);

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}



// ===============================
// 3️⃣ BUSCAR AUDIOBOOK POR ID
// ===============================
export async function getAudiobookById(id) {
  const ref = doc(db, "audiobooks", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() };
}



// ===============================
// 4️⃣ LISTAR EPISÓDIOS DE UM LIVRO
// ===============================
export async function listEpisodesByAudiobook(audiobookId) {
  const ref = collection(db, "episodios");

  const q = query(
    ref,
    where("audiobook_id", "==", audiobookId),
    orderBy("episode_number", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}