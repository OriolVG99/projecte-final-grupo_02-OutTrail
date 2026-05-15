-- ================================
-- OUTTRAIL - SCHEMA COMPLET
-- ================================

-- Eliminar taules si existeixen (ordre invers per FK)
DROP TABLE IF EXISTS favorits_negocis CASCADE;
DROP TABLE IF EXISTS favorits_rutes CASCADE;
DROP TABLE IF EXISTS seguidors CASCADE;
DROP TABLE IF EXISTS rutes_geometria CASCADE;
DROP TABLE IF EXISTS posts_negoci CASCADE;
DROP TABLE IF EXISTS negocis CASCADE;
DROP TABLE IF EXISTS reviews_rutes CASCADE;
DROP TABLE IF EXISTS reviews_negocis CASCADE;
DROP TABLE IF EXISTS parades CASCADE;
DROP TABLE IF EXISTS rutes CASCADE;
DROP TABLE IF EXISTS usuaris CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ================================
-- TAULA: roles
-- ================================
CREATE TABLE roles (
  id_role SERIAL PRIMARY KEY,
  nom_role VARCHAR(50) NOT NULL
);

INSERT INTO roles (nom_role) VALUES
('caminant'),
('business'),
('admin');

-- ================================
-- TAULA: usuaris
-- ================================
CREATE TABLE usuaris (
  id_usuari SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  cognoms VARCHAR(150),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  data_naixement TEXT,
  sexe VARCHAR(20),
  zona VARCHAR(100),
  experiencia INTEGER,
  id_role INTEGER NOT NULL REFERENCES roles(id_role),
  foto_perfil VARCHAR(255),
  validated BOOLEAN DEFAULT TRUE
);

-- ================================
-- TAULA: rutes
-- ================================
CREATE TABLE rutes (
  id_ruta SERIAL PRIMARY KEY,
  id_usuari INTEGER NOT NULL REFERENCES usuaris(id_usuari),
  nom VARCHAR(150) NOT NULL,
  descripcio TEXT,
  zona VARCHAR(100),
  distancia_km DECIMAL(5,2),
  dificultat VARCHAR(50),
  fotos TEXT,
  valoracio_mitjana DECIMAL(3,2),
  es_publica BOOLEAN DEFAULT TRUE
);

-- ================================
-- TAULA: parades
-- ================================
CREATE TABLE parades (
  id_parada SERIAL PRIMARY KEY,
  id_ruta INTEGER NOT NULL REFERENCES rutes(id_ruta) ON DELETE CASCADE,
  nom VARCHAR(150) NOT NULL,
  tipus VARCHAR(50),
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7)
);

-- ================================
-- TAULA: reviews_rutes
-- ================================
CREATE TABLE reviews_rutes (
  id_review SERIAL PRIMARY KEY,
  id_ruta INTEGER NOT NULL REFERENCES rutes(id_ruta) ON DELETE CASCADE,
  id_usuari INTEGER NOT NULL REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  puntuacio INTEGER CHECK (puntuacio BETWEEN 1 AND 5),
  comentari TEXT,
  data TIMESTAMP DEFAULT NOW()
);

-- ================================
-- TAULA: negocis
-- ================================
CREATE TABLE negocis (
  id_negoci SERIAL PRIMARY KEY,
  id_usuari INTEGER NOT NULL REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  nom VARCHAR(150) NOT NULL,
  zona VARCHAR(100),
  descripcio TEXT,
  fotos TEXT,
  tipus VARCHAR(100),
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  valoracio_mitjana DECIMAL(3,2) DEFAULT 0
);

-- ================================
-- TAULA: posts_negoci
-- ================================
CREATE TABLE posts_negoci (
  id_post SERIAL PRIMARY KEY,
  id_negoci INTEGER NOT NULL REFERENCES negocis(id_negoci) ON DELETE CASCADE,
  titol VARCHAR(150) NOT NULL,
  contingut TEXT NOT NULL,
  data TIMESTAMP DEFAULT NOW(),
  fotos TEXT,
  data_edicio TIMESTAMP
);

-- ================================
-- TAULA: rutes_geometria
-- ================================
CREATE TABLE rutes_geometria (
  id_ruta INTEGER REFERENCES rutes(id_ruta) ON DELETE CASCADE,
  geojson JSONB NOT NULL
);

-- ================================
-- TAULA: seguidors
-- ================================
CREATE TABLE seguidors (
  id_seguidor INTEGER REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  id_seguidut INTEGER REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  PRIMARY KEY (id_seguidor, id_seguidut)
);

-- ================================
-- TAULA: favorits_rutes
-- ================================
CREATE TABLE favorits_rutes (
  id_usuari INTEGER NOT NULL REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  id_ruta INTEGER NOT NULL REFERENCES rutes(id_ruta) ON DELETE CASCADE,
  data_creacio TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id_usuari, id_ruta)
);

-- ================================
-- TAULA: favorits_negocis
-- ================================
CREATE TABLE favorits_negocis (
  id_usuari INTEGER NOT NULL REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  id_negoci INTEGER NOT NULL REFERENCES negocis(id_negoci) ON DELETE CASCADE,
  data_creacio TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id_usuari, id_negoci)
);

-- ================================
-- TAULA: reviews_negocis
-- ================================
CREATE TABLE reviews_negocis (
  id_review SERIAL PRIMARY KEY,
  id_negoci INTEGER REFERENCES negocis(id_negoci) ON DELETE CASCADE,
  id_usuari INTEGER REFERENCES usuaris(id_usuari) ON DELETE CASCADE,
  puntuacio INTEGER NOT NULL,
  comentari TEXT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);