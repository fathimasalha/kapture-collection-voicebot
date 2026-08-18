/**
 * Automated Test Runner for Kapture Collections Voicebot Webhook
 * Validates tool calls from test_cases.json against the webhook server.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test target URL (Render or Local)
const TARGET_URL = process.env.TEST_URL || 'https://kapture-collection-voicebot.onrender.com/webhook';

console.log('====================================================');
console.log(`  Kapture Voicebot Output Verification Runner`);
console.log(`  Target: ${TARGET_URL}`);
console.log('====================================================\n');

function sendWebhookRequest(toolName, args) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: {
        type: 'tool-calls',
        toolCalls: [
          {
            id: `test_call_${Date.now()}`,
            function: {
              name: toolName,
              arguments: args
            }
          }
        ]
      }
    });

    const parsedUrl = new URL(TARGET_URL);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runAllTests() {
  const testCasesPath = path.join(__dirname, 'test_cases.json');
  const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const tc of testCases) {
    console.log(`▶ [${tc.test_id}] ${tc.scenario_name} (${tc.category})`);
    const toolSteps = tc.conversation_steps.filter(s => s.expected_tool);

    if (toolSteps.length === 0) {
      console.log(`  ℹ No backend tool calls in this scenario.\n`);
      continue;
    }

    for (const step of toolSteps) {
      totalTests++;
      const toolName = step.expected_tool;
      const args = step.args || {};

      try {
        const response = await sendWebhookRequest(toolName, args);
        if (response.status === 200 && response.data && response.data.results) {
          const toolResult = response.data.results[0].result;
          console.log(`  ✔ [Tool: ${toolName}] executed successfully.`);
          console.log(`    Args:`, JSON.stringify(args));
          console.log(`    Output:`, JSON.stringify(toolResult));
          passedTests++;
        } else {
          console.log(`  ✖ [Tool: ${toolName}] failed or returned invalid response.`);
          console.log(`    Response:`, response);
          failedTests++;
        }
      } catch (err) {
        console.log(`  ✖ [Tool: ${toolName}] error connecting to server: ${err.message}`);
        failedTests++;
      }
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(`  Summary: ${passedTests}/${totalTests} Tool Verifications Passed!`);
  if (failedTests > 0) {
    console.log(`  Failed: ${failedTests}`);
  }
  console.log('====================================================');
}

runAllTests();
