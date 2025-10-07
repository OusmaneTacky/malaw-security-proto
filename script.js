// ⚙️ Nécessite TensorFlow.js
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js"></script>

const SUSPICIOUS_KEYWORDS = [
  'gagne', 'gagner', 'gagnez', 'prix', 'félicitations', 'cadeau',
  'urgent', 'clique', 'cliquez', 'lien', 'gratuit', 'offre', 'promotion',
  '100k', '100000', 'fcfa', 'f cfa', 'orange money', 'wave', 'cash', 'virement',
  'votre compte', 'code', 'verifiez', 'vérifiez', 'envoyer', 'recevez'
];

function extractFeatures(text) {
  const lower = text.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  return [
    tokens.length,
    text.length,
    (text.match(/\d/g) || []).length,
    /https?:\/\/|www\.|\.com|\.sn|\.net|\.io/.test(lower) ? 1 : 0,
    (text.match(/!/g) || []).length,
    text.split(/\s+/).filter(w => w === w.toUpperCase() && w.length > 1).length,
    SUSPICIOUS_KEYWORDS.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
  ];
}

function normalizeTensor(tensor, minVals, maxVals) {
  const eps = 1e-6;
  return tensor.sub(tf.tensor1d(minVals)).div(tf.tensor1d(maxVals).sub(tf.tensor1d(minVals)).add(eps));
}

function ruleBasedScore(features) {
  let score = 0;
  score += Math.min(features[6], 4) * 0.25;
  score += features[3] * 0.35;
  score += Math.min(features[2], 4) * 0.05;
  score += Math.min(features[4], 3) * 0.05;
  score += Math.min(features[5], 3) * 0.05;
  if (features[0] <= 6 && features[6] > 0) score += 0.1;
  return Math.min(1, score);
}

async function trainAndScan() {
  const smsInput = document.getElementById('smsInput').value.trim();
  const resultBox = document.getElementById('result');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!smsInput) {
    resultBox.style.display = 'block';
    resultBox.style.color = '#7a2a2a';
    resultBox.textContent = 'Veuillez saisir un SMS à analyser.';
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.classList.add('loading');
  analyzeBtn.textContent = 'Analyse...';

  resultBox.style.display = 'block';
  resultBox.textContent = 'Analyse en cours…';

  await new Promise(r => setTimeout(r, 300));

  const dataset = {
    xs_text: [
      'Gagnez 100 000 FCFA maintenant, cliquez ici http://bit.ly/xx',
      'Félicitations ! Vous avez gagné un transfert Wave gratuit',
      'URGENT: vérifiez votre compte Orange Money immédiatement',
      'Bonjour, rendez-vous demain à 10h',
      'Salut, tu viens au match ce soir ?',
      'Appelle-moi stp, on se voit plus tard',
      'Offre exclusive: réception gratuite, clique vite',
      'Votre colis est prêt, confirmez ici www.track.sn',
      'Comment vas-tu ?',
      'Rappel: réunion vendredi 14h',
    ],
    ys: [1,1,1,0,0,0,1,1,0,0]
  };

  const allFeatures = dataset.xs_text.map(extractFeatures);
  const inputFeatures = extractFeatures(smsInput);
  allFeatures.push(inputFeatures);

  const featureCount = allFeatures[0].length;
  const mins = [], maxs = [];
  for (let j = 0; j < featureCount; j++) {
    const col = allFeatures.map(r => r[j]);
    mins.push(Math.min(...col));
    maxs.push(Math.max(...col));
  }

  const xsNorm = normalizeTensor(tf.tensor2d(allFeatures.slice(0, -1)), mins, maxs);
  const ysTensor = tf.tensor2d(dataset.ys, [dataset.ys.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [featureCount] }));
  model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  model.compile({ optimizer: tf.train.adam(0.05), loss: 'binaryCrossentropy' });

  try { await model.fit(xsNorm, ysTensor, { epochs: 40, batchSize: 4, verbose: 0 }); } catch {}

  const inputTensor = normalizeTensor(tf.tensor2d([inputFeatures]), mins, maxs);
  let prediction = ruleBasedScore(inputFeatures);
  try { prediction = (await model.predict(inputTensor).data())[0]; } catch {}

  const scorePercent = Math.round(prediction * 100);
  const reasons = [];
  if (inputFeatures[3]) reasons.push('contient un lien');
  if (inputFeatures[6]) reasons.push('mots-clés suspects');
  if (inputFeatures[2] >= 2) reasons.push('plusieurs chiffres');
  if (inputFeatures[4]) reasons.push('ponctuation forte');
  if (inputFeatures[5]) reasons.push('mots en MAJUSCULES');

  if (prediction >= 0.55) {
    resultBox.style.color = '#7a2a2a';
    resultBox.textContent = `⚠️ SMS suspect (${scorePercent}%). Raisons : ${reasons.join(', ') || 'signaux détectés'}.`;
  } else if (prediction >= 0.35) {
    resultBox.style.color = '#7a4f1b';
    resultBox.textContent = `⚠️ Suspicion modérée (${scorePercent}%). Vérifiez l'expéditeur ou le lien.`;
  } else {
    resultBox.style.color = '#0b3a1b';
    resultBox.textContent = `✅ SMS probablement sûr (${scorePercent}%). Restez vigilant.`;
  }

  analyzeBtn.disabled = false;
  analyzeBtn.classList.remove('loading');
  analyzeBtn.textContent = 'Analyser';
  resultBox.classList.add('active');

  tf.dispose([xsNorm, ysTensor, inputTensor]);
}
