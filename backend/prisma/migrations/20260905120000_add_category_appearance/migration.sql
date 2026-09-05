ALTER TABLE "Category"
  ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'tag',
  ADD COLUMN "iconStrokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 1.8;

UPDATE "Category"
SET "icon" = CASE
  WHEN lower("name") IN ('alimentación', 'alimentacion', 'supermercado') THEN 'shopping-basket'
  WHEN lower("name") IN ('transporte', 'coche') THEN 'car'
  WHEN lower("name") IN ('vivienda', 'alquiler', 'hipoteca') THEN 'home'
  WHEN lower("name") IN ('ocio', 'entretenimiento') THEN 'clapperboard'
  WHEN lower("name") IN ('viaje', 'viajes', 'vacaciones') THEN 'plane'
  WHEN lower("name") = 'salud' THEN 'heart-pulse'
  WHEN lower("name") IN ('gimnasio', 'deporte') THEN 'dumbbell'
  WHEN lower("name") IN ('tecnología', 'tecnologia') THEN 'laptop'
  WHEN lower("name") IN ('suscripción', 'suscripcion', 'suscripciones') THEN 'repeat'
  WHEN lower("name") IN ('nómina', 'nomina', 'sueldo') THEN 'badge-dollar'
  WHEN lower("name") IN ('inversión', 'inversion', 'inversiones') THEN 'trending-up'
  ELSE "icon"
END;
