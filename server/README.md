# 🚀 Parallax Cyber-City — Heroku Multiplayer & OAuth Server Guide

Guía de despliegue paso a paso en **Heroku** utilizando los créditos del **GitHub Student Developer Pack** ($13 USD/mes = hasta $312 USD gratis).

---

## 1. Crear la Aplicación en Heroku con tu Student Pack
1. Inicia sesión en [Heroku Dashboard](https://dashboard.heroku.com/) con tu cuenta vinculada al GitHub Student Pack.
2. Haz clic en **New** -> **Create new app**.
3. Nombra tu aplicación (por ejemplo: `parallax-cyber-city`).
4. Selecciona la región (United States o Europe).

---

## 2. Configurar la GitHub OAuth App (para detección de usuarios)
1. En GitHub, ve a **Settings** -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
2. Completa los campos:
   - **Application name**: `Parallax Cyber-City 3D`
   - **Homepage URL**: `https://itsparallax.me`
   - **Authorization callback URL**: `https://tu-app-heroku.herokuapp.com/auth/github/callback`
3. Copia el **Client ID** y genera un **Client Secret**.

---

## 3. Configurar Variables de Entorno en Heroku
En el panel de tu app en Heroku, ve a **Settings** -> **Config Vars** y añade:
- `CLIENT_ORIGIN` = `https://itsparallax.me`
- `GITHUB_CLIENT_ID` = `(tu Client ID de GitHub)`
- `GITHUB_CLIENT_SECRET` = `(tu Client Secret de GitHub)`
- `NODE_ENV` = `production`

---

## 4. Despliegue con Git
Desde tu terminal:
```bash
# Iniciar sesión en Heroku CLI
heroku login

# Agregar el remote de Heroku a este subdirectorio o repositorio
git subtree push --prefix server heroku main
# O clonar en un repo dedicado:
cd server
git init
heroku git:remote -a tu-app-heroku
git add .
git commit -m "feat: deploy parallax cyber-city authoritative server"
git push heroku main
```

¡Listo! El servidor responderá en `https://tu-app-heroku.herokuapp.com` con WebSockets (`wss://`) y autenticación GitHub OAuth 2.0.
