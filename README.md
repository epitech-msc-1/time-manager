# Time Manager pour PrimeBank

![PrimeBank Logo](assets/images/prime-bank-white.png)

**Time Manager** est une solution interne de gestion du temps de travail conçue pour **PrimeBank**, une banque digitale de nouvelle génération. Cet outil vise à centraliser et optimiser le suivi des heures, la gestion des équipes et l'analyse de la productivité au sein de l'entreprise.

---

## badges

### Frontend

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.1-purple?logo=vite)
![Bun](https://img.shields.io/badge/Bun-1.3-orange?logo=bun)
![Shadcn/UI](https://img.shields.io/badge/Shadcn/UI-3.4-black?logo=shadcn-ui&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-2.2-green?logo=biome)
![Zod](https://img.shields.io/badge/Zod-4.1-blue?logo=zod)

### Backend

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![Django](https://img.shields.io/badge/Django-5.2-darkgreen?logo=django)
![GraphQL](https://img.shields.io/badge/GraphQL-Graphene-e10098?logo=graphql)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Ruff](https://img.shields.io/badge/Ruff-0.13-hotpink?logo=ruff)

### DevOps

![Docker](https://img.shields.io/badge/Docker-28.2-blue?logo=docker)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI/CD-blue?logo=githubactions)
![SonarQube](https://img.shields.io/badge/SonarQube-25.10-orange?logo=sonarqube)
![Cypress](https://img.shields.io/badge/Cypress-15.3-black?logo=cypress)

---

## Problématique

Avec sa croissance rapide, PrimeBank fait face à des défis dans la gestion du temps de travail de ses collaborateurs. L'absence d'un outil centralisé entraîne un manque de visibilité, des risques d'erreurs et une perte de temps administrative.

## Objectif du projet

**Time Manager** a pour but de fournir une plateforme unique et intuitive pour :

- **Centraliser** la gestion du temps et des équipes.
- **Automatiser** le suivi des heures de travail.
- **Fournir** des indicateurs de performance (KPIs) aux managers.
- **Améliorer** la productivité et la transparence au sein de l'entreprise.

## Fonctionnalités Clés

- **Pointage Automatisé** : Enregistrement simple et rapide des heures d'arrivée et de départ.
- **Historique des Heures** : Accès facile à l'historique des heures travaillées pour les employés.
- **Gestion des Équipes** : Visualisation des plannings individuels et collectifs.
- **Tableaux de Bord Manager** : Rapports et KPIs sur la charge de travail, les retards, etc.
- **Gestion des Rôles** : Permissions adaptées pour employés, managers et administrateurs.
- **Authentification Sécurisée**.

## Stack Technique

Ce projet est construit sur une architecture moderne et robuste, en suivant la philosophie DevOps.

- **Frontend** : Développé avec **React** et **TypeScript**, utilisant **Vite** comme bundler et **Bun** comme runtime. L'interface est construite avec **Shadcn/UI**, et la validation des données est assurée par **Zod**. Le code est formaté et linté avec **Biome**.
- **Backend** : Une API **GraphQL** robuste développée avec **Python** et le framework **Django** (utilisant **Graphene-Django**). Le code est maintenu propre grâce à **Ruff**.
- **Base de Données** : **PostgreSQL** pour une persistance des données fiable et performante.
- **DevOps** : Le projet est entièrement conteneurisé avec **Docker** et orchestré via **Docker Compose**. L'intégration et le déploiement continus (CI/CD) sont gérés par **GitHub Actions**, assurant la qualité du code avec des builds, des tests automatisés et des analyses **SonarQube**.

## Démarrage Rapide

### Prérequis

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation et Lancement

1. Clonez le dépôt :

    ```bash
    git clone https://github.com/epitech-msc-1/time-manager.git
    cd time-manager
    ```

2. Lancez l'environnement de développement avec Docker Compose :

    ```bash
    docker compose up --build
    ```

3. Une fois les conteneurs démarrés :
    - Le **frontend** sera accessible sur `http://localhost:5173`.
    - Le **backend** (API GraphQL) sera accessible sur `http://localhost:8000/graphql`.

## Pipeline CI/CD

Le projet intègre une pipeline CI/CD avec GitHub Actions qui automatise les tâches suivantes à chaque push ou pull request :

- **Build** : Construction des images Docker pour le frontend et le backend.
- **Test** : Exécution des tests unitaires et d'intégration.
- **Analyse de Code** : Vérification de la qualité et de la sécurité du code avec SonarQube.

## Contribution

Les contributions sont les bienvenues ! Merci de suivre les conventions de commit et de passer par les Pull Requests pour toute modification.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
