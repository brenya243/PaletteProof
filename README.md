# PaletteProof

PaletteProof est un outil d’analyse de palette de couleurs et d’accessibilité conçu pour BS3 Digital.

## Fonctionnalités

- Import d’image par clic ou glisser-déposer.
- Extraction automatique des couleurs dominantes.
- Génération d’une palette claire et sombre.
- Vérification du contraste selon les règles WCAG.
- Export en variables CSS.
- Export en configuration Tailwind CSS.
- Lien de partage contenant la palette analysée.

## Lancer en local

Ouvrez simplement `index.html` dans un navigateur.

Vous pouvez aussi utiliser un serveur local :

```bash
npx serve
```

## Déploiement sur Vercel

Ce projet est un site statique. Aucun build n’est nécessaire.

### Option 1 — via GitHub

1. Créez un dépôt GitHub nommé `PaletteProof`.
2. Poussez ce projet vers le dépôt.
3. Connectez-vous sur Vercel.
4. Cliquez sur **Add New Project**.
5. Importez le dépôt GitHub `PaletteProof`.
6. Laissez les paramètres par défaut :
   - Framework Preset : Other
   - Build Command : vide
   - Output Directory : vide ou `.`
7. Déployez.

### Option 2 — via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Notes

Le lien de partage actuel transporte la palette directement dans l’URL. Pour un vrai lien court public, une intégration avec un service de raccourcissement d’URL ou une fonction serverless pourra être ajoutée dans une version suivante.