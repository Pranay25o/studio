
// src/lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // If you use Firebase Auth

// ##########################################################################
// #                                                                        #
// #                       🚨 IMPORTANT ATTENTION 🚨                        #
// #                                                                        #
// #  YOU MUST REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR ACTUAL        #
// #  FIREBASE PROJECT CONFIGURATION CREDENTIALS.                           #
// #                                                                        #
// #  To get these:                                                         #
// #  1. Go to your Firebase project in the Firebase Console.               #
// #  2. Click on "Project settings" (the gear icon ⚙️).                    #
// #  3. Under the "General" tab, scroll down to "Your apps".               #
// #  4. If you haven't added a web app, click the "</>" (Web) icon to      #
// #     add one and register your app.                                     #
// #  5. Find the "SDK setup and configuration" section and select "Config".#
// #  6. Copy the configuration object and paste its values below.          #
// #                                                                        #
// #  ⚠️ FAILURE TO DO THIS WILL PREVENT CONNECTION TO FIREBASE/FIRESTORE.  #
// #                                                                        #
// ##########################################################################
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // <--- 🚨 REPLACE WITH YOUR ACTUAL API KEY 🚨
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // <--- 🚨 REPLACE 🚨
  projectId: "YOUR_PROJECT_ID_HERE", // <--- 🚨 REPLACE 🚨
  storageBucket: "YOUR_STORAGE_BUCKET_HERE", // <--- 🚨 REPLACE 🚨
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE", // <--- 🚨 REPLACE 🚨
  appId: "YOUR_APP_ID_HERE", // <--- 🚨 REPLACE 🚨
  measurementId: "YOUR_MEASUREMENT_ID_HERE" // Optional, <--- 🚨 REPLACE if you have it 🚨
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
