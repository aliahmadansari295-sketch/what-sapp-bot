// Fill in your details here
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TO_NUMBER = process.env.TEST_PHONE_NUMBER; // Your test receiving number (with country code, e.g., 91, no '+')
const TEMPLATE_NAME = "welcome_bot_1"; 

// The actual code to send the message request to Meta
fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "messaging_product": "whatsapp",
        "to": TO_NUMBER,
        "type": "template",
        "template": {
            "name": TEMPLATE_NAME,
            "language": {
                "code": "en" // Use "en_US" for English, or "hi" for Hindi
            }
        }
    })
})
.then(response => response.json())
.then(data => console.log("Meta Response:", data))
.catch(error => console.error("Error:", error));