const express = require("express");
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
            if (message.type === "button") {
                let buttonPayload = message.button.payload; 
                console.log(`Number: ${senderNumber} pressed button: ${buttonPayload}`);
            } 
            // If the message type is 'interactive' (often used for template buttons)
            else if (message.type === "interactive") {
                let interactivePayload = message.interactive?.button_reply?.id;
                console.log(`Number: ${senderNumber} pressed interactive button: ${interactivePayload}`);
            }
            else {
                console.log(`Received a different type of message: ${message.type}`);
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