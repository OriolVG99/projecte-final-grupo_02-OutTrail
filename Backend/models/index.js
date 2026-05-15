//Arxiu central per exportar tots els models i definir les associacions (relacions) de Sequelize
import { Usuari } from "./Usuari.js";
import { Ruta } from "./Ruta.js";
import { Parada } from "./Parada.js";
import { Negoci } from "./Negoci.js";
import { ReviewRuta, ReviewNegoci } from "./Review.js";
import { PostNegoci } from "./Post.js";
import { RutaGeometria } from "./RutaGeometria.js";
import { Seguidor, FavoritRuta, FavoritNegoci } from "./Pivot.js";

//Usuari - Ruta
Usuari.hasMany(Ruta, { foreignKey: "id_usuari", as: "rutes", onDelete: "CASCADE" });
Ruta.belongsTo(Usuari, { foreignKey: "id_usuari", as: "autor" });

//Ruta - Parada
Ruta.hasMany(Parada, { foreignKey: "id_ruta", as: "parades", onDelete: "CASCADE" });
Parada.belongsTo(Ruta, { foreignKey: "id_ruta" });

//Ruta - Geometria
Ruta.hasOne(RutaGeometria, { foreignKey: "id_ruta", as: "geometria", onDelete: "CASCADE" });
RutaGeometria.belongsTo(Ruta, { foreignKey: "id_ruta" });

//Usuari - Negoci
Usuari.hasMany(Negoci, { foreignKey: "id_usuari", as: "negocis", onDelete: "CASCADE" });
Negoci.belongsTo(Usuari, { foreignKey: "id_usuari", as: "propietari" });

//Negoci - Post
Negoci.hasMany(PostNegoci, { foreignKey: "id_negoci", as: "posts", onDelete: "CASCADE" });
PostNegoci.belongsTo(Negoci, { foreignKey: "id_negoci" });

//Usuari - Usuari (Seguidors)
Usuari.belongsToMany(Usuari, { through: Seguidor, as: "seguint", foreignKey: "id_seguidor", otherKey: "id_seguidut" });
Usuari.belongsToMany(Usuari, { through: Seguidor, as: "mis_seguidors", foreignKey: "id_seguidut", otherKey: "id_seguidor" });

//Usuari - Ruta (Favorits)
Usuari.belongsToMany(Ruta, { through: FavoritRuta, as: "rutes_favorites", foreignKey: "id_usuari" });
Ruta.belongsToMany(Usuari, { through: FavoritRuta, as: "usuaris_que_la_volen", foreignKey: "id_ruta" });

//Usuari - Negoci (Favorits)
Usuari.belongsToMany(Negoci, { through: FavoritNegoci, as: "negocis_favorits", foreignKey: "id_usuari" });
Negoci.belongsToMany(Usuari, { through: FavoritNegoci, as: "usuaris_fans", foreignKey: "id_negoci" });

//Favorit mapping (per a consultes directes)
FavoritRuta.belongsTo(Ruta, { foreignKey: "id_ruta", as: "ruta" });
FavoritNegoci.belongsTo(Negoci, { foreignKey: "id_negoci", as: "negoci" });

//Reviews
ReviewRuta.belongsTo(Usuari, { foreignKey: "id_usuari", as: "autor" });
ReviewRuta.belongsTo(Ruta, { foreignKey: "id_ruta", as: "ruta" });
Ruta.hasMany(ReviewRuta, { foreignKey: "id_ruta", as: "reviews", onDelete: "CASCADE" });
Usuari.hasMany(ReviewRuta, { foreignKey: "id_usuari", as: "reviews", onDelete: "CASCADE" });

ReviewNegoci.belongsTo(Usuari, { foreignKey: "id_usuari", as: "autor" });
ReviewNegoci.belongsTo(Negoci, { foreignKey: "id_negoci", as: "negoci" });
Negoci.hasMany(ReviewNegoci, { foreignKey: "id_negoci", as: "reviews", onDelete: "CASCADE" });
Usuari.hasMany(ReviewNegoci, { foreignKey: "id_usuari", as: "reviews_negocis", onDelete: "CASCADE" });

export {
  Usuari,
  Ruta,
  Parada,
  Negoci,
  ReviewRuta,
  ReviewNegoci,
  PostNegoci,
  RutaGeometria,
  Seguidor,
  FavoritRuta,
  FavoritNegoci
};
