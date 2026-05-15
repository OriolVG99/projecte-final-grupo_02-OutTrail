import { DataTypes } from "sequelize";
import { sequelize } from "../src/db.js";

//Model que representa les publicacions o noticies que pot crear propietaris d'un negoci
export const PostNegoci = sequelize.define("posts_negoci", {
  id_post: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_negoci: DataTypes.INTEGER,
  titol: DataTypes.STRING,
  contingut: DataTypes.TEXT,
  fotos: DataTypes.TEXT,
  data: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  data_edicio: { type: DataTypes.DATE, allowNull: true }
}, { timestamps: false, freezeTableName: true });
