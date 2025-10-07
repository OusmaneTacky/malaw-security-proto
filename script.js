// script.js - Scanner SMS -> crée alertes dans localStorage

// Configuration simple (mots-clés -> catégorie, poids)
const KEYWORDS = [
  { words: ["gagnez", "gagner", "gagné", "lot", "concours", "tirage"], category: "Fraude concours", weight: 0.8 },
  { words: ["wave", "orange money", "om", "mobile money", "virement", "transfert"], category: "Escroquerie", weight: 0.9 },
  { words: ["cliquez ici", "lien", "http", "https", "bit.ly", "shortener"], category: "Phishing", weight: 0.95 },
  { words: ["mot de passe", "mdp", "identifiant", "login"], category: "Vol de données", weight: 0.9 },
  { words: ["livraison", "livreur", "paiement à la livraison", "paiement à réception"], category: "Fraude livraison", weight: 0.7 },
  { words: ["numero bloque", "vérifier votre compte", "suspendu", "compte suspendu"], category: "Vishing / phishing", weight: 0.9 },
  { words: ["code", "otp", "mot de passe à usage unique", "one-time password"], category: "SIM swap / récupération", weight: 0.85 },
  { words: ["virus", "malware", "télécharger", "apk"], category: "Malware", weight: 0.9 },
  { words: ["téléchargez", "ouvre le fichier", ".apk"], category: "Malware", weight: 0.9 },
  { words: ["facture impayée", "paiement requis", "votre facture"], category: "Escroquerie", weight: 0.7 }
];

// seuil minimal pour considérer qu'un SMS est une menace (0..1)
const DETECTION_THRESHOLD = 0.4;

// utilitaire : normalise le texte
function normalizeText(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// analyse texte -> renvoie {score, matches: [{keyword,category,weight}], category}
function analyzeText(text) {
  const s = normalizeText(text);
  let score = 0;
  const matches = [];

  for (const entry of KEYWORDS) {
    for (const w of entry.words) {
      // simple recherche mot-clé ; on utilise includes pour être permissif
      if (s.includes(w)) {
        // si plusieurs mots de la même catégorie apparaissent, on cumule
        score += entry.weight;
        matches.push({ keyword: w, category: entry.category, weight: entry.weight });
        break; // éviter d'ajouter la même catégorie deux fois pour ce passage
      }
    }
  }

  // normaliser score (cap)
  // hypothèse : pas plus de 3 catégories pertinentes en moyenne
  score = Math.min(score / 2.5, 1); // tuning simple pour rester entre 0..1

  // déterminer catégorie principale (celle avec le poids cumulé max)
  const categoryCounts = {};
  for (const m of matches) {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + m.weight;
  }
  const category = Object.keys(categoryCounts).length
    ? Object.keys(categoryCounts).reduce((a,b) => categoryCounts[a] > categoryCounts[b] ? a : b)
    : "Inconnu";

  return { score, matches, category };
}

// vérifie doublon simple (même texte + même catégorie + même date courte)
function isDuplicateAlert(newAlert, existingAlerts) {
  return existingAlerts.some(a =>
    a.description === newAlert.description &&
    a.categorie === newAlert.categorie
  );
}

// crée une alerte et la stocke
function pushAlertToLocalStorage(alerte) {
  const alertes = JSON.parse(localStorage.getItem("alertes") || "[]");
  // éviter doublons
  if (isDuplicateAlert(alerte, alertes)) return false;
  alertes.unshift(alerte);
  localStorage.setItem("alertes", JSON.stringify(alertes));
  // déclencher storage event pour autres onglets (optionnel)
  try { window.dispatchEvent(new Event('storage')); } catch(e) {}
  return true;
}

// fonction appelée par le bouton "Analyser"
async function trainAndScan() {
  const btn = document.getElementById('analyzeBtn');
  const txt = document.getElementById('smsInput').value.trim();
  const resultDiv = document.getElementById('result');

  if (!txt) {
    resultDiv.textContent = "⚠️ Saisis d'abord le contenu du SMS.";
    resultDiv.className = "result active";
    return;
  }

  // état UI
  btn.classList.add('loading');
  resultDiv.textContent = "Analyse en cours…";
  resultDiv.className = "result active";

  // (ici on pourrait entraîner un modèle tfjs si tu veux; pour l'instant heuristique)
  await new Promise(r => setTimeout(r, 600)); // petite attente pour UX

  const analysis = analyzeText(txt);

  // format résultat
  const scorePct = Math.round(analysis.score * 100);
  let message = `Score de suspicion : ${scorePct}% — catégorie probable : ${analysis.category}.`;

  //if (analysis.matches.length) {
   // message += " Mots-clés détectés : " + analysis.matches.map(m => m.keyword).slice(0,5).join(", ") + ".";
  //}

  // décider si on crée une alerte
  if (analysis.score >= DETECTION_THRESHOLD) {
    // construire alerte
    const now = new Date();
    const alerte = {
      date: now.toLocaleString(),
      localisation: "Non précisée",
      description: txt,
      categorie: analysis.category,
      statut: "Nouveau",
      anonyme: true,
      image: null,
      confidence: analysis.score
    };

    const pushed = pushAlertToLocalStorage(alerte);
    if (pushed) {
      message += " ✅ Signalement ajouté aux alertes.";
    } else {
      message += " ⚠️ Signalement similaire déjà présent.";
    }
  } else {
    message += " Aucune alerte ajoutée (non suffisament suspect).";
  }

  // afficher résultat
  resultDiv.innerHTML = `<strong>${analysis.score >= DETECTION_THRESHOLD ? '⚠️ Menace probable' : '✅ Pas suspect'}</strong><br>${message}`;

  // retrait état UI
  btn.classList.remove('loading');

  // Optionnel : reset textarea
  // document.getElementById('smsInput').value = "";
}

/* Exporter pour debug si besoin (utile dans console) */
window.trainAndScan = trainAndScan;
window.analyzeText = analyzeText;
