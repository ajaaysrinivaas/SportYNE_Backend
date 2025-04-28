# SportYNE Backend

SportYNE Backend provides API services for the SportYNE wellness platform. It offers RESTful endpoints for PostgreSQL operations and Google Drive integrations.

## Features
- RESTful API structure  
- PostgreSQL data handling  
- Google Cloud Storage and Drive API integration  
- Request compression and rate limiting  
- CORS support and JSON body parsing  
- Modular, easy-to-extend route setup  

## Tech Stack
- **Runtime and framework**: Node.js, Express.js  
- **Database client**: pg (PostgreSQL)  
- **File storage**: @google-cloud/storage, googleapis  
- **Caching**: node-cache, lru-cache  
- **Logging**: morgan  
- **Security**: express-rate-limit, cors, compression  
- **Environment management**: dotenv  
- **TypeScript support**: ts-node-dev, typescript  

## Prerequisites
- Node.js 18.x or higher  
- Yarn or npm  
- A PostgreSQL database  
- Google Cloud credentials JSON (for storage and Drive API)  

## Getting Started

1. **Install dependencies**  
   ```bash
   yarn install
   ```

2. **Create a `.env` file** in the project root with your variables, for example:  
   ```bash
   DATABASE_URL=postgres://user:pass@host:port/dbname
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
   PORT=4000
   ```

3. **Run in development mode** (auto-reload on changes):  
   ```bash
   yarn dev
   ```

4. **Compile TypeScript for production**:  
   ```bash
   yarn build
   ```

5. **Start the compiled server**:  
   ```bash
   yarn start
   ```

## Project Status
This version was rebuilt and relaunched under solo independent development for clean ownership. Core functionality is stable; additional features are planned.

## License
MIT License  

Developed and maintained by Ajaay Srinivaas