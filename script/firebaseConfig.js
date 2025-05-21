// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import{ getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpistqkn02kHLsCl9zW_i-yrIAOm3RJuQ",
  authDomain: "neo-mail.firebaseapp.com",
//   databaseURL: "https://inspire-wallet-default-rtdb.firebaseio.com",
  projectId: "neo-mail",
  storageBucket: "neo-mail.firebasestorage.app",
  messagingSenderId: "411777412645",
  appId: "1:411777412645:web:cfe3dc574ace50e6e3d9cc",
  measurementId: "G-6XYZXSQE1D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };