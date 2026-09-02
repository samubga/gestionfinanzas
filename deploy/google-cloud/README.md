# Despliegue económico: Firebase Hosting + Cloud Run + Neon

Esta configuración publica la aplicación sin VPS y conserva web y API bajo el mismo dominio:

```
https://PROJECT_ID.web.app          Firebase Hosting (React y HTTPS)
https://PROJECT_ID.web.app/api/*    Cloud Run (API Express)
                                    Neon (PostgreSQL)
```

Firebase reenvía internamente las peticiones `/api` a Cloud Run. Por tanto, las cookies de sesión siguen siendo de origen único y no hay que relajar la configuración de CORS ni de `SameSite`.

## Antes de publicar

1. Crea un proyecto de Google Cloud/Firebase y asócialo a una cuenta de facturación. Cloud Run tiene cuota gratuita, pero exige tener la facturación activada.
2. Crea un proyecto PostgreSQL en Neon con región europea. Copia la cadena de conexión directa, con `sslmode=require`.
3. Genera nuevos valores aleatorios para `JWT_SECRET` (mínimo 32 caracteres) y `INVITE_CODES`. Crea en Resend una clave API y verifica el dominio del remitente. Nunca uses las claves locales ni las añadas a Git.

## Publicar la API

Sustituye los valores entre mayúsculas y ejecuta desde la raíz del proyecto:

```powershell
gcloud auth login
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create gestionfinanzas --repository-format=docker --location=europe-west3 --description="Imágenes privadas de Gestion Finanzas"
gcloud secrets create gestionfinanzas-database-url --replication-policy=automatic
gcloud secrets create gestionfinanzas-jwt-secret --replication-policy=automatic
gcloud secrets create gestionfinanzas-invite-codes --replication-policy=automatic
gcloud secrets create gestionfinanzas-resend-api-key --replication-policy=automatic
```

Añade el contenido de cada secreto mediante la consola de Google Cloud o con una nueva versión de cada secreto. No lo pegues en la terminal compartida ni lo guardes en archivos del proyecto.

Construye la imagen y despliega la API:

```powershell
gcloud builds submit --config cloudbuild.cloudrun.yaml --substitutions=_IMAGE=europe-west3-docker.pkg.dev/PROJECT_ID/gestionfinanzas/api:latest .
gcloud run jobs create gestionfinanzas-migrate --image europe-west3-docker.pkg.dev/PROJECT_ID/gestionfinanzas/api:latest --region europe-west3 --command npx --args prisma,migrate,deploy --set-secrets DATABASE_URL=gestionfinanzas-database-url:latest
gcloud run jobs execute gestionfinanzas-migrate --region europe-west3 --wait
gcloud run deploy gestionfinanzas-api --image europe-west3-docker.pkg.dev/PROJECT_ID/gestionfinanzas/api:latest --region europe-west3 --allow-unauthenticated --set-env-vars NODE_ENV=production,APP_ORIGIN=https://PROJECT_ID.web.app,RESEND_FROM="Finanzas <acceso@TU_DOMINIO>",RUN_LEGACY_ACCOUNT_MIGRATION=false --set-secrets DATABASE_URL=gestionfinanzas-database-url:latest,JWT_SECRET=gestionfinanzas-jwt-secret:latest,INVITE_CODES=gestionfinanzas-invite-codes:latest,RESEND_API_KEY=gestionfinanzas-resend-api-key:latest
```

La API debe ser invocable públicamente para que Firebase Hosting pueda reenviar `/api`. Los datos siguen protegidos por autenticación, comprobaciones de propiedad, límites de peticiones y validación de origen.
La migración se ejecuta como tarea separada antes de iniciar la nueva versión; no se ejecuta automáticamente en cada instancia de Cloud Run.

## Publicar la web

1. En Firebase Console, activa **Hosting** en el mismo proyecto de Google.
2. Inicia sesión en Firebase CLI y asocia el proyecto: `firebase use PROJECT_ID`.
3. Publica: `firebase deploy --only hosting`.
4. La aplicación quedará disponible en `https://PROJECT_ID.web.app`, con HTTPS gestionado por Firebase.

Hostinger no interviene en este despliegue. Si en el futuro conectas un dominio propio, Firebase mostrará los registros DNS exactos que deberás añadir en el proveedor del dominio.

## Datos y copias

Antes de migrar la base local a Neon, crea otro `pg_dump` y prueba su restauración en una base temporal. La copia local existente se conserva. Tras publicar, programa una exportación periódica cifrada fuera de Google y Neon.

## Actualizaciones

Cada actualización seguirá este orden: copia de base de datos, compilación local, publicación de la imagen en Cloud Run y `firebase deploy --only hosting`. No ejecutes migraciones heredadas automáticamente.
