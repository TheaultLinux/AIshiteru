let messageHistory = [
  {
    role: "system",
    content: "put heart in your messages",
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
      assistantMessage = result.error || "Erreur lors de la réponse de Gemini";
    } else {
      assistantMessage = result.text || "Aucune réponse reçue.";
    }
  } catch (error) {
    console.error("Erreur réseau :", error);
    assistantMessage = "Impossible de joindre le serveur.";
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