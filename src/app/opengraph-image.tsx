import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'birimO - Birebir Eğitim Platformu';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
          border: '20px solid #f9fafb', // Light gray border frame
        }}
      >
        <img 
          src="https://birimo.ableajans.com/images/Logo.png" 
          alt="Logo" 
          height="180"
          style={{ objectFit: 'contain' }}
        />
        <div style={{
          marginTop: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: '#1f2937',
        }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0, color: '#004aad' }}>
            Birebir Eğitim Yönetim Sistemi
          </h1>
          <p style={{ fontSize: 24, fontWeight: 500, marginTop: 20, color: '#6b7280' }}>
            Modern, Premium Eğitim Yönetim Platformu
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
