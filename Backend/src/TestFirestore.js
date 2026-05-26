const { db } = require("../services/Firebase");

async function testFirestore() {
    try {
        await db.collection("test").doc("conexion").set({
            mensaje: "Firestore conectado correctamente",
            fecha: new Date()
        });

        console.log("Conexión correcta con Firestore.");
        process.exit(0);
    } catch (error) {
        console.error("Error probando Firestore:", error);
        process.exit(1);
    }
}

testFirestore();