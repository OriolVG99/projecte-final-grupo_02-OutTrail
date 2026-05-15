import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model que representa les parades o punts d'interes que formen part d'una ruta
export const Parada = sequelize.define("parades", {
  id_parada: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_ruta: DataTypes.INTEGER,
  nom: DataTypes.STRING,
  latitud: DataTypes.FLOAT,
  longitud: DataTypes.FLOAT,
  tipus: DataTypes.STRING
}, { timestamps: false });
