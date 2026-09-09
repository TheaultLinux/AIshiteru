const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages = [], model = "gemini-3.6-flash" } = await req.json();

    const targetModel = model.replace(/^models\//, "");

    if (!ALLOWED_MODELS.includes(targetModel)) {
      return Response.json(
        {
          error: `Modèle non autorisé. Choisissez parmi : ${ALLOWED_MODELS.join(", ")}`,
        },
        { status: 403 }
      );
    }

    const systemInstructionText = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n");

    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    const requestBody = {
      contents,
      ...(systemInstructionText
        ? { systemInstruction: { parts: [{ text: systemInstructionText }] } }
        : {}),
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiResponse.ok) {
      const details = await geminiResponse.text();
      return Response.json(
        { error: "Gemini API error", details },
        { status: geminiResponse.status }
      );
    }

    const data = await geminiResponse.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    let thought = "";
    let text = "";

    // 1. Cas où l'API renvoie des parts distinctes pour la réflexion (thought: true)
    for (const part of parts) {
      if (part.thought) {
        thought += part.text;
      } else if (part.text) {
        text += part.text;
      }
    }

    // 2. Cas où le modèle injecte les balises <thought> ou <think> dans le texte brut
    if (!thought && text) {
      const match = text.match(/<(thought|think)>([\s\S]*?)<\/\1>/i);
      if (match) {
        thought = match[2].trim();
        text = text.replace(match[0], "").trim();
      }
    }

    return Response.json({ text, thought });
  } catch (err) {
    return Response.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/gemini-chat",
  method: "POST",
};