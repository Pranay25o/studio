
// src/lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// If you decide to use Firebase Analytics, you can uncomment the next line
// import { getAnalytics } from "firebase/analytics";

// ##########################################################################
// #                                                                        #
// #         ✅ CREDENTIALS UPDATED WITH USER-PROVIDED VALUES ✅             #
// #                                                                        #
// ##########################################################################
const firebaseConfig = {
  apiKey: "AIzaSyDrgPRTglm10TpYUJKmYxMKz4HQdR-B_L0",
  authDomain: "campusmarks-b3d56.firebaseapp.com",
  projectId: "campusmarks-b3d56",
  storageBucket: "campusmarks-b3d56.appspot.com", // Corrected to standard .appspot.com format
  messagingSenderId: "942894194007",
  appId: "1:942894194007:web:f1d2a43f2cb12343a0b212",
  measurementId: "G-N8Z8TF07DW"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
// If you want to use Firebase Analytics, uncomment the next line:
// const analytics = getAnalytics(app);

export { app, db /*, analytics */ };
