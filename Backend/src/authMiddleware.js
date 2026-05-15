import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Usuari } from '../models/Usuari.js';

dotenv.config();

//Middleware per verificar el token JWT i extreure les dades de l'usuari de la peticio
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionat" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    //Verificacio extra: Comprovar que l'usuari encara existeix a la BD
    const userExists = await Usuari.findByPk(decoded.id);
    if (!userExists) {
      return res.status(401).json({ error: "Usuari ja no existeix" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invàlid o expirat" });
  }
}