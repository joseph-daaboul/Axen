export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/google/flan-t5-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_HF_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `You are a mental wellbeing assistant for athletes.
Give short helpful advice.
User: ${req.body.message}
AI:`,
        }),
      }
    );

    const data = await response.json();

    console.log("HF RESPONSE:", data);

    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
}
