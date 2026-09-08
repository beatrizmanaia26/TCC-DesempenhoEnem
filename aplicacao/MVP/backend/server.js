// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/api', (req, res) => {
  res.json({ mensagem: 'Backend está funcionando!' });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(` Servidor rodando em http://localhost:${port}`);
});
//chamar funcoes do config e coisas do mongo