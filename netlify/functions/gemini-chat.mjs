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

  const { messages = [] } = await req.json();

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join("") || "";

  return Response.json({ text });
};

export const config = {
  path: "/api/gemini-chat",
  method: "POST",
};
