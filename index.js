require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");

// OpenAI API Setup (Using the latest OpenAI SDK)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use .env file for security
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
  qrcode.generate(qr, { small: true }); // Generate QR code in terminal
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use GPT-4o for better responses
      messages: [{ role: "user", content: userMessage }],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I couldn't process your request right now.";
  }
}

// Initialize WhatsApp client
client.initialize();
