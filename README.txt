╔══════════════════════════════════════════════════════════════╗
║                 PORTFOLIO — MODE D'EMPLOI                    ║
╚══════════════════════════════════════════════════════════════╝

Bienvenue dans votre portfolio artistique.
Ce dossier contient tout votre site, votre éditeur et votre contenu.


──────────────────────────────────────────────────────────────
  1.  DÉMARRER  (double-cliquez)
──────────────────────────────────────────────────────────────

    ▸ Double-cliquez sur  start.bat

    Une fenêtre de commande s'ouvre (laissez-la ouverte).
    Votre navigateur se lance automatiquement sur le site.

    Le site est visible à l'adresse :
        http://localhost:8765/

    L'éditeur est visible à l'adresse :
        http://localhost:8765/admin.html


──────────────────────────────────────────────────────────────
  2.  MODIFIER VOTRE SITE
──────────────────────────────────────────────────────────────

    Ouvrez  http://localhost:8765/admin.html

    ◆ Onglet "Artiste"     → votre nom, bio, contact, réseaux
    ◆ Onglet "Faune & 3D"  → vos projets de photo animalière + 3D
    ◆ Onglet "FX"          → vos projets d'effets spéciaux
    ◆ Onglet "Motion"      → vos projets de motion design
    ◆ Onglet "Médiathèque" → glissez-déposez vos images ici

    ▸ Cliquez "Enregistrer" (ou Ctrl+S) après chaque modification.

    Le site ouvert dans un autre onglet se met à jour automatiquement
    en 1-2 secondes — pas besoin de recharger la page.


──────────────────────────────────────────────────────────────
  3.  AJOUTER UNE IMAGE
──────────────────────────────────────────────────────────────

    ▸ Onglet Médiathèque → glissez vos images.
    ▸ Vos images sont stockées dans  assets/images/uploads/
    ▸ Dans un projet, cliquez "Parcourir" pour choisir une image
      déjà importée, ou tapez son chemin directement.

    Formats supportés : JPG, PNG, WEBP, GIF, MP4, WEBM


──────────────────────────────────────────────────────────────
  4.  STRUCTURE DU DOSSIER
──────────────────────────────────────────────────────────────

    start.bat            → lance tout en 1 clic
    server.py            → serveur local (ne pas modifier)
    content.json         → TOUT votre contenu (modifié via admin)
    index.html           → votre site
    admin.html           → l'éditeur visuel
    README.txt           → ce fichier

    assets/css/          → styles (design du site et de l'admin)
    assets/js/           → logique du site et de l'admin
    assets/images/       → vos images
      └ uploads/         → imports via l'éditeur


──────────────────────────────────────────────────────────────
  5.  PERSONNALISER PLUS LOIN
──────────────────────────────────────────────────────────────

    ◆ Couleurs : modifiez les variables CSS en haut de
        assets/css/style.css  (ligne :root)

        --coral    (orange vif, accent principal)
        --indigo   (bleu, accent secondaire)
        --amber    (jaune chaud)
        --cream    (beige du fond)

    ◆ Typographies : elles viennent de Google Fonts
        Fraunces       → titres (sérif artistique)
        Space Grotesk  → textes (sans-serif moderne)

    ◆ Astuce titres : utilisez *mot* pour mettre un mot en
      italique coloré dans les titres de section.
      Ex : "Le *vivant* réinventé"  →  "Le vivant réinventé"


──────────────────────────────────────────────────────────────
  6.  ARRÊTER LE SERVEUR
──────────────────────────────────────────────────────────────

    ▸ Fermez la fenêtre de commande, ou pressez Ctrl+C dedans.


──────────────────────────────────────────────────────────────
  7.  SI ÇA NE MARCHE PAS
──────────────────────────────────────────────────────────────

    ◆ "Python n'est pas installé"
      → installez Python 3 : https://www.python.org/downloads/
        Cochez "Add Python to PATH" pendant l'installation.

    ◆ Le port 8765 est occupé ?
      → le serveur choisira automatiquement un port libre
        (8766, 8767, …). Regardez la fenêtre de commande.

    ◆ Les changements ne s'affichent pas ?
      → pressez Ctrl+Maj+R dans le navigateur pour forcer
        le rechargement.


──────────────────────────────────────────────────────────────
  PROFITEZ ! ✦
──────────────────────────────────────────────────────────────
