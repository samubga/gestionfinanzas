# Despliegue de producción

1. Crea un VPS actualizado con un dominio que apunte a su dirección IP. Abre sólo los puertos 80 y 443 en el cortafuegos.
2. Copia `deploy/.env.production.example` a `deploy/.env.production`, completa secretos nuevos y mantenlo fuera de Git.
3. Desde la raíz del proyecto ejecuta `docker compose --env-file deploy/.env.production -f docker-compose.prod.yml up -d --build`.
4. Comprueba `https://tu-dominio/api/health` y crea las cuentas con códigos de invitación distintos.

La base de datos y la API no publican puertos: sólo Caddy recibe tráfico HTTPS y reenvía `/api` internamente. Antes de cada actualización, realiza una copia de PostgreSQL y prueba su restauración en un entorno separado.
