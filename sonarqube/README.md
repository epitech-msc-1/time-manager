
# SonarQube — mode d'emploi

Petit guide pour lancer SonarQube et le scanner localement.

## Accès à l'interface

- Ouvrir l'interface SonarQube : `http://localhost:9000` (ou le port configuré).
- User et MDP par défaut : admin

## Commandes rapides

- Démarrer SonarQube (si nécessaire) :

```bash
docker compose up -d sonarqube
```

- Lancer le scanner défini dans `compose.yml` (option simple) :

```bash
docker compose run --rm sonar-scanner
```

## Remarques utiles

- `SONAR_TOKEN` est nécessaire, exporte-la ou place-la dans `.env` utilisé par `docker compose`.
- Le scanner monte le repo : assure-toi que le dossier `.git` est présent si tu veux les infos de blame.
- Après l'upload, le scanner affiche l'URL du rapport et l'ID de tâche CE; patienter le temps que SonarQube traite le rapport.
