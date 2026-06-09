const express = require("express");
// यह फंक्शन व्हाट्सएप पर ऑटो-रिप्लाई भेजेगा
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
        console.log(`मैसेज सफलता से भेजा गया: ${to_number}`);
    } catch (error) {
        console.error("मैसेज भेजने में एरर:", error);
    }
}
const app = express();

app.use(express.json());

// यह लाइन Render के डैशबोर्ड से आपका पासवर्ड उठा लेगी
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a request is from Meta and the token matches
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Success! Meta webhook is verified!");
        res.status(200).send(challenge);
    } else {
        // If the token doesn't match, send a 403 Forbidden error
        res.sendStatus(403);
    }
});

// This code will catch incoming messages and button clicks from Meta
app.post("/webhook", (req, res) => {
    console.log("\n==== Raw Meta Data ====");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("==========================\n");

    let body = req.body;

    // Check if the request is from a WhatsApp Business Account
    if (body.object === "whatsapp_business_account") {
        let entry = body.entry?.[0];
        let changes = entry?.changes?.[0];
        let value = changes?.value;
        let message = value?.messages?.[0];

        if (message) {
            let senderNumber = message.from; 

            // If the user pressed a standard quick reply button
            // अगर यूज़र ने कोई बटन दबाया है
if (message.type === "button") {
    let buttonPayload = message.button.payload; 
    console.log(`Number: ${senderNumber} pressed button: ${buttonPayload}`);

    // --- यहाँ से हमारा असली बॉट लॉजिक शुरू होता है ---
    
    if (buttonPayload === "Watch Live Demo") {
        sendWhatsAppMessage(senderNumber, "Welcome to 'Wait, What?'! 🎬\n\nयहाँ हमारे लेटेस्ट एनिमेटेड इन्फोटेक मिस्ट्री वीडियोस देखें और चैनल को सब्सक्राइब करना न भूलें: [अपना यूट्यूब लिंक यहाँ डालें]");
    } 
    else if (buttonPayload === "Get Quotation") {
        sendWhatsAppMessage(senderNumber, "नमस्ते! 🎓\n\nकॉलेज एडमिशन कंसल्टिंग की हमारी पूरी फीस और स्ट्रक्चर तैयार है। एडमिशन के स्टेप्स और पोर्टल की डिटेल्स के लिए इस लिंक पर क्लिक करें: [अपनी वेबसाइट का लिंक यहाँ डालें]");
    } 
    else if (buttonPayload === "Book Video Call") {
        sendWhatsAppMessage(senderNumber, "शानदार! 📅\n\nएडमिशन प्रोसेस या किसी भी डाउट पर बात करने के लिए कृपया अपना पसंदीदा दिन और समय बताएं। हम जल्द ही आपके लिए एक वीडियो कॉल शेड्यूल करेंगे।");
    }
}
        }
    }

    // It is required to send a 200 OK response to Meta, otherwise they will keep resending the data
    res.sendStatus(200); 
});

// Dynamic port setting for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Render server is fully ready on port ${PORT}!`);
});