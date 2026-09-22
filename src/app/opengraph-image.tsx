import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = 'birimO - Birebir Eğitim Platformu';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Read local file and convert to base64 so Satori can render it without HTTP fetch blocks
  const logoData = readFileSync(join(process.cwd(), 'public/images/Logo.png'));
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img 
          src={logoBase64}
          alt="Logo" 
          width="600"
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  );
}
