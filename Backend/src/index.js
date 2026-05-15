import express from "express";
import cors from "cors";
import routes from "./routes.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./db.js";
import "../models/index.js";

dotenv.config({ path: ".env" });

const app = express();
app.use(cors());
app.use(express.json());

//Configuracio del directori d'arxius estàtics per a les imatges pujades
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//Definicio de les rutes de l'API
app.use("/api", routes);

//Verificacio de la connexio amb la base de dades i inici del servidor
try {
  await sequelize.authenticate();
  console.log("PostgreSQL ORM conectat");
} catch (err) {
  console.error("ERROR conectant PostgreSQL ORM:", err);
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend escoltant al port ${PORT}`);
  });
}

export default app;