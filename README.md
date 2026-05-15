# OutTrail - Projecte Final 🌲🚶‍♂️

OutTrail és una plataforma web dissenyada per a l'exploració i creació de rutes a l'aire lliure, així com per a la promoció de negocis locals relacionats amb el senderisme i la natura.

## Com desplegar el projecte localment

Segueix aquests passos per configurar i executar l'aplicació en el teu entorn local.

### Requisits previs

Abans de començar, assegura't de tenir instal·lat:
- **Node.js** (Versió 18 o superior recomanada)
- **NPM** (inclòs amb Node.js)
- Accés a una base de dades **PostgreSQL**


### 1️. Configurar el Backend (Servidor)

El backend gestiona l'API, la base de dades i l'autenticació.

1. Navega fins a la carpeta del backend:
   cd Backend

2. Instal·la les dependències:
   npm install

3. Configura l'arxiu `.env`:
   Copia l'arxiu `.env.exemple` a un nou arxiu anomenat `.env` i afegeix les teves credencials (Base de dades, claus d'API per a mapes, correu etc.).
   cp .env.exemple .env

4. Inicia el servidor en mode desenvolupament:
   npm run dev

   *El servidor s'executarà normalment a `http://localhost:4000`.*


### 2️. Configurar el Frontend (Interfície)

El frontend és la part visual creada amb React i Vite.

1. Obre una nova terminal i navega fins a la carpeta del frontend:
   cd Frontend

2. Instal·la les dependències:
   npm install

3. Configura l'arxiu `.env`:
   Copia l'arxiu `.env.exemple` a un nou arxiu anomenat `.env` i afegeix la teva clau d'API.
   ```powershell
   cp .env.exemple .env
   ```

4. Inicia l'aplicació:
   npm run dev

4. Obre el navegador i accedeix a l'adreça que indiqui la terminal (per defecte: `http://localhost:5173`).


## Tecnologies Principals

- **Frontend**: React, Vite, Leaflet (Mapes interactius), CSS3 (Responsive Design).
- **Backend**: Node.js, Express, Sequelize ORM (PostgreSQL).
- **Serveis**: OpenRouteService (Geometria de rutes), LocationIQ (Geocoding), Nodemailer (Notificacions).