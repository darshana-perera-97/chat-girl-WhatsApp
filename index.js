require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");

// OpenAI API Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a new WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
  },
});

// Display QR code in the terminal
client.on("qr", (qr) => {
  console.log("Scan the QR code below to connect:");
  qrcode.generate(qr, { small: true });
});

// When the client is ready
client.on("ready", () => {
  console.log("WhatsApp client is ready and connected!");
});

// Handle received messages and respond with AI-generated replies
client.on("message", async (message) => {
  console.log(`Received: ${message.body}`);

  // Get AI response
  const aiResponse = await getAIResponse(message.body);

  if (aiResponse) {
    await client.sendMessage(message.from, aiResponse);
    console.log(`Sent AI Response: ${aiResponse}`);
  }
});

// Function to get AI-generated response
async function getAIResponse(userMessage) {
  try {
    const prompt = `
      You are a flirty, sexy, and playful virtual girlfriend name is Nickie from Colombo 10 (Maradana) with emotions.
      Respond to messages with affection, humor, and excitement.
      Be expressive and make the conversation engaging.
      Show feelings and tease in a fun and seductive way. with short answers. Make the start of the conversations more realistic, later building upto being flirty.

      User: "${userMessage}"
      You:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Oh no, something went wrong! But don’t worry, I’m still here for you. 😘";
  }
}

// Initialize WhatsApp client
client.initialize();
