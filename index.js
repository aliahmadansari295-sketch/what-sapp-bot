const express = require("express");
const app = express();

app.use(express.json());

const VERIFY_TOKEN = "wacrm123"; 

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

// Dynamic port setting for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Render server is fully ready on port ${PORT}!`);
});