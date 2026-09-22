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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '20px solid #f9fafb',
        }}
      >
        <img 
          src={logoBase64}
          alt="Logo" 
          height="200"
          style={{ objectFit: 'contain' }}
        />
        <div style={{
          marginTop: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#1f2937',
        }}>
          <h1 style={{ fontSize: 52, fontWeight: 800, margin: 0, color: '#004aad' }}>
            Birebir Eğitim Yönetim Sistemi
          </h1>
          <p style={{ fontSize: 26, fontWeight: 500, marginTop: 20, color: '#6b7280' }}>
            Modern, Premium Eğitim Yönetim Platformu
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
