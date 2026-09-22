const fs = require('fs');
const lines = fs.readFileSync(process.env.HOME + '/.gemini/antigravity/brain/789010d3-1e7e-45d4-bcac-7fbc8217c007/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
for (const line of lines) {
  if (!line) continue;
  const data = JSON.parse(line);
  if (data.type === 'TOOL_RESPONSE' && data.content && data.content.includes('StudentDetailClient.tsx') && data.content.includes('Showing lines 1 ')) {
    console.log(data.content.substring(0, 300));
    fs.writeFileSync('restored_part1.txt', data.content);
  }
}
