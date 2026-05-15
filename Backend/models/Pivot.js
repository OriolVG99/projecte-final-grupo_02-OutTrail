import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Taula pivot per establir la relació de seguidors (qui segueix a qui)
export const Seguidor = sequelize.define("seguidors", {
  id_seguidor: { type: DataTypes.INTEGER, primaryKey: true },
  id_seguidut: { type: DataTypes.INTEGER, primaryKey: true }
}, { timestamps: false });

//Taula pivot per guardar les rutes marcades com a preferides (like) per l'usuari
export const FavoritRuta = sequelize.define("favorits_rutes", {
  id_usuari: { type: DataTypes.INTEGER, primaryKey: true },
  id_ruta: { type: DataTypes.INTEGER, primaryKey: true },
  data_creacio: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false, tableName: "favorits_rutes" });

//Taula pivot per guardar els negocis marcats com a preferits per l'usuari
export const FavoritNegoci = sequelize.define("favorits_negocis", {
  id_usuari: { type: DataTypes.INTEGER, primaryKey: true },
  id_negoci: { type: DataTypes.INTEGER, primaryKey: true },
  data_creacio: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false, tableName: "favorits_negocis" });
