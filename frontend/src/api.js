export async function fetchPoints({ city, neighbourhood, limit }) {
  const params = new URLSearchParams();
  params.set('city', city.trim());
  if (neighbourhood?.trim()) {
    params.set('neighbourhood', neighbourhood.trim());
  }
  if (limit) {
    params.set('limit', String(limit));
  }

  const response = await fetch(`/api/points?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || 'No se pudo obtener puntos';
    throw new Error(message);
  }

  return payload;
}
