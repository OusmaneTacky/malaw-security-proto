/********************************************************************
 * script.js - Scanner SMS avec TensorFlow.js
 * Entraîne un modèle simple (texte -> suspicion scam)
 * et ajoute automatiquement les scams détectés dans localStorage.alertes
 ********************************************************************/

// === Données d'entraînement (simplifiées pour la démo) ===
const trainData = [
  // SCAMS
  { text: "Gagnez 100000 FCFA avec Wave cliquez ici", label: 1 },
  { text: "Votre compte Orange Money sera suspendu, vérifiez maintenant", label: 1 },
  { text: "Félicitations vous avez gagné un iPhone gratuit", label: 1 },
  { text: "Cliquez sur ce lien pour recevoir votre prix", label: 1 },
  { text: "Votre compte bancaire est bloqué, connectez-vous ici", label: 1 },
  // NORMAUX
  { text: "Salut on se voit demain à la réunion", label: 0 },
  { text: "Ton colis est arrivé au bureau de poste", label: 0 },
  { text: "Rappel de ta facture Senelec", label: 0 },
  { text: "Je t'appelle après le travail", label: 0 },
  { text: "RDV à 18h au restaurant", label: 0 }
];

// === Prétraitement ===

// Tokenisation (on fait une simple séparation par espaces)
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}

// Créer vocabulaire
const vocabSet = new Set();
trainData.forEach(d => tokenize(d.text).forEach(w => vocabSet.add(w)));
const vocab = Array.from(vocabSet);
const wordIndex = Object.fromEntries(vocab.map((w, i) => [w, i + 1])); // index 0 réservé

// Vectorisation simple (Bag of Words)
function vectorize(text) {
  const tokens = tokenize(text);
  const vec = new Array(vocab.length).fill(0);
  tokens.forEach(t => {
    const idx = wordIndex[t];
    if (idx) vec[idx - 1] = 1;
  });
  return vec;
}

// === Entraînement du modèle ===

let model = null;
let isTrained = false;

async function trainModel() {
  if (isTrained) return model;

  const xs = tf.tensor2d(trainData.map(d => vectorize(d.text)));
  const ys = tf.tensor2d(trainData.map(d => [d.label]));

  model = tf.sequential();
  model.add(tf.layers.dense({ units: 12, activation: "relu", inputShape: [vocab.length] }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({ optimizer: tf.train.adam(0.01), loss: "binaryCrossentropy", metrics: ["accuracy"] });

  await model.fit(xs, ys, { epochs: 40, batchSize: 4, verbose: 0 });

  isTrained = true;
  xs.dispose();
  ys.dispose();
  console.log("✅ Modèle entraîné (TF.js)");
  return model;
}

// === Analyse et stockage des alertes ===

function pushAlertToLocalStorage(alerte) {
  const alertes = JSON.parse(localStorage.getItem("alertes") || "[]");
  alertes.unshift(alerte);
  localStorage.setItem("alertes", JSON.stringify(alertes));
  return true;
}

// === Fonction principale appelée au clic ===

async function trainAndScan() {
  const txt = document.getElementById("smsInput").value.trim();
  const res = document.getElementById("result");
  const btn = document.getElementById("analyzeBtn");

  if (!txt) {
    res.textContent = "⚠️ Saisis un message à analyser.";
    return;
  }

  btn.disabled = true;
  res.textContent = "🔍 Entraînement du modèle et analyse...";
  await trainModel();

  const inputVec = tf.tensor2d([vectorize(txt)]);
  const pred = model.predict(inputVec);
  const score = (await pred.data())[0];
  inputVec.dispose();
  pred.dispose();

  const now = new Date();
  const alertObj = {
    date: now.toLocaleString(),
    description: txt,
    categorie: score >= 0.5 ? "Phishing / Scam SMS" : "Non suspect",
    localisation: "Non précisée",
    statut: "Nouveau",
    anonyme: true,
    image: null,
    confiance: Math.round(score * 100)
  };

  if (score >= 0.5) {
    pushAlertToLocalStorage(alertObj);
    res.innerHTML = `<strong>⚠️ Scam détecté</strong><br>Score : ${(score*100).toFixed(1)}%<br>✅ Ajouté aux alertes.`;
  } else {
    res.innerHTML = `<strong>✅ Aucun scam détecté</strong><br>Score : ${(score*100).toFixed(1)}%.`;
  }

  btn.disabled = false;
  console.log("Analyse terminée :", alertObj);
}

// Expose à la page HTML
window.trainAndScan = trainAndScan;
