import app from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  // Basic startup log to confirm server boot.
  console.log(`AppGeoAnaliza backend escuchando en http://localhost:${PORT}`);
});
