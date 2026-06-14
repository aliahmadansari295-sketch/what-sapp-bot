require('dotenv').config(); 
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai"); 

const gemini_api_key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(gemini_api_key);

// --- Securely fetching your n8n Webhook URL from Environment Variables ---
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

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

// --- Function 3: To generate a response and extract leads via Gemini AI ---
async function generateGeminiResponse(user_message) {
    try {
        // Using 1.5-flash as it is highly stable for JSON extraction
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // The Prompt: Training Gemini to only ask for Name and Class
        const prompt = `You are a smart WhatsApp bot for an educational consulting agency. 
        Your job is to answer user queries and politely ask for their Name and Class.
        
        RULES:
        1. If the user has provided BOTH their Name and Class, your response MUST be strictly in this JSON format (no extra text):
        {"name": "User's Name", "class": "User's Class"}
        
        2. If the user has NOT provided both pieces of information, give a short 2-line answer to their query and politely ask for the missing details (Name or Class).
        
        User's message: "${user_message}"`;

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
                    // Start the lead generation process when they click the button
                    sendWhatsAppMessage(senderNumber, "Great! 📅\n\nBefore we schedule the call, could you please tell me your Name and which Class/Year you are in?");
                }
            } 
            
            // CONDITION 2: If the user sent a text message
            // CONDITION 2: If the user sent a text message
            else if (message.type === "text") {
                let incomingText = message.text.body;
                let textForCheck = incomingText.toLowerCase().trim(); 
                console.log(`Number: ${senderNumber} sent text: ${incomingText}`);
                
                // If the user sends a greeting, send the template with buttons
                if (textForCheck === "hi" || textForCheck === "hello" || textForCheck === "menu") {
                    sendTemplateMessage(senderNumber);
                } 
                else {
                    let aiResponse = await generateGeminiResponse(incomingText); 
                    
                    // 🔥 NEW BULLETPROOF LOGIC: Case-insensitive checking 🔥
                    // Checks if the response contains '{' and the word "name" (whether uppercase or lowercase)
                    if (aiResponse.includes('{') && aiResponse.toLowerCase().includes('"name"')) {
                        try {
                            // Remove backticks (```) to extract pure JSON
                            let cleanData = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
                            let rawLeadData = JSON.parse(cleanData);
                            
                            // Standardize the keys whether Gemini writes 'Name' or 'name', 'Class' or 'class'
                            let finalLeadData = {
                                name: rawLeadData.name || rawLeadData.Name,
                                class: rawLeadData.class || rawLeadData.Class,
                                phone: senderNumber // Automatically attach the WhatsApp number
                            };
                            
                            // Send the data to the n8n Webhook
                            await fetch(N8N_WEBHOOK_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(finalLeadData)
                            });
                            
                            // Send a confirmation message to the user
                            sendWhatsAppMessage(senderNumber, "Thank you! Your details have been saved. Our team will contact you shortly. 😊");
                            console.log("🔥 Lead successfully extracted and sent to n8n!");
                            
                        } catch (err) {
                            console.log("JSON Parsing Error:", err);
                            // If parsing fails, ask the user to try again instead of showing a system error
                            sendWhatsAppMessage(senderNumber, "Sorry, I couldn't process your details correctly. Let's try again.");
                        }
                    } else {
                        // If it is not a JSON format, send the normal AI text response directly
                        sendWhatsAppMessage(senderNumber, aiResponse);
                    }
                }
            }
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Render server is fully ready on port ${PORT}!`);
});