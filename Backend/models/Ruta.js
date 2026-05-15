import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model principal que emmagatzema les dades d'una ruta, incloent distancia, dificultat i visibilitat
export const Ruta = sequelize.define("rutes", {
  id_ruta: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuari: DataTypes.INTEGER,
  nom: DataTypes.STRING,
  descripcio: DataTypes.TEXT,
  zona: DataTypes.STRING,
  distancia_km: DataTypes.FLOAT,
  dificultat: DataTypes.STRING,
  fotos: DataTypes.TEXT,
  valoracio_mitjana: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  es_publica: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: false });
