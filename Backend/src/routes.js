import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Op, literal, fn, col } from 'sequelize';
import { sequelize } from './db.js';
import { authMiddleware } from './authMiddleware.js';
import { Usuari, Ruta, Parada, ReviewRuta, ReviewNegoci, RutaGeometria, Seguidor, Negoci, PostNegoci, FavoritRuta, FavoritNegoci }
  from "../models/index.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

dotenv.config();
const router = Router();

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ storage });

//Configuracio del transport de correu per a notificacions
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

router.get('/ping', (req, res) => {
  res.json({ message: 'OutTrail API OK' });
});

// Proxy para ORS - evita el CORS del frontend
router.post('/ors-directions', async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || coordinates.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 coordenadas' });
    }

    const orsRes = await fetch(
      'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
      {
        method: 'POST',
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates })
      }
    );

    const data = await orsRes.json();
    res.status(orsRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al contactar ORS' });
  }
});


router.post('/register', async (req, res) => {
  try {
    let { nom, cognoms, username, email, password } = req.body;
    if (email) email = email.toLowerCase();

    if (!nom || !username || !email || !password) {
      return res.status(400).json({ error: 'Falten camps obligatoris' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await Usuari.create({
      nom, cognoms, username, email,
      password_hash: hashed,
      id_role: 1,
      validated: true
    });

    res.json({
      ok: true,
      message: 'Usuari registrat correctament',
      user: {
        id_usuari: user.id_usuari,
        username: user.username,
        email: user.email,
        validated: user.validated,
        id_role: user.id_role
      }
    });

  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email o username ja existeix' });
    }
    res.status(500).json({ error: 'Error al registrar usuari' });
  }
});

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.toLowerCase();

    const user = await Usuari.findOne({ where: { email } });

    if (!user) return res.status(400).json({ error: 'Email no trobat' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Contrasenya incorrecta' });

    if (user.validated === false) {
      return res.status(403).json({
        error: "El teu compte encara no ha estat validat per l'administrador"
      });
    }

    const payload = {
      id: user.id_usuari,
      email: user.email,
      username: user.username,
      role: user.id_role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '7d'
    });

    res.json({
      ok: true,
      message: 'Login correcte',
      token,
      user: {
        id: user.id_usuari,
        username: user.username,
        email: user.email,
        role: user.id_role,
        nom: user.nom,
        cognoms: user.cognoms,
        zona: user.zona,
        experiencia: user.experiencia,
        sexe: user.sexe,
        data_naixement: user.data_naixement,
        foto_perfil: user.foto_perfil,
        validated: user.validated
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al fer login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await Usuari.findByPk(req.user.id, {
      attributes: ['id_usuari', 'username', 'email', 'nom', 'cognoms',
        'zona', 'experiencia', 'sexe', 'data_naixement', 'foto_perfil']
    });

    res.json({ ok: true, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obtenint usuari' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { nom, cognoms, zona, experiencia, sexe, data_naixement, foto_perfil } = req.body;

    await Usuari.update(
      { nom, cognoms, zona, experiencia, sexe, data_naixement, foto_perfil },
      { where: { id_usuari: req.user.id } }
    );

    const user = await Usuari.findByPk(req.user.id, {
      attributes: ['id_usuari', 'nom', 'cognoms', 'zona', 'experiencia',
        'sexe', 'data_naixement', 'foto_perfil']
    });

    res.json({ ok: true, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualitzant perfil' });
  }
});

router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Cal introduir la contrasenya actual i la nova' });
    }

    const user = await Usuari.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'La contrasenya actual és incorrecta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await Usuari.update({ password_hash: hashed }, { where: { id_usuari: req.user.id } });

    res.json({ ok: true, message: 'Contrasenya actualitzada correctament' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error canviant la contrasenya' });
  }
});

//Endpoint per eliminar un compte d'usuari i totes les seves dades relacionades en una transaccio
router.delete('/me', authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const user = await Usuari.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

    // 1. Obtenir IDs de rutes de l'usuari
    const userRutes = await Ruta.findAll({ where: { id_usuari: userId }, attributes: ['id_ruta'], transaction: t });
    const rutaIds = userRutes.map(r => r.id_ruta);

    // 2. Eliminar dades relacionades amb les rutes
    if (rutaIds.length > 0) {
      await Parada.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await RutaGeometria.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await ReviewRuta.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await FavoritRuta.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
    }

    // 3. Eliminar dades d'activitat de l'usuari (reviews i favorits que ha fet ell)
    await ReviewRuta.destroy({ where: { id_usuari: userId }, transaction: t });
    await FavoritRuta.destroy({ where: { id_usuari: userId }, transaction: t });

    // 4. Eliminar les rutes
    await Ruta.destroy({ where: { id_usuari: userId }, transaction: t });

    // 5. Obtenir IDs de negocis de l'usuari
    const userNegocis = await Negoci.findAll({ where: { id_usuari: userId }, attributes: ['id_negoci'], transaction: t });
    const negociIds = userNegocis.map(n => n.id_negoci);

    // 6. Eliminar dades relacionades amb els negocis
    if (negociIds.length > 0) {
      await PostNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
      await ReviewNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
      await FavoritNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
    }

    // 7. Eliminar dades d'activitat en negocis (reviews i favorits que ha fet ell)
    await ReviewNegoci.destroy({ where: { id_usuari: userId }, transaction: t });
    await FavoritNegoci.destroy({ where: { id_usuari: userId }, transaction: t });

    // 8. Eliminar els negocis
    await Negoci.destroy({ where: { id_usuari: userId }, transaction: t });

    // 9. Eliminar seguidors (tant si segueix com si l'hi segueixen)
    await Seguidor.destroy({ 
      where: { 
        [Op.or]: [{ id_seguidor: userId }, { id_seguidut: userId }] 
      }, 
      transaction: t 
    });

    // 10. Finalment eliminar l'usuari
    await Usuari.destroy({ where: { id_usuari: userId }, transaction: t });

    await t.commit();
    res.json({ ok: true, message: 'Compte i totes les seves dades eliminades correctament' });
  } catch (err) {
    await t.rollback();
    console.error('ERROR ELIMINANT COMPTE:', err);
    res.status(500).json({ error: 'Error eliminant el compte' });
  }
});


router.post('/me/foto', authMiddleware, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No s'ha rebut cap fitxer" });
    }
    const filename = req.file.path;

    await Usuari.update(
      { foto_perfil: filename },
      { where: { id_usuari: req.user.id } }
    );

    res.json({ ok: true, foto_perfil: filename });

  } catch (err) {
    console.error('ERROR PUJANT FOTO PERFIL:', err);
    res.status(500).json({ error: 'Error pujant foto: ' + err.message });
  }
});

//Creacio de ruta amb calcul automatic de geometria i distancia via OpenRouteService
router.post('/rutes', authMiddleware, upload.array('fotos'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nom, descripcio, zona, dificultat, distancia_km, es_publica } = req.body;
    const id_usuari = req.user.id;

    if (!req.body.punts) return res.status(400).json({ error: "No s'han enviat punts" });
    const punts = JSON.parse(req.body.punts);

    const fotosNoms = req.files ? req.files.map(f => f.path) : [];
    const fotosString = fotosNoms.join(',');

    const coords = punts.map(p => [p.lng, p.lat]);
    const orsRes = await fetch(
      'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
      {
        method: 'POST',
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates: coords })
      }
    );

    const orsData = await orsRes.json();
    if (!orsData.features) throw new Error('Error en la respuesta de ORS');
    const geometry = orsData.features[0].geometry;
    const valorPublica = es_publica === 'false' ? false : true;

    const ruta = await Ruta.create(
      { id_usuari, nom, descripcio, zona, distancia_km, dificultat, fotos: fotosString, es_publica: valorPublica },
      { transaction: t }
    );

    for (const p of punts) {
      await Parada.create(
        { id_ruta: ruta.id_ruta, nom: p.nom, latitud: p.lat, longitud: p.lng, tipus: p.tipus || null },
        { transaction: t }
      );
    }

    await RutaGeometria.create(
      { id_ruta: ruta.id_ruta, geojson: geometry },
      { transaction: t }
    );

    await t.commit();
    res.json({ ok: true, id_ruta: ruta.id_ruta });

  } catch (err) {
    await t.rollback();
    console.error('DETALLE DEL ERROR EN SERVIDOR:', err);
    res.status(500).json({ error: 'Error intern: ' + err.message });
  }
});

router.get('/rutes/zones', async (req, res) => {
  try {
    const rows = await Ruta.findAll({
      attributes: ['zona'],
      where: {
        zona: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        es_publica: true
      },
      group: ['zona'],
      order: [['zona', 'ASC']]
    });
    res.json({ zones: rows.map(z => z.zona) });
  } catch (err) {
    console.error('ERROR GET RUTES ZONES:', err);
    res.status(500).json({ error: 'Error obtenint zones' });
  }
});

router.get('/negocis/zones', async (req, res) => {
  try {
    const rows = await Negoci.findAll({
      attributes: ['zona'],
      where: {
        zona: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
      },
      group: ['zona'],
      order: [['zona', 'ASC']]
    });
    res.json({ zones: rows.map(z => z.zona) });
  } catch (err) {
    console.error('ERROR GET NEGOCIS ZONES:', err);
    res.status(500).json({ error: 'Error obtenint zones' });
  }
});

router.get('/rutes', async (req, res) => {
  const rutes = await Ruta.findAll({ attributes: ['id_ruta', 'nom'] });
  res.json(rutes);
});

router.get('/parades', async (req, res) => {
  const parades = await Parada.findAll({
    attributes: ['id_parada', 'nom', 'latitud', 'longitud', 'tipus']
  });
  res.json(parades);
});

router.get('/rutes/:id', async (req, res) => {
  try {
    const id = req.params.id;

    let userIdRequest = null;
    let userRoleRequest = null;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userIdRequest = decoded.id;
        userRoleRequest = decoded.role;
      } catch (err) {
        console.error("Token inválido:", err.message);
      }
    }

    const ruta = await Ruta.findByPk(id, {
      attributes: ['id_ruta', 'nom', 'descripcio', 'zona', 'distancia_km', 'dificultat', 'id_usuari', 'es_publica', 'valoracio_mitjana', 'fotos'],
      include: [
        {
          model: Usuari,
          as: 'autor',
          attributes: [['username', 'autor_nom'], 'nom', 'foto_perfil']
        },
        {
          model: RutaGeometria,
          as: 'geometria',
          attributes: ['geojson']
        }
      ]
    });

    if (!ruta) return res.status(404).json({ error: 'Ruta no trobada' });

    const esAutor = userIdRequest && String(userIdRequest) === String(ruta.id_usuari);
    const esAdmin = Number(userRoleRequest) === 3;

    if (ruta.es_publica === false && !esAutor && !esAdmin) {
      return res.status(403).json({ error: 'Aquesta ruta és privada' });
    }

    const parades = await Parada.findAll({
      where: { id_ruta: id },
      attributes: ['id_parada', 'nom', 'latitud', 'longitud', 'tipus'],
      order: [['id_parada', 'ASC']]
    });

    const rutaPlain = ruta.toJSON();
    const rutaFlat = {
      ...rutaPlain,
      autor_nom: rutaPlain.autor?.autor_nom,
      autor_role: rutaPlain.autor?.autor_role,
      autor_id: rutaPlain.id_usuari
    };
    delete rutaFlat.autor;

    res.json({
      ok: true,
      ruta: rutaFlat,
      parades,
      geometry: rutaPlain.geometria?.geojson || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obtenint ruta' });
  }
});


router.delete('/rutes/:id', authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const userId = req.user.id;

    const ruta = await Ruta.findByPk(id);
    if (!ruta) return res.status(404).json({ error: 'Ruta no trobada' });

    if (ruta.id_usuari !== userId && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís per eliminar aquesta ruta' });
    }

    await RutaGeometria.destroy({ where: { id_ruta: id }, transaction: t });
    await Parada.destroy({ where: { id_ruta: id }, transaction: t });
    await ReviewRuta.destroy({ where: { id_ruta: id }, transaction: t });
    await FavoritRuta.destroy({ where: { id_ruta: id }, transaction: t });
    await Ruta.destroy({ where: { id_ruta: id }, transaction: t });

    await t.commit();
    res.json({ ok: true, message: 'Ruta eliminada correctament' });

  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error eliminant ruta' });
  }
});

router.put('/rutes/:id', authMiddleware, upload.array('fotos'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const {
      nom,
      descripcio,
      zona,
      dificultat,
      distancia_km,
      es_publica,
      existingFotos  //JSON string amb els noms de fotos existents a conservar
    } = req.body;

    const puntsRaw = req.body.punts;
    const geojsonRaw = req.body.geojson;

    //1-Cercar la ruta original
    const ruta = await Ruta.findByPk(id);
    if (!ruta) {
      await t.rollback();
      return res.status(404).json({ error: 'Ruta no trobada' });
    }

    //2-Validar permisos (Nomes autor o admin)
    if (String(ruta.id_usuari) !== String(userId) && req.user.role !== 3) {
      await t.rollback();
      return res.status(403).json({ error: 'No tens permís per editar aquesta ruta' });
    }

    //3-Gestio de fotos
    let fotosExistents = [];
    try { fotosExistents = JSON.parse(existingFotos || '[]'); } catch { fotosExistents = []; }

    const novesFotos = req.files ? req.files.map(f => f.path) : [];
    
    let fotosFinals = [];
    const ordenFotosRaw = req.body.ordenFotos;
    if (ordenFotosRaw) {
      let ordenFotos = [];
      try { ordenFotos = JSON.parse(ordenFotosRaw); } catch { ordenFotos = []; }
      let newFotoIdx = 0;
      let existingFotoIdx = 0;
      ordenFotos.forEach(type => {
         if (type === 'new' && newFotoIdx < novesFotos.length) {
            fotosFinals.push(novesFotos[newFotoIdx++]);
         } else if (type === 'existing' && existingFotoIdx < fotosExistents.length) {
            fotosFinals.push(fotosExistents[existingFotoIdx++]);
         }
      });
      while (existingFotoIdx < fotosExistents.length) fotosFinals.push(fotosExistents[existingFotoIdx++]);
      while (newFotoIdx < novesFotos.length) fotosFinals.push(novesFotos[newFotoIdx++]);
    } else {
      fotosFinals = [...fotosExistents, ...novesFotos];
    }

    // (Gestió d'esborrat de Cloudinary es podria implementar aquí)

    //4-Actualitzar dades basics de la ruta
    const valorPublica = es_publica === 'false' ? false : true;
    await ruta.update({
      nom,
      descripcio,
      zona,
      dificultat,
      distancia_km,
      es_publica: valorPublica,
      fotos: fotosFinals.join(',')
    }, { transaction: t });

    //5-Actualitzar la Geometria (GeoJSON del mapa)
    if (geojsonRaw) {
      let geojsonParsed;
      try { geojsonParsed = JSON.parse(geojsonRaw); } catch { geojsonParsed = geojsonRaw; }

      const [geom, created] = await RutaGeometria.findOrCreate({
        where: { id_ruta: id },
        defaults: { geojson: geojsonParsed },
        transaction: t
      });
      if (!created) {
        await geom.update({ geojson: geojsonParsed }, { transaction: t });
      }
    }

    //Actualitzacio de les parades eliminant les antigues i creant les noves
    if (puntsRaw) {
      let punts = [];
      try { punts = JSON.parse(puntsRaw); } catch { punts = []; }

      if (punts.length > 0) {
        await Parada.destroy({ where: { id_ruta: id }, transaction: t });

        const novesParades = punts.map((p, index) => ({
          id_ruta: id,
          nom: p.nom || `Parada ${index + 1}`,
          latitud: p.latitud ?? p.lat,
          longitud: p.longitud ?? p.lng,
          tipus: p.tipus || null
        }));

        await Parada.bulkCreate(novesParades, { transaction: t });
      }
    }

    await t.commit();
    res.json({ ok: true, message: 'Ruta actualitzada correctament amb les seves parades' });

  } catch (err) {
    await t.rollback();
    console.error('ERROR EDITANT RUTA:', err);
    res.status(500).json({ error: 'Error intern al servidor en editar la ruta: ' + err.message });
  }
});

router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.body;
    const r = await fetch(
      `https://eu1.locationiq.com/v1/reverse?key=${process.env.LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error reverse geocoding' });
  }
});

router.get('/admin/business-requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const requests = await Usuari.findAll({
      where: { id_role: 2, validated: false },
      attributes: ['id_usuari', 'nom', 'cognoms', 'username', 'email',
        'zona', 'experiencia', 'sexe', 'data_naixement'],
      order: [['id_usuari', 'DESC']]
    });

    res.json({ requests });

  } catch (err) {
    console.error('ERROR GET BUSINESS REQUESTS:', err);
    res.status(500).json({ error: "Error obtenint sol·licituds" });
  }
});

router.put('/admin/business-requests/:id/accept', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const usuari = await Usuari.findByPk(req.params.id, { attributes: ['email'] });
    if (!usuari) return res.status(404).json({ error: 'Usuari no trobat' });

    await Usuari.update({ validated: true }, { where: { id_usuari: req.params.id } });

    res.json({ ok: true });

    transporter.sendMail({
      from: process.env.MAIL_USER,
      to: usuari.email,
      subject: 'Has sigut acceptat com a business a OutTrail!',
      text: 'Has sigut acceptat com a business a OutTrail, ja pots accedir amb el teu compte!'
    }).catch(err => console.error('ERROR ENVIANT CORREU ACCEPTACIÓ:', err));

  } catch (err) {
    console.error('ERROR ACCEPT BUSINESS:', err);
    res.status(500).json({ error: "Error acceptant sol·licitud" });
  }
});

router.put('/admin/business-requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const { motiu } = req.body;
    const usuari = await Usuari.findByPk(req.params.id, { attributes: ['email'] });
    if (!usuari) return res.status(404).json({ error: 'Usuari no trobat' });

    const emailDestinatari = usuari.email;

    await Usuari.destroy({ where: { id_usuari: req.params.id } });

    res.json({ ok: true });

    transporter.sendMail({
      from: process.env.MAIL_USER,
      to: emailDestinatari,
      subject: "La teva sol·licitud d'usuari business en OutTrail ha estat rebutjada",
      text: `Hem eliminat les teves dades, podras tornar a registrar-te en qualsevol moment.\n\nMotiu de la denegació:\n\n${motiu}`
    }).catch(err => console.error('ERROR ENVIANT CORREU DENEGACIÓ:', err));

  } catch (err) {
    console.error('ERROR REJECT BUSINESS:', err);
    res.status(500).json({ error: "Error rebutjant sol·licitud" });
  }
});


router.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const { search = '', zona = '', role = 'tots', page = 1, limit = 10 } = req.query;
    const pageSize = Number(limit);
    const offset = (page - 1) * pageSize;

    const where = {
      [Op.and]: [
        {
          [Op.or]: [
            { nom: { [Op.iLike]: `%${search}%` } },
            { cognoms: { [Op.iLike]: `%${search}%` } },
            { username: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
          ]
        },
        zona ? { zona: { [Op.iLike]: `%${zona}%` } } : {}
      ]
    };

    if (role === 'caminant') where.id_role = 1;
    else if (role === 'business') where.id_role = 2;
    else if (role === 'admin') where.id_role = 3;

    const { rows: users, count: total } = await Usuari.findAndCountAll({
      where,
      order: [['id_usuari', 'DESC']],
      limit: pageSize,
      offset,
      attributes: { exclude: ['password_hash'] }
    });

    res.json({ users, total, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('ERROR ADMIN GET USERS:', err);
    res.status(500).json({ error: 'Error obtenint usuaris' });
  }
});

router.get('/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const user = await Usuari.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

    res.json({ ok: true, user });
  } catch (err) {
    console.error('ERROR ADMIN GET USER:', err);
    res.status(500).json({ error: 'Error obtenint usuari' });
  }
});

router.put('/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const { nom, cognoms, username, email, zona, experiencia, sexe, data_naixement, id_role, validated } = req.body;

    await Usuari.update(
      { nom, cognoms, username, email, zona, experiencia, sexe, data_naixement, id_role, validated },
      { where: { id_usuari: req.params.id } }
    );

    const user = await Usuari.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error('ERROR ADMIN UPDATE USER:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email o username ja existeix' });
    }
    res.status(500).json({ error: 'Error actualitzant usuari' });
  }
});

router.put('/admin/users/:id/password', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Cal introduir la nova contrasenya' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await Usuari.update({ password_hash: hashed }, { where: { id_usuari: req.params.id } });

    res.json({ ok: true, message: 'Contrasenya actualitzada correctament' });
  } catch (err) {
    console.error('ERROR ADMIN CHANGE PASSWORD:', err);
    res.status(500).json({ error: 'Error canviant la contrasenya' });
  }
});

router.delete('/admin/users/:id', authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (req.user.role !== 3) return res.status(403).json({ error: 'Accés denegat' });

    const userId = req.params.id;
    const user = await Usuari.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

    //1-Obtenir IDs de rutes de l'usuari
    const userRutes = await Ruta.findAll({ where: { id_usuari: userId }, attributes: ['id_ruta'], transaction: t });
    const rutaIds = userRutes.map(r => r.id_ruta);

    //2-Eliminar dades relacionades amb les rutes
    if (rutaIds.length > 0) {
      await Parada.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await RutaGeometria.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await ReviewRuta.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
      await FavoritRuta.destroy({ where: { id_ruta: { [Op.in]: rutaIds } }, transaction: t });
    }

    //3-Eliminar dades d'activitat de l'usuari (reviews i favorits que ha fet ell)
    await ReviewRuta.destroy({ where: { id_usuari: userId }, transaction: t });
    await FavoritRuta.destroy({ where: { id_usuari: userId }, transaction: t });

    //4-Eliminar les rutes
    await Ruta.destroy({ where: { id_usuari: userId }, transaction: t });

    //5-Obtenir IDs de negocis de l'usuari
    const userNegocis = await Negoci.findAll({ where: { id_usuari: userId }, attributes: ['id_negoci'], transaction: t });
    const negociIds = userNegocis.map(n => n.id_negoci);

    //6-Eliminar dades relacionades amb els negocis
    if (negociIds.length > 0) {
      await PostNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
      await ReviewNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
      await FavoritNegoci.destroy({ where: { id_negoci: { [Op.in]: negociIds } }, transaction: t });
    }

    //7-Eliminar dades d'activitat en negocis (reviews i favorits que ha fet ell)
    await ReviewNegoci.destroy({ where: { id_usuari: userId }, transaction: t });
    await FavoritNegoci.destroy({ where: { id_usuari: userId }, transaction: t });

    //8-Eliminar els negocis
    await Negoci.destroy({ where: { id_usuari: userId }, transaction: t });

    //9-Eliminar seguidors (tant si segueix com si l'hi segueixen)
    await Seguidor.destroy({ 
      where: { 
        [Op.or]: [{ id_seguidor: userId }, { id_seguidut: userId }] 
      }, 
      transaction: t 
    });

    //10-Finalment eliminar l'usuari
    await Usuari.destroy({ where: { id_usuari: userId }, transaction: t });

    await t.commit();
    res.json({ ok: true, message: 'Usuari i totes les seves dades eliminades correctament' });
  } catch (err) {
    await t.rollback();
    console.error('ERROR ADMIN DELETE USER:', err);
    res.status(500).json({ error: 'Error eliminant usuari' });
  }
});


router.post('/register-business', async (req, res) => {
  try {
    let { nom, cognoms, username, email, password } = req.body;
    if (email) email = email.toLowerCase();

    if (!nom || !username || !email || !password) {
      return res.status(400).json({ error: 'Falten camps obligatoris' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await Usuari.create({
      nom, cognoms, username, email,
      password_hash: hashed,
      id_role: 2,
      validated: false
    });

    res.json({
      ok: true,
      message: "Sol·licitud enviada. Espera validació de l'administrador.",
      user: {
        id_usuari: user.id_usuari,
        username: user.username,
        email: user.email,
        validated: user.validated,
        id_role: user.id_role
      }
    });

  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email o username ja existeix' });
    }
    res.status(500).json({ error: 'Error al registrar negoci' });
  }
});

//Endpoint per cercar usuaris amb filtres i estat de seguiment
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const {
      search = '', zona = '', experiencia = '',
      page = 1, limit = 5, role = 'tots'
    } = req.query;

    const myId = req.user.id;
    const pageSize = Number(limit);
    const offset = (page - 1) * pageSize;
    const expValue = experiencia === '' ? null : Number(experiencia);

    const roleWhere = {};
    if (role === 'caminant') roleWhere.id_role = 1;
    if (role === 'business') roleWhere.id_role = 2;

    const users = await Usuari.findAll({
      attributes: [
        'id_usuari', 'nom', 'cognoms', 'username',
        'zona', 'experiencia', 'foto_perfil', 'id_role',
        [
          literal(`EXISTS(
            SELECT 1 FROM seguidors s
            WHERE s.id_seguidor = ${myId} AND s.id_seguidut = "usuaris"."id_usuari"
          )`),
          'is_following'
        ]
      ],
      where: {
        id_usuari: { [Op.ne]: myId },
        id_role: { [Op.ne]: 3 },
        validated: true,
        ...roleWhere,
        [Op.and]: [
          {
            [Op.or]: [
              { nom: { [Op.iLike]: `%${search}%` } },
              { cognoms: { [Op.iLike]: `%${search}%` } },
              { username: { [Op.iLike]: `%${search}%` } }
            ]
          },
          zona
            ? { zona: { [Op.iLike]: `%${zona}%` } }
            : {},
          expValue !== null
            ? { experiencia: { [Op.gte]: expValue } }
            : {}
        ]
      },
      order: [['nom', 'ASC']],
      limit: pageSize,
      offset
    });

    res.json({ users });

  } catch (err) {
    console.error('ERROR GET USERS:', err);
    res.status(500).json({ error: 'Error obtenint usuaris' });
  }
});

router.post('/follow/:id', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = req.params.id;

    if (myId == targetId) {
      return res.status(400).json({ error: 'No pots seguir-te a tu mateix' });
    }

    await Seguidor.findOrCreate({
      where: { id_seguidor: myId, id_seguidut: targetId }
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('ERROR FOLLOW:', err);
    res.status(500).json({ error: 'Error seguint usuari' });
  }
});

router.delete('/follow/:id', authMiddleware, async (req, res) => {
  try {
    await Seguidor.destroy({
      where: { id_seguidor: req.user.id, id_seguidut: req.params.id }
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('ERROR UNFOLLOW:', err);
    res.status(500).json({ error: 'Error deixant de seguir usuari' });
  }
});

router.get('/users/following', authMiddleware, async (req, res) => {
  try {
    const {
      search = '', zona = '', experiencia = '',
      role = 'tots', page = 1, limit = 5
    } = req.query;

    const myId = req.user.id;
    const pageSize = Number(limit);
    const offset = (page - 1) * pageSize;
    const expValue = experiencia === '' ? null : Number(experiencia);

    const roleWhere = {};
    if (role === 'caminant') roleWhere.id_role = 1;
    if (role === 'business') roleWhere.id_role = 2;

    const users = await Usuari.findAll({
      attributes: [
        'id_usuari', 'nom', 'cognoms', 'username',
        'zona', 'experiencia', 'foto_perfil', 'id_role',
        [literal('true'), 'is_following']
      ],
      include: [{
        model: Usuari,
        as: "mis_seguidors",
        attributes: [],
        where: { id_usuari: myId },
        required: true
      }],
      where: {
        id_role: { [Op.ne]: 3 },
        ...roleWhere,
        [Op.and]: [
          {
            [Op.or]: [
              { nom: { [Op.iLike]: `%${search}%` } },
              { cognoms: { [Op.iLike]: `%${search}%` } },
              { username: { [Op.iLike]: `%${search}%` } }
            ]
          },
          zona ? { zona: { [Op.iLike]: `%${zona}%` } } : {},
          expValue !== null ? { experiencia: { [Op.gte]: expValue } } : {}
        ]
      },
      order: [['nom', 'ASC']],
      limit: pageSize,
      offset
    });

    res.json({ users });

  } catch (err) {
    console.error('ERROR GET FOLLOWING:', err);
    res.status(500).json({ error: 'Error obtenint seguits' });
  }
});

router.get('/users/zones', authMiddleware, async (req, res) => {
  try {
    const rows = await Usuari.findAll({
      attributes: ['zona'],
      where: {
        zona: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
        id_role: { [Op.ne]: 3 },
        id_usuari: { [Op.ne]: req.user.id }
      },
      group: ['zona'],
      order: [['zona', 'ASC']]
    });

    res.json({ zones: rows.map(z => z.zona) });

  } catch (err) {
    console.error('ERROR GET ZONES:', err);
    res.status(500).json({ error: 'Error obtenint zones' });
  }
});

router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    const myId = req.user.id;

    const [targetUser, rutes] = await Promise.all([
      Usuari.findByPk(targetId, {
        attributes: [
          'id_usuari', 'nom', 'cognoms', 'username', 'email',
          'zona', 'experiencia', 'foto_perfil', 'id_role', 'sexe', 'data_naixement', 'validated',
          [
            literal(`EXISTS(
              SELECT 1 FROM seguidors s
              WHERE s.id_seguidor = ${myId} AND s.id_seguidut = ${targetId}
            )`),
            'is_following'
          ]
        ]
      }),
      Ruta.findAll({
        where: { id_usuari: targetId },
        attributes: ['id_ruta', 'nom', 'zona', 'dificultat', 'distancia_km', 'fotos'],
        order: [['id_ruta', 'DESC']]
      })
    ]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    if (!targetUser.validated && targetUser.id_usuari != myId && req.user.role !== 3) {
      return res.status(403).json({ error: 'Aquest perfil encara no ha estat validat per un administrador' });
    }

    res.json({
      ok: true,
      user: targetUser,
      rutes
    });

  } catch (err) {
    console.error('ERROR GET USER DETAIL:', err);
    res.status(500).json({ error: 'Error obtenint el detall de l’usuari' });
  }
});

router.get('/negocis/user/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6, offset = 0 } = req.query;

    const negocis = await Negoci.findAll({
      where: { id_usuari: id },
      attributes: ['id_negoci', 'nom', 'zona', 'tipus', 'descripcio', 'fotos'],
      order: [['nom', 'ASC']],
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({ ok: true, negocis });
  } catch (err) {
    console.error('ERROR GET USER NEGOCIS:', err);
    res.status(500).json({ error: 'Error obtenint els negocis de l’usuari' });
  }
});

router.get('/rutes/user/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6, offset = 0 } = req.query;

    const whereCondition = { id_usuari: id };
    if (parseInt(req.user.id) !== parseInt(id) && req.user.role !== 3) {
      whereCondition.es_publica = true;
    }

    const rutes = await Ruta.findAll({
      where: whereCondition,
      attributes: ['id_ruta', 'nom', 'zona', 'dificultat', 'distancia_km', 'fotos', 'es_publica'],
      order: [['id_ruta', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ ok: true, rutes });
  } catch (err) {
    console.error('ERROR GET USER ROUTES:', err);
    res.status(500).json({ error: 'Error obtenint les rutes' });
  }
});

router.get('/rutes-explora', async (req, res) => {
  try {
    const { search = '', zona = '', dificultat = '', distanciaMax = '', limit = 7, offset = 0 } = req.query;

    const pageSize = Number(limit);
    const offsetNum = Number(offset);

    const whereCondition = {
      nom: { [Op.iLike]: `%${search}%` },
      es_publica: true
    };
    if (zona) whereCondition.zona = { [Op.iLike]: `%${zona}%` };
    if (dificultat) whereCondition.dificultat = dificultat;
    if (distanciaMax) whereCondition.distancia_km = { [Op.lte]: Number(distanciaMax) };

    const rutes = await Ruta.findAll({
      attributes: ['id_ruta', 'nom', 'zona', 'dificultat', 'distancia_km', 'fotos', 'id_usuari', 'valoracio_mitjana'],
      include: [{
        model: Usuari,
        as: 'autor',
        attributes: [['username', 'autor_username']]
      }],
      where: whereCondition,
      order: [['id_ruta', 'DESC']],
      limit: pageSize,
      offset: offsetNum
    });

    const result = rutes.map(r => {
      const plain = r.toJSON();
      return {
        ...plain,
        autor_username: plain.autor?.autor_username
      };
    });

    res.json({ rutes: result });
  } catch (err) {
    console.error('ERROR GET RUTES EXPLORA:', err);
    res.status(500).json({ error: 'Error obtenint rutes' });
  }
});

router.post('/reviews', authMiddleware, async (req, res) => {
  try {
    const { id_ruta, puntuacio, comentari } = req.body;
    const id_usuari = req.user.id;

    const existing = await ReviewRuta.findOne({ where: { id_ruta, id_usuari } });
    if (existing) {
      return res.status(400).json({ error: 'Ja has valorat aquesta ruta' });
    }

    const review = await ReviewRuta.create({ id_ruta, id_usuari, puntuacio, comentari });

    const reviews = await ReviewRuta.findAll({ where: { id_ruta } });
    const mitjana = reviews.reduce((acc, curr) => acc + Number(curr.puntuacio), 0) / reviews.length;

    await Ruta.update({ valoracio_mitjana: mitjana }, { where: { id_ruta } });

    res.json({ ok: true, review });
  } catch (err) {
    console.error('ERROR POST REVIEW:', err);
    res.status(500).json({ error: 'Error enviant valoració' });
  }
});

router.get('/rutes/:id/reviews', async (req, res) => {
  try {
    const reviews = await ReviewRuta.findAll({
      where: { id_ruta: req.params.id },
      include: [{ model: Usuari, as: 'autor', attributes: ['username', 'foto_perfil'] }],
      order: [['data', 'DESC']]
    });
    res.json(reviews);
  } catch (err) {
    console.error('ERROR GET REVIEWS:', err);
    res.status(500).json({ error: 'Error obtenint valoracions' });
  }
});

router.delete('/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const review = await ReviewRuta.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Valoració no trobada' });

    if (review.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís per eliminar aquesta valoració' });
    }

    const id_ruta = review.id_ruta;
    await review.destroy();

    const reviews = await ReviewRuta.findAll({ where: { id_ruta } });
    let mitjana = 0;
    if (reviews.length > 0) {
      mitjana = reviews.reduce((acc, curr) => acc + Number(curr.puntuacio), 0) / reviews.length;
    }
    await Ruta.update({ valoracio_mitjana: mitjana }, { where: { id_ruta } });

    res.json({ ok: true });
  } catch (err) {
    console.error('ERROR DELETE REVIEW:', err);
    res.status(500).json({ error: 'Error eliminant valoració' });
  }
});

router.post('/negocis-reviews', authMiddleware, async (req, res) => {
  try {
    const { id_negoci, puntuacio, comentari } = req.body;
    const id_usuari = req.user.id;

    const existing = await ReviewNegoci.findOne({ where: { id_negoci, id_usuari } });
    if (existing) {
      return res.status(400).json({ error: 'Ja has deixat una valoració en aquest negoci.' });
    }

    const review = await ReviewNegoci.create({ id_negoci, id_usuari, puntuacio, comentari });

    const reviews = await ReviewNegoci.findAll({ where: { id_negoci } });
    const mitjana = reviews.reduce((acc, curr) => acc + Number(curr.puntuacio), 0) / reviews.length;

    await Negoci.update({ valoracio_mitjana: mitjana }, { where: { id_negoci } });

    res.json({ ok: true, review });
  } catch (err) {
    console.error('ERROR POST REVIEW NEGOCI:', err);
    res.status(500).json({ error: 'Error enviant valoració' });
  }
});

router.get('/negocis/:id/reviews', async (req, res) => {
  try {
    const reviews = await ReviewNegoci.findAll({
      where: { id_negoci: req.params.id },
      include: [{ model: Usuari, as: 'autor', attributes: ['username', 'foto_perfil'] }],
      order: [['data', 'DESC']]
    });
    res.json(reviews);
  } catch (err) {
    console.error('ERROR GET REVIEWS NEGOCI:', err);
    res.status(500).json({ error: 'Error obtenint valoracions' });
  }
});

router.delete('/negocis-reviews/:id', authMiddleware, async (req, res) => {
  try {
    const review = await ReviewNegoci.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Valoració no trobada' });

    if (review.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís per eliminar aquesta valoració' });
    }

    const id_negoci = review.id_negoci;
    await review.destroy();

    const reviews = await ReviewNegoci.findAll({ where: { id_negoci } });
    let mitjana = 0;
    if (reviews.length > 0) {
      mitjana = reviews.reduce((acc, curr) => acc + Number(curr.puntuacio), 0) / reviews.length;
    }
    await Negoci.update({ valoracio_mitjana: mitjana }, { where: { id_negoci } });

    res.json({ ok: true });
  } catch (err) {
    console.error('ERROR DELETE REVIEW NEGOCI:', err);
    res.status(500).json({ error: 'Error eliminant valoració' });
  }
});

router.get('/negocis-explora', async (req, res) => {
  try {
    const { search = '', zona = '', tipus = '', limit = 100, offset = 0, minRating = 0 } = req.query;

    const where = {
      nom: { [Op.iLike]: `%${search}%` },
      [Op.and]: [
        ...(Number(minRating) > 0 ? [{
          [Op.or]: [
            { valoracio_mitjana: { [Op.is]: null } },
            { valoracio_mitjana: { [Op.gte]: Number(minRating) } }
          ]
        }] : [])
      ]
    };
    if (zona) where.zona = { [Op.iLike]: `%${zona}%` };
    if (tipus) where.tipus = tipus;

    const negocis = await Negoci.findAll({
      where,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(negocis);
  } catch (err) {
    console.error('ERROR GET NEGOCIS EXPLORA:', err);
    res.status(500).json({ error: 'Error obtenint negocis' });
  }
});

router.get('/rutes-max-km', async (req, res) => {
  try {
    const result = await Ruta.max('distancia_km');
    res.json({ maxKm: Math.ceil(Number(result) || 100) });
  } catch (err) {
    console.error(err);
    res.json({ maxKm: 100 });
  }
});

//Cercador de rutes optimitzat per al mapa amb filtres de visibilitat
router.get('/rutes-map', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        isAdmin = decoded.role === 3;
      } catch (err) { }
    }

    const { search = '', dificultat = '', maxKm = 1000, minRating = 0 } = req.query;

    const where = {
      nom: { [Op.iLike]: `%${search}%` },
      [Op.and]: [
        {
          [Op.or]: [
            { distancia_km: { [Op.is]: null } },
            { distancia_km: { [Op.lte]: Number(maxKm) } }
          ]
        },
        ...(Number(minRating) > 0 ? [{
          [Op.or]: [
            { valoracio_mitjana: { [Op.is]: null } },
            { valoracio_mitjana: { [Op.gte]: Number(minRating) } }
          ]
        }] : [])
      ]
    };

    if (dificultat) where.dificultat = { [Op.iLike]: dificultat };

    if (!isAdmin) {
      where[Op.or] = [
        { es_publica: true },
        ...(userId ? [{ id_usuari: userId }] : [])
      ];
    }

    const rutes = await Ruta.findAll({
      where,
      attributes: ['id_ruta', 'nom', 'zona', 'dificultat', 'distancia_km', 'fotos', 'id_usuari', 'es_publica', 'valoracio_mitjana'],
      include: [
        { model: Parada, as: 'parades', limit: 1 },
        { model: Usuari, as: 'autor', attributes: ['username'] }
      ]
    });

    //Per a cada ruta, li posem la lat/lng de la primera parada per facilitar la feina al frontend
    const result = rutes.map(r => {
      const p = r.parades?.[0];
      return {
        ...r.toJSON(),
        latitud: p?.latitud,
        longitud: p?.longitud
      };
    });

    res.json(result);
  } catch (err) {
    console.error('ERROR GET RUTES MAP:', err);
    res.status(500).json({ error: 'Error obtenint rutes' });
  }
});

router.get('/negocis', async (req, res) => {
  try {
    const { search = '', zona = '', tipus = '', limit = 7, offset = 0 } = req.query;

    const pageSize = Number(limit);
    const offsetNum = Number(offset);

    const negocis = await Negoci.findAll({
      attributes: ['id_negoci', 'nom', 'zona', 'tipus', 'descripcio', 'fotos', 'id_usuari', 'valoracio_mitjana', 'latitud', 'longitud'],
      include: [{
        model: Usuari,
        as: 'propietari',
        attributes: [['username', 'propietari_username']]
      }],
      where: {
        nom: { [Op.iLike]: `%${search}%` },
        ...(zona ? { zona: { [Op.iLike]: `%${zona}%` } } : {}),
        ...(tipus ? { tipus: { [Op.iLike]: `%${tipus}%` } } : {})
      },
      order: [['nom', 'ASC']],
      limit: pageSize,
      offset: offsetNum
    });

    const result = negocis.map(n => {
      const plain = n.toJSON();
      return {
        ...plain,
        propietari_username: plain.propietari?.propietari_username
      };
    });

    res.json({ negocis: result });

  } catch (err) {
    console.error('ERROR GET NEGOCIS:', err);
    res.status(500).json({ error: 'Error obtenint negocis' });
  }
});

router.get('/negocis/:id', async (req, res) => {
  try {
    const [negoci, posts] = await Promise.all([
      Negoci.findByPk(req.params.id, {
        include: [{
          model: Usuari,
          as: 'propietari',
          attributes: ['id_usuari', 'username',
            ['nom', 'propietari_nom'],
            ['cognoms', 'propietari_cognoms']]
        }],
        attributes: ['id_negoci', 'id_usuari', 'nom', 'tipus', 'descripcio', 'zona', 'latitud', 'longitud', 'fotos', 'valoracio_mitjana']
      }),
      PostNegoci.findAll({
        where: { id_negoci: req.params.id },
        attributes: ['id_post', 'titol', 'contingut', 'data', 'fotos', 'data_edicio'],
        order: [['data', 'DESC']]
      })
    ]);

    if (!negoci) return res.status(404).json({ error: 'Negoci no trobat' });

    const plain = negoci.toJSON();
    const negociFlat = {
      ...plain,
      id_usuari: plain.propietari?.id_usuari,
      username: plain.propietari?.username,
      propietari_nom: plain.propietari?.propietari_nom,
      propietari_cognoms: plain.propietari?.propietari_cognoms
    };
    delete negociFlat.propietari;

    let isFavorit = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const fav = await FavoritNegoci.findOne({
          where: { id_usuari: decoded.id, id_negoci: req.params.id }
        });
        isFavorit = !!fav;
      } catch (_) { }
    }

    res.json({ negoci: negociFlat, posts, isFavorit });

  } catch (err) {
    console.error('ERROR GET NEGOCI DETALL:', err);
    res.status(500).json({ error: 'Error obtenint negoci' });
  }
});

router.get('/me/negocis', authMiddleware, async (req, res) => {
  try {
    const { limit = 6, offset = 0 } = req.query;
    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    const negocis = await Negoci.findAll({
      where: { id_usuari: req.user.id },
      attributes: ['id_negoci', 'nom', 'zona', 'tipus', 'descripcio', 'fotos'],
      order: [['nom', 'ASC']],
      limit: limitNum,
      offset: offsetNum
    });

    res.json({ negocis });

  } catch (err) {
    console.error('ERROR GET ME NEGOCIS:', err);
    res.status(500).json({ error: "Error obtenint negocis de l'usuari" });
  }
});

router.post('/negocis', authMiddleware, upload.array('fotos'), async (req, res) => {
  try {
    if (req.user.role !== 2 && req.user.role !== 3) {
      return res.status(403).json({ error: 'Només business o admin poden crear negocis' });
    }

    const { nom, tipus, descripcio, zona, latitud, longitud } = req.body;
    if (!nom) return res.status(400).json({ error: "El nom és obligatori" });

    const fotosNoms = req.files ? req.files.map(f => f.path) : [];
    const fotosString = fotosNoms.join(',');

    const negoci = await Negoci.create({
      id_usuari: req.user.id,
      nom, tipus, descripcio, zona, latitud, longitud,
      fotos: fotosString
    });

    res.json({ ok: true, id_negoci: negoci.id_negoci });

  } catch (err) {
    console.error('ERROR CREANT NEGOCI:', err);
    res.status(500).json({ error: 'Error creant negoci' });
  }
});

router.put('/negocis/:id', authMiddleware, upload.array('fotos'), async (req, res) => {
  try {

    const negoci = await Negoci.findByPk(req.params.id);

    if (!negoci) {
      return res.status(404).json({
        error: 'Negoci no trobat'
      });
    }

    //Permisos
    if (
      negoci.id_usuari !== req.user.id &&
      req.user.role !== 3
    ) {
      return res.status(403).json({
        error: 'No tens permís'
      });
    }

    const {
      nom,
      tipus,
      descripcio,
      zona,
      latitud,
      longitud,
      existingFotos
    } = req.body;

    let fotosExistents = [];

    try {
      fotosExistents = JSON.parse(existingFotos || '[]');
    } catch {
      fotosExistents = [];
    }

    //Noves fotos
    const novesFotos = req.files
      ? req.files.map(f => f.path)
      : [];

    let fotosFinals = [];
    const ordenFotosRaw = req.body.ordenFotos;
    if (ordenFotosRaw) {
      let ordenFotos = [];
      try { ordenFotos = JSON.parse(ordenFotosRaw); } catch { ordenFotos = []; }
      let newFotoIdx = 0;
      let existingFotoIdx = 0;
      ordenFotos.forEach(type => {
         if (type === 'new' && newFotoIdx < novesFotos.length) {
            fotosFinals.push(novesFotos[newFotoIdx++]);
         } else if (type === 'existing' && existingFotoIdx < fotosExistents.length) {
            fotosFinals.push(fotosExistents[existingFotoIdx++]);
         }
      });
      while (existingFotoIdx < fotosExistents.length) fotosFinals.push(fotosExistents[existingFotoIdx++]);
      while (newFotoIdx < novesFotos.length) fotosFinals.push(novesFotos[newFotoIdx++]);
    } else {
      fotosFinals = [
        ...fotosExistents,
        ...novesFotos
      ];
    }

    //Update
    await negoci.update({
      nom,
      tipus,
      descripcio,
      zona,
      latitud,
      longitud,
      fotos: fotosFinals.join(',')
    });

    res.json({
      ok: true
    });

  } catch (err) {

    console.error('ERROR EDITANT NEGOCI:', err);

    res.status(500).json({
      error: 'Error editant negoci'
    });

  }
});

router.delete('/negocis/:id', authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const negoci = await Negoci.findByPk(req.params.id);
    if (!negoci) return res.status(404).json({ error: 'Negoci no trobat' });

    if (negoci.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís per eliminar aquest negoci' });
    }

    await PostNegoci.destroy({ where: { id_negoci: req.params.id }, transaction: t });
    await ReviewNegoci.destroy({ where: { id_negoci: req.params.id }, transaction: t });
    await FavoritNegoci.destroy({ where: { id_negoci: req.params.id }, transaction: t });
    await Negoci.destroy({ where: { id_negoci: req.params.id }, transaction: t });

    await t.commit();
    res.json({ ok: true });

  } catch (err) {
    await t.rollback();
    console.error('ERROR ELIMINANT NEGOCI:', err);
    res.status(500).json({ error: 'Error eliminant negoci' });
  }
});

router.post('/negocis/:id/posts', authMiddleware, upload.array('fotos'), async (req, res) => {
  try {
    const negoci = await Negoci.findByPk(req.params.id);
    if (!negoci) return res.status(404).json({ error: 'Negoci no trobat' });

    if (negoci.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís' });
    }

    const { titol, contingut } = req.body;
    const fotosNoms = req.files ? req.files.map(f => f.path) : [];
    const fotosString = fotosNoms.join(',');

    const post = await PostNegoci.create({
      id_negoci: req.params.id, titol, contingut, fotos: fotosString
    });

    res.json({ ok: true, id_post: post.id_post });

  } catch (err) {
    console.error('ERROR CREANT POST:', err);
    res.status(500).json({ error: 'Error creant post' });
  }
});

router.get('/posts_negoci/:id', async (req, res) => {
  try {
    const post = await PostNegoci.findByPk(req.params.id, {
      attributes: ['id_post', 'id_negoci', 'titol', 'contingut', 'data', 'fotos', 'data_edicio']
    });

    if (!post) return res.status(404).json({ error: 'Post no trobat' });

    res.json({ post });

  } catch (err) {
    console.error('ERROR GET POST NEGOCI:', err);
    res.status(500).json({ error: 'Error obtenint post de negoci' });
  }
});

router.put('/posts_negoci/:id', authMiddleware, upload.array('fotos'), async (req, res) => {
  try {
    const post = await PostNegoci.findByPk(req.params.id, {
      include: [{
        model: Negoci,
        attributes: ['id_usuari']
      }]
    });

    if (!post) {
      return res.status(404).json({ error: 'Post no trobat' });
    }

    if (post.negoci.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís' });
    }

    const { titol, contingut, existingFotos } = req.body;

    //Logica de fotos
    let fotosExistents = [];
    try {
      fotosExistents = JSON.parse(existingFotos || '[]');
    } catch {
      fotosExistents = [];
    }

    const novesFotos = req.files ? req.files.map(f => f.path) : [];
    const fotosFinals = [...fotosExistents, ...novesFotos];

    await post.update({
      titol,
      contingut,
      fotos: fotosFinals.join(','),
      data_edicio: new Date()
    });

    res.json({ ok: true });

  } catch (err) {
    console.error('ERROR EDITANT POST:', err);
    res.status(500).json({ error: 'Error editant post' });
  }
});

router.delete('/posts_negoci/:id', authMiddleware, async (req, res) => {
  try {
    const post = await PostNegoci.findByPk(req.params.id, {
      include: [{ model: Negoci, attributes: ['id_usuari'] }]
    });

    if (!post) return res.status(404).json({ error: 'Post no trobat' });

    if (post.negoci.id_usuari !== req.user.id && req.user.role !== 3) {
      return res.status(403).json({ error: 'No tens permís per eliminar aquest post' });
    }

    await post.destroy();

    res.json({ ok: true });

  } catch (err) {
    console.error('ERROR ELIMINANT POST NEGOCI:', err);
    res.status(500).json({ error: 'Error eliminant post de negoci' });
  }
});

router.post('/favorits/toggle', authMiddleware, async (req, res) => {
  const { id_ruta, id_negoci } = req.body;
  const id_usuari = req.user.id;

  try {
    if (id_ruta) {
      const existent = await FavoritRuta.findOne({
        where: { id_usuari, id_ruta }
      });

      if (existent) {
        await existent.destroy();
        return res.json({ isFavorit: false });
      } else {
        await FavoritRuta.create({ id_usuari, id_ruta });
        return res.json({ isFavorit: true });
      }
    }

    if (id_negoci) {
      const existent = await FavoritNegoci.findOne({
        where: { id_usuari, id_negoci }
      });

      if (existent) {
        await existent.destroy();
        return res.json({ isFavorit: false });
      } else {
        await FavoritNegoci.create({ id_usuari, id_negoci });
        return res.json({ isFavorit: true });
      }
    }

    return res.status(400).json({ error: "Falta id_ruta o id_negoci" });

  } catch (err) {
    console.error('ERROR EN TOGGLE FAVORITS:', err);
    res.status(500).json({ error: 'Error en favorits', details: err.message });
  }
});

router.get('/favorits/me', authMiddleware, async (req, res) => {
  try {
    const id_usuari = req.user.id;

    const {
      type = 'all',
      limit = 6,
      offset = 0
    } = req.query;

    const limitNum = Number(limit);
    const offsetNum = Number(offset);

    let result = [];

    if (type === 'rutes') {
      const rutesFavs = await FavoritRuta.findAll({
        where: { id_usuari },
        include: [{
          model: Ruta,
          as: 'ruta',
          attributes: {
            include: [[
              literal(`(SELECT username FROM usuaris WHERE usuaris.id_usuari = ruta.id_usuari)`),
              'creador_username'
            ]]
          }
        }],
        limit: limitNum,
        offset: offsetNum
      });

      result = rutesFavs.map(f => ({ ...f.toJSON(), tipus: 'ruta' }));
    }

    else if (type === 'negocis') {
      const negocisFavs = await FavoritNegoci.findAll({
        where: { id_usuari },
        include: [{
          model: Negoci,
          as: 'negoci',
          attributes: ['id_negoci', 'nom', 'zona', 'tipus', 'fotos', 'id_usuari']
        }],
        limit: limitNum,
        offset: offsetNum
      });

      result = negocisFavs.map(f => ({
        ...f.toJSON(),
        tipus: 'negoci'
      }));
    }

    else {
      const rutesFavs = await FavoritRuta.findAll({
        where: { id_usuari },
        include: [{ model: Ruta, as: 'ruta' }]
      });

      const negocisFavs = await FavoritNegoci.findAll({
        where: { id_usuari },
        include: [{ model: Negoci, as: 'negoci' }]
      });

      result = [
        ...rutesFavs.map(f => ({ ...f.toJSON(), tipus: 'ruta' })),
        ...negocisFavs.map(f => ({ ...f.toJSON(), tipus: 'negoci' }))
      ].slice(offsetNum, offsetNum + limitNum);
    }

    res.json({
      favorits: result,
      page: Math.floor(offsetNum / limitNum) + 1,
      limit: limitNum
    });

  } catch (err) {
    console.error('ERROR GET FAVORITS:', err);
    res.status(500).json({ error: 'Error obtenint preferits' });
  }
});

export default router;