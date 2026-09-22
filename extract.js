const fs = require('fs');
const lines = fs.readFileSync(process.env.HOME + '/.gemini/antigravity/brain/179adf16-38ff-4642-8752-80f692c6cf20/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
for (const line of lines) {
  if (!line) continue;
  const data = JSON.parse(line);
  if (data.type === 'TOOL_RESPONSE' && data.content && data.content.includes('StudentDetailClient.tsx')) {
    console.log(data.content.substring(0, 500));
  }
}
