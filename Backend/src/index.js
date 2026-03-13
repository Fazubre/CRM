const express = require('express');
require('dotenv').config();
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
res.json({ status: 'ok', message: 'API is healthy' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
});