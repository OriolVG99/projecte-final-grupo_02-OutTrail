import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model que defineix els usuaris de l'aplicacio, els seus rols i l'estat de validacio
export const Usuari = sequelize.define("usuaris", {
  id_usuari: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nom: DataTypes.STRING,
  cognoms: DataTypes.STRING,
  username: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING, unique: true },
  password_hash: DataTypes.STRING,
  id_role: { type: DataTypes.INTEGER, defaultValue: 1 },
  validated: { type: DataTypes.BOOLEAN, defaultValue: true },
  zona: DataTypes.STRING,
  experiencia: DataTypes.INTEGER,
  sexe: DataTypes.STRING,
  data_naixement: DataTypes.DATEONLY,
  foto_perfil: DataTypes.STRING
}, { timestamps: false });
