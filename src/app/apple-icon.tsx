import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#C8102E',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <div style={{
          width: '80px',
          height: '100px',
          borderLeft: '24px solid #FAFAF8',
          borderTop: '24px solid #FAFAF8',
          borderBottom: '24px solid #FAFAF8',
          borderTopLeftRadius: '40px',
          borderBottomLeftRadius: '40px',
        }} />
      </div>
    ),
    { ...size }
  );
}
