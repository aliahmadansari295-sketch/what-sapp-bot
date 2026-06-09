// Fill in your details here
const TOKEN = "YOUR_PERMANENT_ACCESS_TOKEN";
const PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID"; // Found at the top of the Meta API Setup page
const TO_NUMBER = "919876543210"; // Your test receiving number (with country code, e.g., 91, no '+')
const TEMPLATE_NAME = "your_template_name"; 

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
                "code": "en_US" // Use "en_US" for English, or "hi" for Hindi
            }
        }
    })
})
.then(response => response.json())
.then(data => console.log("Meta Response:", data))
.catch(error => console.error("Error:", error));