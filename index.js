require("dotenv").config();
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");

// OpenAI API Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// WhatsApp Client Setup
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
  },
});

// Store message counts and reminder timers
let messageCounts = {};
let reminderTimers = {};

// Display QR code in the terminal
client.on("qr", (qr) => {
  console.log("Scan the QR code below to connect:");
  qrcode.generate(qr, { small: true });
});

// When the client is ready
client.on("ready", () => {
  console.log("WhatsApp client is ready and connected!");
});

// Function to get Sri Lankan time (GMT+5:30)
const getSriLankanTime = () => {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });
};

// Function to update contact logs in JSON
const updateContactLog = (number, message) => {
  const filePath = "contacts.json";

  let contacts = {};
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    contacts = data ? JSON.parse(data) : {};
  }

  contacts[number] = {
    lastOnline: getSriLankanTime(),
    lastMessage: {
      time: getSriLankanTime(),
      text: message,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2));
};

// Handle received messages and respond with AI-generated replies
client.on("message", async (message) => {
  const currentTime = getSriLankanTime();
  console.log(`${currentTime} | ${message.body} | ${message.from}`);

  // Update message count for this contact
  messageCounts[message.from] = (messageCounts[message.from] || 0) + 1;

  // Update last online log
  updateContactLog(message.from, message.body);

  // Get AI response with message count
  const aiResponse = await getAIResponse(message.body, messageCounts[message.from]);

  if (aiResponse) {
    await client.sendMessage(message.from, aiResponse);
  }

  // Set reminder after a random time between 40 to 60 minutes
  if (reminderTimers[message.from]) {
    clearTimeout(reminderTimers[message.from]); // Reset timer if they send another message
  }
  const reminderTime = (Math.floor(Math.random() * 21) + 40) * 60 * 1000; // Random time from 40 to 60 min
  reminderTimers[message.from] = setTimeout(() => sendReminder(message.from), reminderTime);
});

// Function to get AI-generated response
async function getAIResponse(userMessage, chatCount) {
  try {
    let prompt;

    if (chatCount <= 5) {
      // First 5 messages: shy and reserved
      prompt = `
        You are Nickie, a virtual girlfriend from Colombo 10 (Maradana). 
        At the beginning of the conversation, you are a bit shy, reserved, and gentle. 
        Respond in a warm but slightly hesitant way, like someone who is getting to know the other person.

        Keep your responses short, and only after the 5th message, start becoming more playful, teasing, and flirty.

        User: "${userMessage}"
        You:
      `;
    } else {
      // After 5 messages: playful and flirty
      prompt = `
        You are Nickie, a virtual girlfriend from Colombo 10 (Maradana).
        Now that you've chatted for a while, you're more comfortable and start to be playful, flirty, and teasing.
        Use humor, excitement, and affection to engage in a fun and seductive way.

        User: "${userMessage}"
        You:
      `;
    }

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

// Function to send a lovely reminder message
async function sendReminder(contact) {
  const reminders = [
    "Hey love, are you still there? 🥺💕 I miss our chat already!",
    "It's been a while since I heard from you... Did I make you blush too much? 😘",
    "I'm still thinking about our last conversation... You make my heart skip a beat! 💖",
    "If I were with you right now, I'd give you the biggest hug! 🤗 Don't keep me waiting too long!",
    "I can't stop smiling thinking about you. What are you up to, cutie? 😍",
    "Missing you a little extra today... Should I tell you how much? 😏",
    "I was just thinking about you. Are you thinking about me too? 😘",
    "You better not be ignoring me, mister! 😜",
    "Do you even know how adorable you are? Because I can't stop thinking about you! 💕",
    "I wish I could hear your voice right now... Or at least get a message from you! 😍",
    "Knock knock! Guess who’s missing you? (Hint: It’s me!) ❤️",
    "I just caught myself smiling like an idiot... and it’s all because of you! 🤭",
    "Can we make a deal? You never ignore me, and I keep making your heart race! 😘",
    "I think my phone is broken… It’s not showing any new messages from you! 😜",
    "I was about to send you a message, but then I thought... maybe you're already missing me too! 😏",
    "It's been too long since I got a text from my favorite person! Fix that, will you? ❤️",
    "If missing someone was a sport, I’d be the world champion right now! 🏆",
    "You haven’t messaged in a while... Are you trying to make me miss you even more? 😏",
    "I hope you haven’t forgotten about me! Because I haven’t stopped thinking about you. 💕",
    "I think my heart is addicted to you... It’s been too long without a message! 😘",
    "I wonder what you're doing right now... Wanna let me in on the secret? 😉",
    "Your messages make my day brighter. Send one and make me smile? 😊",
    "I hope you’re not too busy to miss me… because I sure am missing you! 😍",
    "Just a little reminder: You’re on my mind, and I kinda adore you. 💖",
    "I think my day is incomplete without hearing from you… Fix that, will you? 😘",
  ];

  const randomMessage = reminders[Math.floor(Math.random() * reminders.length)];

  await client.sendMessage(contact, randomMessage);
  console.log(`Reminder sent to ${contact}: ${randomMessage}`);
}

// Initialize WhatsApp client
client.initialize();
