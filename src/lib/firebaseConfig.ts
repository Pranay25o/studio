// src/lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // If you use Firebase Auth

// ######################################################################
// #                                                                    #
// #  IMPORTANT: YOU MUST REPLACE THESE PLACEHOLDER VALUES WITH YOUR    #
// #             ACTUAL FIREBASE PROJECT CONFIGURATION!                 #
// #                                                                    #
// #  Get these from your Firebase project settings:                    #
// #  Project settings > General > Your apps > Web app > Config object  #
// #                                                                    #
// ######################################################################
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // <--- REPLACE
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // <--- REPLACE
  projectId: "YOUR_PROJECT_ID_HERE", // <--- REPLACE
  storageBucket: "YOUR_STORAGE_BUCKET_HERE", // <--- REPLACE
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE", // <--- REPLACE
  appId: "YOUR_APP_ID_HERE", // <--- REPLACE
  measurementId: "YOUR_MEASUREMENT_ID_HERE" // Optional, <--- REPLACE if you have it
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
// const auth = getAuth(app); // If you use Firebase Auth

export { app, db /*, auth */ };
