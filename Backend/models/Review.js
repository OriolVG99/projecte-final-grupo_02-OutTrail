import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model de valoracions (stars i comentaris) que els usuaris fan sobre les rutes
export const ReviewRuta = sequelize.define("reviews_rutes", {
  id_review: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_ruta: DataTypes.INTEGER,
  id_usuari: DataTypes.INTEGER,
  puntuacio: DataTypes.INTEGER,
  comentari: DataTypes.TEXT,
  data: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false, tableName: "reviews_rutes" });

//Model de valoracions (stars i comentaris) que els usuaris fan sobre els negocis
export const ReviewNegoci = sequelize.define("reviews_negocis", {
  id_review: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_negoci: DataTypes.INTEGER,
  id_usuari: DataTypes.INTEGER,
  puntuacio: DataTypes.INTEGER,
  comentari: DataTypes.TEXT,
  data: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false });
