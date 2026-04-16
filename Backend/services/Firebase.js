import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
} = process.env;

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
              credential: cert(credenciales)
          });

const db = getFirestore(firebaseApp);

export { firebaseApp, db };