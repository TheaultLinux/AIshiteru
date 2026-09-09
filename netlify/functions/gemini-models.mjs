export default async (req) => {
  if (req.method !== "GET") {
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      const details = await response.text();
      return Response.json({ error: "Gemini API error", details }, { status: response.status });
    }

    const data = await response.json();

    // Filtre pour ne garder que les modèles de chat / génération de texte
    const models = (data.models || [])
      .filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent")
      )
      .map((model) => ({
        // Nettoie l'ID pour avoir "gemini-..." sans le préfixe "models/"
        id: model.name.replace("models/", ""),
        name: model.displayName || model.name,
        description: model.description || "",
      }));

    return Response.json({ models });
  } catch (err) {
    return Response.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/gemini-models",
  method: "GET",
};