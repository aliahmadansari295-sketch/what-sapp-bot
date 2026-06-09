const express = require("express");

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
                    "name": "welcome_bot_1", // <-- IMPORTANT: Enter your actual template name here
                    "language": {
                        "code": "en" // Change to "hi" if your template is in Hindi
                    }
                }
            })
        });
        console.log(`Template sent successfully to: ${to_number}`);
    } catch (error) {
        console.error("Error sending template:", error);
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
app.post("/webhook", (req, res) => {
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
            else if (message.type === "text") {
                let incomingText = message.text.body;
                console.log(`Number: ${senderNumber} sent text: ${incomingText}`);
                
                // Send the template as soon as a text is received
                sendTemplateMessage(senderNumber);
            }
            
            else {
                console.log(`Received a different type of message: ${message.type}`);
            }
        }
    }

    // Always return a 200 OK status to Meta
    res.sendStatus(200); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Render server is fully ready on port ${PORT}!`);
});