// ==========================================
// CHATX AI SERVER
// Gemini API Backend + Fast Streaming
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");

const app = express();
const upload = multer({
    storage: multer.memoryStorage()
});

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

console.log(
    "Gemini API key loaded:",
    process.env.GEMINI_API_KEY ? "YES" : "NO"
);


// ==========================================
// CONVERSATION MEMORY
// ==========================================

const conversations = {};


// ==========================================
// CHAT ENDPOINT - STREAMING
// ==========================================

app.post("/chat", upload.single("file"), async (req, res) => {

    console.log("--------------------------------");
    console.log("CHAT REQUEST RECEIVED");

    try {

        const userMessage = req.body.message;
        const uploadedFile = req.file;
        const chatId = req.body.chatId || "default";
        if (uploadedFile) {
         console.log(
           "File received:",
           uploadedFile.originalname
            );
        }

        console.log("Message:", userMessage);

        if (!userMessage || userMessage.trim() === "") {

            return res.status(400).json({
                error: "Message is required"
            });

        }


        // Create conversation
        if (!conversations[chatId]) {

            conversations[chatId] = [];

        }


        // Add user message
        conversations[chatId].push({

            role: "user",

            parts: [
                {
                    text: userMessage
                }
            ]

        });


        // ==========================================
        // ONLY SEND LAST 12 MESSAGES
        // ==========================================

        const recentMessages =
            conversations[chatId].slice(-12);


        // ==========================================
        // STREAM RESPONSE
        // ==========================================

        const stream =
            await ai.models.generateContentStream({

                model: "gemini-3.6-flash",

                contents: recentMessages

            });


        // SSE headers
        res.setHeader(
            "Content-Type",
            "text/event-stream"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );


        let fullResponse = "";


        // ==========================================
        // SEND EACH CHUNK
        // ==========================================

        for await (const chunk of stream) {

            const text = chunk.text || "";

            if (!text) {
                continue;
            }


            fullResponse += text;


            res.write(
                `data: ${JSON.stringify({
                    text: text
                })}\n\n`
            );

        }


        // ==========================================
        // SAVE COMPLETE AI RESPONSE
        // ==========================================

        conversations[chatId].push({

            role: "model",

            parts: [
                {
                    text: fullResponse
                }
            ]

        });


        // Tell frontend we're finished
        res.write(
            `data: ${JSON.stringify({
                done: true
            })}\n\n`
        );


        res.end();


        console.log(
            "GEMINI STREAM COMPLETED"
        );


    } catch (error) {

        console.error("--------------------------------");
        console.error("GEMINI ERROR");
        console.error(error);
        console.error("--------------------------------");


        if (!res.headersSent) {

            return res.status(500).json({

                error:
                    error.message ||
                    "Something went wrong."

            });

        }


        res.write(
            `data: ${JSON.stringify({
                error: error.message
            })}\n\n`
        );


        res.end();

    }

});


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

    res.send(
        "ChatX AI Server is running successfully!"
    );

});


// ==========================================
// START SERVER
// ==========================================

const PORT = 3000;

const server =
    app.listen(
        PORT,
        "127.0.0.1",
        () => {

            console.log("--------------------------------");
            console.log("CHATX SERVER STARTED");
            console.log(
                `ChatX server running at http://localhost:${PORT}`
            );
            console.log("--------------------------------");

        }
    );


server.on("error", (error) => {

    console.error("SERVER ERROR:");
    console.error(error);

});