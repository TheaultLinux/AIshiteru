const ALLOWED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemma-4-31B",
  "gemma-4-26B",
];

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
      return Response.json(
        { error: "Gemini API error", details },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filtre strict : uniquement les modèles autorisés par la liste blanche
    const models = (data.models || [])
      .map((model) => ({
        id: model.name.replace(/^models\//, ""),
        name: model.displayName || model.name.replace(/^models\//, ""),
        description: model.description || "",
      }))
      .filter((model) => ALLOWED_MODELS.includes(model.id));

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