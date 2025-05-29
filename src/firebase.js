import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBWj8O5X-ihkRGyeNMyCBUeSTr0aY9EBf8",
  authDomain: "curiosapp-ef72f.firebaseapp.com",
  projectId: "curiosapp-ef72f",
  storageBucket: "curiosapp-ef72f.firebasestorage.app",
  messagingSenderId: "459473579255",
  appId: "1:459473579255:web:53259caafd7d16c57df7f2",
  measurementId: "G-E225EH5FHF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };