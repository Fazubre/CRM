require("dotenv").config();

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
} = process.env;

console.log("Firebase Project ID:", FIREBASE_PROJECT_ID);
console.log("Firebase Client Email:", FIREBASE_CLIENT_EMAIL);

if (!FIREBASE_PROJECT_ID) {
    throw new Error("Falta FIREBASE_PROJECT_ID en el .env");
}

if (!FIREBASE_CLIENT_EMAIL) {
    throw new Error("Falta FIREBASE_CLIENT_EMAIL en el .env");
}

if (!FIREBASE_PRIVATE_KEY) {
    throw new Error("Falta FIREBASE_PRIVATE_KEY en el .env");
}

const credenciales = {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
};

const firebaseApp =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
              credential: cert(credenciales),
              projectId: FIREBASE_PROJECT_ID
          });

const db = getFirestore(firebaseApp);

module.exports = {
    firebaseApp,
    db
};