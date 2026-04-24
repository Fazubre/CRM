const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../services/Firebase");

const areas = [
    "Branding",
    "Comunicación Estratégica",
    "Desarrollo Web",
    "Diseño Gráfico",
    "Producción Audiovisual",
    "Streaming",
    "Podcasts",
    "Estrategias Digitales",
    "Paid Media",
    "Asesoría en Comunicación Política",
    "Contraste",
    "Mantenimiento Web"
];

function generarId(nombre) {
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function seedAreas() {
    try {
        for (const nombre of areas) {
            const areaId = generarId(nombre);

            await db.collection("areas").doc(areaId).set(
                {
                    nombre,
                    activo: true,
                    updatedAt: FieldValue.serverTimestamp(),
                    createdAt: FieldValue.serverTimestamp()
                },
                { merge: true }
            );

            console.log(`Área guardada: ${nombre}`);
        }

        console.log("Seed de áreas completado correctamente.");
        process.exit(0);
    } catch (error) {
        console.error("Error ejecutando seed de áreas:", error);
        process.exit(1);
    }
}

seedAreas();