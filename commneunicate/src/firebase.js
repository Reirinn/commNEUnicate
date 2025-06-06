import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAKzhTeiG1cuSBjsduyXj-dEHxiUl4dudk",
  authDomain: "commneunicate-f4406.firebaseapp.com",
  projectId: "commneunicate-f4406",
  storageBucket: "commneunicate-f4406.appspot.com",
  messagingSenderId: "454170356676",
  appId: "1:454170356676:web:4774f076933cbd72855291",
  measurementId: "G-E5742LZ3ZE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { app, auth, provider, db, storage, analytics };