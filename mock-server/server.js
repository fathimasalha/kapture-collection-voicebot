const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// Logger middleware to print incoming requests in a readable format
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// GET health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Kapture Finance Mock Webhook Server' });
});

// GET webhook helper for browser testing
app.get('/webhook', (req, res) => {
  res.status(200).json({
    status: 'active',
    message: 'Kapture Finance Webhook endpoint is ready to receive POST requests from Vapi.ai. Use health check or send a POST request to test functionality.',
    health_check: 'http://localhost:3000/health'
  });
});

// Main Webhook Endpoint for Vapi
app.post('/webhook', (req, res) => {
  const { message } = req.body;

  if (!message) {
    console.warn('[Webhook Warning]: Received request with empty message body.');
    return res.status(400).json({ error: "Missing message body" });
  }

  console.log(`[Event Received]: ${message.type}`);

  // Handle Tool Calls from Vapi
  if (message.type === 'tool-calls') {
    const results = message.toolCalls.map((toolCall) => {
      const { name, arguments: args } = toolCall.function;
      const callId = toolCall.id;

      console.log(`\n--- Tool Call: "${name}" ---`);
      console.log(`Arguments:`, JSON.stringify(args, null, 2));

      let result = {};

      switch (name) {
        case 'verify_customer':
          // Mock verification: digits '1234' (PAN suffix) or '1995' (birth year) are successful.
          const isVerified = args.verification_code === '1234' || args.verification_code === '1995';
          if (isVerified) {
            console.log('>>> Verification Result: SUCCESS');
            result = {
              verified: true,
              customer_name: "Rahul Sharma",
              message: "Identity verified successfully."
            };
          } else {
            console.log(`>>> Verification Result: FAILED (Code provided: ${args.verification_code})`);
            result = {
              verified: false,
              customer_name: "",
              message: "Verification failed. Incorrect PAN digits or DOB year."
            };
          }
          break;

        case 'log_promise_to_pay':
          const ptpId = `PTP-${Math.floor(100000 + Math.random() * 900000)}`;
          console.log(`>>> Promise-to-Pay Logged: ID=${ptpId}, Date=${args.ptp_date}, Amount=₹${args.amount}`);
          result = {
            success: true,
            ptp_id: ptpId,
            confirmed_date: args.ptp_date,
            amount: args.amount,
            message: `PTP logged successfully with ID ${ptpId}`
          };
          break;

        case 'send_payment_link':
          const channel = args.channel || 'SMS';
          const mockPaymentLink = `https://pay.kapturefinance.com/pay/${args.account_id || 'ACC-88392'}`;
          
          console.log(`\n======================================================`);
          console.log(`[NOTIFICATION GATEWAY] Sending dispatch trigger...`);
          console.log(`Channel: ${channel}`);
          console.log(`Recipient Name: Rahul Sharma`);
          console.log(`Overdue Amount: ₹8,499`);
          console.log(`Link: ${mockPaymentLink}`);
          console.log(`Message Template: "Dear Rahul, please clear your overdue loan EMI of Rs. 8,499 by paying here: ${mockPaymentLink} - Kapture Finance"`);
          console.log(`======================================================\n`);

          result = {
            success: true,
            channel: channel,
            payment_link: mockPaymentLink,
            message: `Payment link successfully dispatched via ${channel}.`
          };
          break;

        case 'escalate_to_agent':
          const targetSip = 'sip:collections-desk@kapturefinance.com';
          console.log(`>>> ESCALATION INITIATED: Route to human agent. Reason: ${args.reason}`);
          result = {
            success: true,
            transfer_sip_uri: targetSip,
            message: `Warm transfer initiated to ${targetSip} due to ${args.reason}.`
          };
          break;

        case 'mark_disposition':
          const timestamp = new Date().toISOString();
          console.log(`>>> CALL DISPOSITION MARKED: Status="${args.status}"`);
          console.log(`Notes: "${args.notes || 'None'}"`);
          result = {
            success: true,
            disposition_logged: args.status,
            timestamp: timestamp,
            message: `Disposition status ${args.status} successfully logged.`
          };
          break;

        default:
          console.error(`[Webhook Error]: Unknown tool function name "${name}".`);
          result = {
            success: false,
            message: `Unknown function call: ${name}`
          };
      }

      return {
        toolCallId: callId,
        result: JSON.stringify(result)
      };
    });

    return res.status(200).json({ results });
  }

  // Handle other Vapi events (e.g. status-update, assistant-request, transcript)
  if (message.type === 'status-update') {
    console.log(`[Status Update]: Call is currently "${message.status}"`);
  } else if (message.type === 'end-of-call-report') {
    console.log(`[End of Call Report]: Duration = ${message.duration}s, Disposition = ${message.disposition || 'N/A'}`);
  }

  return res.status(200).json({ status: "acknowledged" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Kapture Finance Mock Webhook Server is running!`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`======================================================\n`);
});
