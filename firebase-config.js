// ============ FIREBASE ============

const _fbApp  = firebase.initializeApp({
  apiKey: "AIzaSyCc0AhkPaIzmUewk_szFLmxqfMMmMctnHw",
  authDomain: "evdebakim-ca02e.firebaseapp.com",
  projectId: "evdebakim-ca02e",
  storageBucket: "evdebakim-ca02e.firebasestorage.app",
  messagingSenderId: "708187732533",
  appId: "1:708187732533:web:34d1fea5bb82bfad2b0f7c"
});
const _auth   = firebase.auth();
const _db     = firebase.firestore();
