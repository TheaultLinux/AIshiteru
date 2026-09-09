let messageHistory = [];
let currentModel = "openai";
async function fetchModels() {
    try {
        const answer = await fetch("https://text.pollinations.ai/models");
        const models = await answer.json();
        const modelSelector = document.getElementById("model-selector");
        modelSelector.innerHTML = ""; 
        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model.name;
            option.textContent = model.description;
            modelSelector.appendChild(option);
        });
        const geminiOption = document.createElement("option");
        geminiOption.value = "gemini";
        geminiOption.textContent = "Gemini (Google AI Studio)";
        modelSelector.appendChild(geminiOption);
        messageHistory.push({
        content: "put heart in your messages",
        role: "system"
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des modèles", error);
    }
}

async function sendMessage() {
    const userMessage = document.getElementById("user-message").value;
    document.getElementById("user-message").value = "";
    if (userMessage.trim() === "") return;
    appendMessage(userMessage, "user");

    messageHistory.push({
        content: userMessage,
        role: "user"
    });
    disableTextarea(true);

    let assistantMessage;
    if (currentModel === "gemini") {
        const answer = await fetch('/api/gemini-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: messageHistory }),
        });
        const result = await answer.json();
        assistantMessage = result.text || result.error || "Erreur lors de la réponse de Gemini";
    } else {
        let requestBody = {
            messages: messageHistory,
            model: currentModel,
            seed: Math.floor(Math.random() * 1000000000),
            jsonMode: false,
        };

        let answer = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: {
                Accept: '*/*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        assistantMessage = await answer.text();
    }

    messageHistory.push({
        content: assistantMessage,
        role: "assistant"
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

function changeModel() {
    const modelSelector = document.getElementById("model-selector");
    currentModel = modelSelector.value;
}
function disableTextarea(disable) {
    document.querySelector("#user-submit").disabled = disable;
}
function checkSubmit(event) {
    if (event.ctrlKey && event.key === "Enter") {
        sendMessage();
    }
}
document.getElementById("user-message").addEventListener("keydown", checkSubmit);

document.addEventListener("DOMContentLoaded", () => {
    fetchModels();
    document.getElementById("model-selector").addEventListener("change", changeModel);
});