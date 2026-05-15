import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model separat que emmagatzema exclusivament l'objecte GeoJSON per optimitzar les consultes
export const RutaGeometria = sequelize.define("rutes_geometria", {
  id_ruta: { type: DataTypes.INTEGER, primaryKey: true },
  geojson: DataTypes.JSONB
}, { timestamps: false });
