require('dotenv').config(); // <-- 1. dotenv at the very top!
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // <-- 2. Gemini Package

// <-- 3. Gemini API Secure Setup
const gemini_api_key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(gemini_api_key);

// --- Function 1: To send regular text messages ---
async function sendWhatsAppMessage(to_number, text_message) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;

    try {
        await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": "text",
                "text": { "body": text_message }
            })
        });
        console.log(`Text message sent successfully to: ${to_number}`);
    } catch (error) {
        console.error("Error sending text message:", error);
    }
}

// --- Function 2: To send the WhatsApp template ---
async function sendTemplateMessage(to_number) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;

    try {
        await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": "template",
                "template": {
                    "name": "welcome_bot_1", 
                    "language": {
                        "code": "en" 
                    }
                }
            })
        });
        console.log(`Template sent successfully to: ${to_number}`);
    } catch (error) {
        console.error("Error sending template:", error);
    }
}

// --- Function 3: To generate a response from Gemini AI (New) ---
async function generateGeminiResponse(user_message) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `You are a smart WhatsApp bot for an educational consulting and tech agency. 
        Your job is to provide short, professional, and helpful answers to user queries. 
        User's query: "${user_message}"
        Keep the response under 2-3 lines.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return "Sorry, my server is currently facing some issues. Please message again after some time!";
    }
}

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Webhook Verification (Run once by Meta)
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Success! Meta webhook is verified!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Handling incoming messages and button clicks
app.post("/webhook", async (req, res) => {

    // 1. Send 200 OK to Meta immediately to prevent webhook flooding
    res.sendStatus(200); 
    let body = req.body;

    if (body.object === "whatsapp_business_account") {
        let entry = body.entry?.[0];
        let changes = entry?.changes?.[0];
        let value = changes?.value;
        let message = value?.messages?.[0];

        if (message) {
            let senderNumber = message.from; 

            // CONDITION 1: If the user pressed a button
            if (message.type === "button") {
                let buttonPayload = message.button.payload; 
                console.log(`Number: ${senderNumber} pressed button: ${buttonPayload}`);
                
                if (buttonPayload === "Watch Live Demo") {
                    sendWhatsAppMessage(senderNumber, "Welcome to 'Wait, What?'! 🎬\n\nWatch our latest animated infotech mystery videos here and don't forget to subscribe: [Insert your YouTube link here]");
                } 
                else if (buttonPayload === "Get Quotation") {
                    sendWhatsAppMessage(senderNumber, "Hello! 🎓\n\nOur complete fee structure and details for college admission consulting are ready. Click this link for admission steps and portal details: [Insert your website link here]");
                } 
                else if (buttonPayload === "Book Video Call") {
                    sendWhatsAppMessage(senderNumber, "Great! 📅\n\nPlease let us know your preferred day and time to discuss the admission process or any doubts. We will schedule a video call for you shortly.");
                }
            } 
            
            // CONDITION 2: If the user sent a text message (like "Hi")
            // CONDITION 2: If the user sent a text message
            else if (message.type === "text") {
                let incomingText = message.text.body;
                let textForCheck = incomingText.toLowerCase().trim(); // चेक करने के लिए छोटे अक्षरों में कर लें
                console.log(`Number: ${senderNumber} sent text: ${incomingText}`);
                
                // अगर यूज़र 'hi', 'hello' या 'menu' लिखता है, तो बटनों वाला टेंपलेट भेजें
                if (textForCheck === "hi" || textForCheck === "hello" || textForCheck === "menu") {
                    sendTemplateMessage(senderNumber);
                } 
                // बाकी किसी भी सवाल के लिए सीधा Gemini AI से जवाब मांगें
                else {
                    let aiResponse = await generateGeminiResponse(incomingText); // Gemini को सवाल भेजें
                    sendWhatsAppMessage(senderNumber, aiResponse); // Gemini का जवाब यूज़र को भेज दें
                }
            }
        }
    }
    // (The duplicate res.sendStatus(200) at the bottom has been removed)
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Render server is fully ready on port ${PORT}!`);
});