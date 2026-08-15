import { useEffect } from 'react';

export default function BuyMeACoffeeWidget() {
  useEffect(() => {
    // Ensure Google Font Cookie is loaded for Buy Me a Coffee font style
    if (!document.querySelector('link[href*="fonts.googleapis.com/css?family=Cookie"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css?family=Cookie&display=swap';
      document.head.appendChild(fontLink);
    }
  }, []);

  return (
    <div
      id="bmc-widget-container"
      className="fixed z-[9999] pointer-events-auto"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
      }}
    >
      <a
        className="bmc-btn flex items-center gap-2.5 px-5 py-2.5 rounded-[12px] text-[#000000] bg-[#FFDD00] shadow-[0px_4px_14px_rgba(0,0,0,0.18)] hover:shadow-[0px_6px_20px_rgba(0,0,0,0.24)] hover:-translate-y-0.5 transition-all no-underline font-['Cookie',cursive]"
        target="_blank"
        rel="noreferrer"
        href="https://buymeacoffee.com/dhanushdprabhu"
        style={{
          backgroundColor: '#FFDD00',
          color: '#000000',
          height: '52px',
          padding: '0 20px',
          borderRadius: '12px',
          fontSize: '26px',
          fontWeight: 'normal',
          fontFamily: "'Cookie', cursive, sans-serif",
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none',
          boxShadow: '0px 4px 14px rgba(0,0,0,0.18)',
        }}
      >
        {/* Official Buy Me a Coffee SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          style={{ width: '26px', height: '26px' }}
        >
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill="#FFFFFF" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
        <span
          className="bmc-btn-text leading-none pt-1"
          style={{
            fontFamily: "'Cookie', cursive, sans-serif",
            fontSize: '26px',
            color: '#000000',
            whiteSpace: 'nowrap',
          }}
        >
          Buy me a coffee
        </span>
      </a>
    </div>
  );
}
