import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';


dotenv.config();



const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
const GEMINI_API_KEY = process.env.API_KEY;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // To handle JSON requests
app.use(express.static("public")); // Serve static files (CSS/JS))

// Set up database connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Aura_Assist", // Update database name as needed
  password: "sachin061218", // Update password as needed
  port: 5432,
});
db.connect();

// Google Generative AI setup
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const mentalHealthKeywords = [
  "depression", "anxiety", "stress", "mental health", "therapy",
  "counseling", "sad", "fear", "nervous", "lonely", "overwhelmed",
  "panic", "support", "trauma", "emotions", "well-being", "psychologist",
  "psychiatrist", "mindfulness", "meditation", "self-esteem", "self-care",
  "burnout", "grief", "sadness", "loss", "worry", "fear", "anger",
  "hopeless", "unhappy", "isolation", "disconnected", "mental wellness",
  "mood swings", "self-harm", "suicidal", "suicide", "psychiatry",
  "emotional", "helpless", "nightmares", "ptsd", "obsessive", "compulsive",
  "ocd", "phobia", "anxious", "therapy session", "therapist", "counselor",
  "mental", "distress", "distressed", "vulnerable", "life coach", 
  "inner peace", "coping", "recovery", "emotional support", "psychology", 
  "therapy appointment", "medication", "mental illness", "addiction",
  "dependency", "diagnosis", "treatment", "fearful", "nervous breakdown",
  "compassion", "traumatized", "self-worth", "insecurities", 
  "bipolar", "schizophrenia", "mood disorder", "borderline personality",
  "wellness", "self-improvement", "relationship issues", "family problems",
  "conflict resolution", "postpartum", "abuse", "domestic violence",
  "empathy", "peer support", "group therapy", "psychotherapy", 
  "cognitive behavioral therapy", "cbt", "interpersonal therapy", "ipt",
  "distorted thinking", "catastrophizing", "rumination", "flashbacks",
  "emotional exhaustion", "self-reflection", "anger management",
  "eating disorder", "bulimia", "anorexia", "binge eating", "weight concerns",
  "self-acceptance", "body image", "resilience", "emotional stability",
  "adjustment disorder", "fear of failure", "perfectionism", "panic disorder",
  "introspection", "overthinking", "peer pressure", "emotional health",
  "psychological health", "mental clarity", "peace of mind", "forgiveness","depressed","cheated","Betrayed","screwed",
];


// Function to check if a message is related to mental health
function isMentalHealthRelated(message) {
  const messageLower = message.toLowerCase();
  return mentalHealthKeywords.some(keyword => messageLower.includes(keyword));
}

// Empathy Phrases categorized by emotion
const empathyPhrases = {
  happiness: [
    "That's fantastic! I'm glad to hear you're feeling great.",
    "You must be so excited!",
    "It's wonderful to see your excitement!",
    "I'm thrilled to hear that!",
    "That's great news!",
    // More phrases...
  ],
  sadness: [
    "I'm really sorry you're feeling this way.",
    "It sounds like you're going through something tough.",
    "I'm here for you, even in these difficult moments.",
    "It's okay to feel sad sometimes.",
    "That sounds really hard.",
    // More phrases...
  ],
  anger: [
    "It sounds like you're really upset, and that's okay.",
    "I hear your frustration. That must have been aggravating.",
    "That would make anyone mad!",
    "I can tell this situation upset you.",
    "It's okay to feel this way.",
    // More phrases...
  ],
  fear: [
    "It sounds like you're feeling really anxious.",
    "I hear your worries, and they’re valid.",
    "I understand you're feeling nervous. Let's take this slowly.",
    "It's okay to be afraid sometimes.",
    "I'm here to help you through this.",
    // More phrases...
  ],
  confusion: [
    "It sounds like you're feeling a bit lost.",
    "I understand that you're feeling uncertain. Let's break it down together.",
    "It can be confusing sometimes, I get that.",
    "I'm here to help you figure this out.",
    "Let's go step by step.",
    // More phrases...
  ],
  neutral: [
    "That sounds interesting!",
    "I totally get that.",
    "Let me think about that for a moment.",
    "I see where you're coming from.",
    "That's an interesting perspective.",
    // More phrases...
  ],
};

// Simulate a sentiment analysis function (this is a placeholder)
// Replace this with an actual sentiment analysis library or API
function analyzeSentiment(message) {
  // Perform sentiment analysis and return a classification
  // This is a dummy function: replace it with actual sentiment analysis logic
  if (message.includes("happy") || message.includes("excited")) {
    return "happiness";
  } else if (message.includes("sad") || message.includes("disappointed")) {
    return "sadness";
  } else if (message.includes("angry") || message.includes("frustrated")) {
    return "anger";
  } else if (message.includes("scared") || message.includes("anxious")) {
    return "fear";
  } else if (message.includes("confused") || message.includes("lost")) {
    return "confusion";
  }
  return "neutral"; 
}

// Routes

// Home Route
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Login Route
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Register Route
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Handle User Registration
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  const gender = req.body.gender;
  const mobile = req.body.mobile;
  const age = req.body.age;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      // Hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          await db.query(
            "INSERT INTO users (email, password, gender, mobile, age) VALUES ($1, $2, $3, $4, $5)",
            [email, hash, gender, mobile, age]
          );
          res.render("secrets.ejs");
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});


// Handle User Login
// Handle User Login
app.post("/login", async (req, res) => {
  const email = req.body.username;
  const loginPassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      // Verifying the password
      bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
        } else {
          if (result) {
            res.render("secrets.ejs");
          } else {
            res.send("Incorrect Password");
          }
        }
      });
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});




app.get('/forgot', (req, res) => {
  res.render('forgot.ejs');
});
app.post('/forgot', (req, res) => {
  const { email } = req.body;
  res.send('A password reset link has been sent to your email address.');
});


// Chatbot Route
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const language = req.body.language || "english";
  const userId = req.body.userId; // Assuming userId is sent from the frontend
  let msg = userMessage + " Note: the response should be in " + language;

  // Check if the query is related to mental health
  if (!isMentalHealthRelated(userMessage)) {
    return res.json({ reply: "This chatbot is designed to assist with mental health inquiries. Please ask about topics related to mental health." });
  }

  try {
    // Generate AI response using Google Generative AI API
    const result = await model.generateContent(msg);
    const { response: { candidates } } = result;

    if (candidates && candidates.length > 0) {
      const storyCandidate = candidates[0];
      if (storyCandidate.content && storyCandidate.content.parts && storyCandidate.content.parts.length > 0) {
        let chatReply = storyCandidate.content.parts.map(part => part.text).join(" ");
        chatReply = chatReply.replace(/\*/g, '').replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
        const greetings = ["Hi there!", "Hello!", "Hey!", "Greetings!"];
        const empathyPhrases = ["I totally get that.", "That's interesting!", "I see what you mean.", "Let me think about that for a moment."];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        const randomEmpathy = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
        chatReply = `${randomGreeting} ${randomEmpathy} ${chatReply}`;

        // Store the user message and AI reply in the database
        res.json({ reply: chatReply });
      } else {
        res.json({ reply: "I didn't quite catch that. Could you try again?" });
      }
    } else {
      res.json({ reply: "I couldn't find the right words. Can you rephrase?" });
    }
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Oops, something went wrong! Let me try again." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
