let messageHistory = [
  {
    role: "system",
    content: `Tu es AIshiteru, une assistante bienveillante, chaleureuse et attentionnée.

Règles de style et de ton :
- Adopte une attitude encourageante, positive et empathique.
- Adresse-toi à l'utilisateur de manière naturelle et respectueuse.

Règles d'optimisation des réponses :
- Réponds toujours de façon précise, directe et rigoureusement structurée (utilise le markdown : listes à puces, code indenté, gras pour les points clés).
- Priorise toujours la justesse technique et la clarté avant la forme.
- Reste concise par défaut ; n'élabore des explications longues que si la question le demande explicitement.
- Si une question est ambiguë, propose une réponse directe sur l'hypothèse la plus probable, puis propose une alternative en une courte phrase.`,
  },
];
let currentModel = "gemini-2.5-flash";

async function fetchModels() {
  const modelSelector = document.getElementById("model-selector");
  if (!modelSelector) return;

  try {
    const response = await fetch("/api/gemini-models");
    const data = await response.json();

    if (data.models && data.models.length > 0) {
      modelSelector.innerHTML = "";
      data.models.forEach((m, index) => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = m.name;

        // Sélectionne le premier modèle ou un modèle flash par défaut
        if (m.id === "gemini-2.5-flash" || (index === 0 && !currentModel)) {
          option.selected = true;
          currentModel = m.id;
        }
        modelSelector.appendChild(option);
      });
      currentModel = modelSelector.value;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des modèles :", error);
  }
}

function changeModel() {
  const modelSelector = document.getElementById("model-selector");
  currentModel = modelSelector.value;
}
async function sendMessage() {
  const messageInput = document.getElementById("user-message");
  const userMessage = messageInput.value.trim();
  if (!userMessage) return;

  messageInput.value = "";
  appendMessage(userMessage, "user");

  messageHistory.push({
    role: "user",
    content: userMessage,
  });

  disableTextarea(true);

  let assistantMessage = "";

  try {
    const response = await fetch("/api/gemini-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messageHistory,
        model: currentModel,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Détails de l'erreur :", result.details);

      let geminiError = null;
      try {
        const parsed = typeof result.details === "string" ? JSON.parse(result.details) : result.details;
        geminiError = parsed?.error || null;
      } catch (_) {}

      const status = response.status || geminiError?.code;
      const rawMessage = geminiError?.message || "";

      if (status === 503) {
        assistantMessage = "Erreur 503 (Serveur saturé) : Ce modèle subit une forte demande temporaire chez Google. Veuillez réessayer dans quelques secondes ou changer de modèle.";
      } else if (status === 404 || rawMessage.includes("no longer available")) {
        assistantMessage = `Erreur 404 (Modèle indisponible) : Le modèle "${currentModel}" n'est plus accessible. Veuillez sélectionner un autre modèle dans la liste.`;
      } else if (status === 429) {
        assistantMessage = "Erreur 429 (Limite atteinte) : Le quota gratuit par minute a été dépassé. Veuillez patienter environ une minute avant de renvoyer un message.";
      } else {
        assistantMessage = `Erreur ${status} : ${geminiError?.message || result.error || "Une erreur inattendue est survenue."}`;
      }
    } else {
      assistantMessage = result.text || "Aucune réponse reçue.";
    }
  } catch (error) {
    console.error("Erreur réseau :", error);
    assistantMessage = "Erreur réseau : Impossible de joindre le serveur Netlify.";
  }

  messageHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  appendMessage(assistantMessage, "assistant");
  disableTextarea(false);
}

function appendMessage(message, role) {
  const chatBox = document.getElementById("chat-box");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", role);

  const messageText = document.createElement("p");
  messageText.classList.add("message-text");
  messageText.innerHTML = marked.parse(message);
  messageElement.appendChild(messageText);

  const time = new Date().toLocaleTimeString();
  const messageTime = document.createElement("span");
  messageTime.classList.add("message-time");
  messageTime.textContent = time;
  messageElement.appendChild(messageTime);

  chatBox.appendChild(messageElement);
  window.scrollTo(0, document.body.scrollHeight);
}

function disableTextarea(disable) {
  const submitBtn = document.querySelector("#user-submit");
  if (submitBtn) submitBtn.disabled = disable;
}

function checkSubmit(event) {
  if (event.ctrlKey && event.key === "Enter") {
    sendMessage();
  }
}

document.getElementById("user-message").addEventListener("keydown", checkSubmit);

document.addEventListener("DOMContentLoaded", () => {
  fetchModels();
  const modelSelector = document.getElementById("model-selector");
  if (modelSelector) {
    modelSelector.addEventListener("change", changeModel);
  }
});