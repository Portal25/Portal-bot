const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());

const PAGE_TOKEN    = process.env.PAGE_TOKEN;
const VERIFY_TOKEN  = process.env.VERIFY_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const SYS_PROMPT    = process.env.SYS_PROMPT || "Та Centro компанийн AI туслагч. Монгол хэлээр эелдэгээр хариулна.";

// Webhook баталгаажуулалт
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else res.sendStatus(403);
});

// Мессеж хүлээн авах
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== "page") return;
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      const senderId = event.sender.id;
      const text = event.message.text;
      if (!text) continue;
      try {
        const reply = await askClaude(text);
        await sendMsg(senderId, reply);
      } catch(e) { console.error(e.message); }
    }
  }
});

async function askClaude(msg) {
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYS_PROMPT,
      messages: [{ role: "user", content: msg }]
    },
    { headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    }}
  );
  return res.data.content[0].text;
}

async function sendMsg(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_TOKEN}`,
    { recipient: { id: recipientId }, message: { text } }
  );
}

app.listen(process.env.PORT || 3000, () => {
  console.log("Portal-bot ажиллаж байна!");
});
