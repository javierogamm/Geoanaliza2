import express from 'express';
import cors from 'cors';
import path from 'path';
import pointsRouter from './routes/points';
import locationsRouter from './routes/locations';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/points', pointsRouter);
app.use('/api/locations', locationsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const frontendDir = path.resolve(__dirname, '../../frontend');

app.use(express.static(frontendDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

export default app;
