const questions = [
  { q: "Un SMS te promet 100 000 F si tu cliques sur un lien. Tu fais quoi ?", options: ["Je clique vite", "J’ignore le message"], answer: 1, explanation: "C’est typiquement un scam ! Ne clique jamais sur un lien inconnu." },
  { q: "Un collègue t’envoie un lien étrange via WhatsApp.", options: ["Je lui demande s’il l’a bien envoyé", "Je clique directement"], answer: 0, explanation: "Toujours vérifier la source avant de cliquer." },
  { q: "Un mail de ta banque te demande ton mot de passe.", options: ["Je réponds au mail", "Je contacte la banque directement"], answer: 1, explanation: "Les banques ne demandent jamais ton mot de passe par mail." },
  { q: "Un SMS te dit que tu as un colis en attente avec un lien.", options: ["Je clique sur le lien", "Je vérifie sur le vrai site de livraison"], answer: 1, explanation: "Les faux SMS de livraison sont fréquents." },
  { q: "Tu vois une pub 'Gagne un iPhone gratuit'.", options: ["Je participe", "Je me méfie"], answer: 1, explanation: "Les offres trop belles sont presque toujours fausses." },
  { q: "Tu reçois un appel te demandant ton code Wave.", options: ["Je le donne", "Je raccroche immédiatement"], answer: 1, explanation: "Ne partage jamais tes codes, même à quelqu’un de ‘fiable’." },
  { q: "Tu reçois un lien inconnu d’un ami hacké.", options: ["Je clique", "Je signale et supprime"], answer: 1, explanation: "Les comptes piratés envoient souvent des liens piégés." },
  { q: "Tu veux sécuriser ton mot de passe, que faire ?", options: ["Le même partout", "Un mot de passe fort et différent"], answer: 1, explanation: "Utilise un mot de passe unique et complexe pour chaque compte." },
  { q: "Quel signe indique un site non sécurisé ?", options: ["HTTP sans cadenas", "HTTPS avec cadenas"], answer: 0, explanation: "HTTP sans cadenas 🔓 = site non sécurisé." },
  { q: "Que faire si tu suspectes une arnaque ?", options: ["Je garde pour moi", "Je signale sur Malaw Security"], answer: 1, explanation: "Signaler aide à protéger les autres !" },
];

let currentQuestion = 0;
let score = 0;
let mistakes = [];

function showQuestion() {
  const q = questions[currentQuestion];
  document.getElementById('question-container').textContent = q.q;
  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.classList.add('option-btn');
    btn.onclick = () => selectAnswer(i);
    optionsContainer.appendChild(btn);
  });
}

function selectAnswer(selected) {
  const correct = questions[currentQuestion].answer;
  if (selected === correct) {
    score++;
  } else {
    mistakes.push({
      question: questions[currentQuestion].q,
      user: questions[currentQuestion].options[selected],
      correct: questions[currentQuestion].options[correct],
      explanation: questions[currentQuestion].explanation
    });
  }
  document.getElementById('next-btn').style.display = 'block';
}

function nextQuestion() {
  currentQuestion++;
  document.getElementById('next-btn').style.display = 'none';
  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  document.getElementById('quiz-container').style.display = 'none';
  const resultContainer = document.getElementById('result-container');
  resultContainer.style.display = 'block';
  document.getElementById('score-text').textContent = `Tu as obtenu ${score}/${questions.length} réponses correctes !`;

  const mistakeList = document.getElementById('mistakes');
  if (mistakes.length > 0) {
    mistakeList.innerHTML = "<h4>❌ Tes erreurs :</h4>";
    mistakes.forEach(m => {
      mistakeList.innerHTML += `
        <p><strong>Q:</strong> ${m.question}<br>
        <strong>Ta réponse:</strong> ${m.user}<br>
        <strong>Bonne réponse:</strong> ${m.correct}<br>
        <em>${m.explanation}</em></p>
        <hr>`;
    });
  } else {
    mistakeList.innerHTML = "<p>🎉 Parfait ! Aucune erreur. Tu es très vigilant face aux arnaques.</p>";
  }
}

function restartQuiz() {
  currentQuestion = 0;
  score = 0;
  mistakes = [];
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('quiz-container').style.display = 'block';
  showQuestion();
}

showQuestion();
