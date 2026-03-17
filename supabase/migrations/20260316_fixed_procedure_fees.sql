-- Actualiza los aranceles globales a un array JSONB estricto de 9 posiciones.
-- Esto protege las foreign keys de la logica automatizada de Tesoreria por Edades y Trámites.

UPDATE settings
SET procedure_fees = '[
  {"id": 1, "title": "Inscripción de clubes", "price": "0"},
  {"id": 2, "title": "Inscripción de jugadores/as mayores de 18 años", "price": "0"},
  {"id": 3, "title": "Inscripción de Jugadoras/es menores de 18 años", "price": "0"},
  {"id": 4, "title": "Inscripción de Jugadores/as de Newcom", "price": "0"},
  {"id": 5, "title": "Inscripción de Técnicos", "price": "0"},
  {"id": 6, "title": "Pase Mayor de 18 años", "price": "0"},
  {"id": 7, "title": "Pase menor de 18 años", "price": "0"},
  {"id": 8, "title": "Pases a préstamos", "price": "0"},
  {"id": 9, "title": "Inscripcion de Jugadoras/es de Mini-voley", "price": "0"}
]'::jsonb
WHERE singleton_key = true;
