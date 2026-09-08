# Mémento

MVP mobile Expo pour apprendre les prénoms à partir de photos. Les données, les échéances et l'historique sont conservés localement avec SQLite.

## Lancer l'application

```bash
npm install
npm start
```

Scanne ensuite le QR code avec Expo Go, ou appuie sur `i` / `a` pour ouvrir un simulateur iOS / Android.

## Fonctionnalités

- paquets et cartes avec photo, prénom, nom et contexte ;
- sessions avec révision immédiate, dans 10 minutes, 1 heure ou 1 jour ;
- quota quotidien de nouvelles cartes par paquet ;
- ajout manuel de nouvelles cartes pendant une session, au-delà du quota ;
- import CSV ou ZIP avec détection automatique de la virgule ou du point-virgule ;
- mise à jour sans perte de progression grâce à `id_externe` ;
- données entièrement locales dans `memento-v1.db`.

Un paquet de démonstration est créé au premier lancement. Le fichier [`example.csv`](./example.csv) peut servir à tester l'import.

## Format CSV

La seule colonne obligatoire est `prenom`. Les alias anglais (`firstname`, `lastname`, `context`, `external_id`) sont aussi acceptés.

```csv
prenom,nom,photo,contexte,id_externe
Alice,Martin,https://example.com/alice.jpg,Design,alice-001
```

La colonne `photo` accepte une URL publique. L'import accepte aussi une archive ZIP contenant un CSV et ses images ; les fichiers `bleu.zip`, `jaune.zip` et `4eme8.zip` présents dans le dépôt sont directement compatibles. Les portraits importés ou choisis dans la photothèque sont copiés dans le stockage durable de l'application.
