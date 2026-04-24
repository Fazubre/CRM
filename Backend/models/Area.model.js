const { db } = require("../services/Firebase");

async function getAllAreas() {
    const snapshot = await db
        .collection("areas")
        .where("activo", "==", true)
        .get();

    const areas = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
            id: doc.id,
            nombre: data.nombre || ""
        };
    });

    areas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return areas;
}

module.exports = {
    getAllAreas
};