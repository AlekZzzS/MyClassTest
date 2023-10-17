import express, { json } from 'express';
import PostController from './PostController.js';
import { config } from 'dotenv';
config();

const app = express();
const port = process.env.PORT || 3000;

app.use(json());

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

app.get('/', PostController.get)
app.post('/lessons', PostController.create)




