const fs = require('fs');
const lines = fs.readFileSync(process.env.HOME + '/.gemini/antigravity/brain/789010d3-1e7e-45d4-bcac-7fbc8217c007/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
let c = 0;
for (const line of lines) {
  if (!line) continue;
  const data = JSON.parse(line);
  if (data.type === 'TOOL_RESPONSE' && data.content && data.content.includes('StudentDetailClient.tsx') && data.content.includes('Total Lines: 613')) {
    fs.writeFileSync(`restored_${c++}.txt`, data.content);
  }
}
