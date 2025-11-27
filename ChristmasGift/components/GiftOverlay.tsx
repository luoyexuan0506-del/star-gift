import React, { useState, useEffect } from 'react';

interface GiftOverlayProps {
  onOpen: () => void;
}

const GiftOverlay: React.FC<GiftOverlayProps> = ({ onOpen }) => {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);
  const [name, setName] = useState("My Friend");

  useEffect(() => {
    // Get name from URL parameter ?name=...
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    if (nameParam) {
      setName(nameParam);
    }
  }, []);

  const handleOpen = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      onOpen();
    }, 1000); // Wait for animation
  };

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#010b08] transition-opacity duration-1000 ${animateOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#D6001C]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center text-center p-8 border border-[#D4AF37]/30 bg-black/40 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.1)] max-w-sm w-full mx-4">
        
        <p className="text-[#D4AF37]/60 text-xs tracking-[0.4em] uppercase mb-4">A Digital Gift</p>
        
        <h1 className="text-4xl md:text-5xl font-playfair italic text-[#D4AF37] mb-2">
          For {name}
        </h1>
        
        <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-6" />
        
        <p className="text-white/70 font-sans font-light text-sm leading-relaxed mb-8">
          I created a galaxy for you.<br/>
          Turn on your camera,<br/>
          and hold the magic in your hands.
        </p>

        <button 
          onClick={handleOpen}
          className="group relative px-8 py-3 bg-[#D4AF37] text-[#010b08] font-serif font-bold tracking-widest uppercase text-xs rounded-full overflow-hidden hover:scale-105 transition-transform duration-300"
        >
          <span className="relative z-10">Open Experience</span>
          <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </button>

      </div>

      <p className="absolute bottom-8 text-[#D4AF37]/30 text-[10px] tracking-widest">
        DESIGNED BY YOUR FRIEND
      </p>
    </div>
  );
};

export default GiftOverlay;