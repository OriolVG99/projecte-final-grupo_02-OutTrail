import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model que representa un negoci (restaurant, hotel, botiga, etc.) donat d'alta per un usuari
export const Negoci = sequelize.define("negocis", {
  id_negoci: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuari: DataTypes.INTEGER,
  nom: DataTypes.STRING,
  tipus: DataTypes.STRING,
  descripcio: DataTypes.TEXT,
  zona: DataTypes.STRING,
  latitud: DataTypes.FLOAT,
  longitud: DataTypes.FLOAT,
  fotos: DataTypes.TEXT,
  valoracio_mitjana: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 }
}, { timestamps: false });
