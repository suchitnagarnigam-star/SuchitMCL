import React from "react";

// Official Lion Capital of India / State Emblem Silhouette
export function NationalEmblem({ className = "w-12 h-12", color = "#B89047" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Abacus (Base) */}
      <path d="M30 90 H70 V94 H30 Z" fill={color} />
      <path d="M25 94 H75 V98 H25 Z" fill={color} />
      <circle cx="50" cy="94" r="2.5" fill="#FFF" />
      
      {/* Dharma Chakra in Center */}
      <circle cx="50" cy="85" r="5" stroke={color} strokeWidth="1.5" />
      <circle cx="50" cy="85" r="1.5" fill={color} />
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x2 = 50 + 5 * Math.cos(angle);
        const y2 = 85 + 5 * Math.sin(angle);
        return <line key={i} x1="50" y1="85" x2={x2} y2={y2} stroke={color} strokeWidth="0.5" />;
      })}
      
      {/* Bull and Horse carvings (Simplified Silhouettes) */}
      <path d="M36 84 C38 84 39 86 38 88 H34 C33 86 34 84 36 84 Z" fill={color} />
      <path d="M64 84 C62 84 61 86 62 88 H66 C67 86 66 84 64 84 Z" fill={color} />

      {/* Central Lion Body & Paws */}
      <path d="M42 60 V80 C42 82 58 82 58 80 V60 Z" fill={color} opacity="0.9" />
      <path d="M46 80 H54 V84 H46 Z" fill={color} />
      
      {/* Central Lion Mane and Head */}
      <path d="M50 35 C42 35 40 45 42 55 C42 60 58 60 58 55 C60 45 58 35 50 35 Z" fill={color} />
      <path d="M47 38 C49 34 51 34 53 38 L55 42 H45 Z" fill={color} />
      {/* Snout and Face */}
      <path d="M48 44 H52 V49 H48 Z" fill="#FFF" opacity="0.3" />
      <path d="M50 49 L47 52 H53 Z" fill={color} />
      
      {/* Left Lion (Profile) */}
      <path d="M38 42 C30 42 28 50 30 65 C32 75 42 80 42 80 V62 C40 60 38 52 38 42 Z" fill={color} opacity="0.8" />
      {/* Right Lion (Profile) */}
      <path d="M62 42 C70 42 72 50 70 65 C68 75 58 80 58 80 V62 C60 60 62 52 62 42 Z" fill={color} opacity="0.8" />
      
      {/* Crown / Top Feature */}
      <path d="M50 30 L48 33 H52 Z" fill={color} />
      
      {/* Satyameva Jayate Devnagari Script Placeholder (Stylized lines) */}
      <path d="M32 108 H68 M35 112 H42 M46 112 H54 M58 112 H65" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Government of Punjab Circular Seal Styled Emblem
export function PunjabGovEmblem({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Ring with Gold Border */}
        <circle cx="60" cy="60" r="56" stroke="#B89047" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="52" stroke="#B89047" strokeWidth="0.75" strokeDasharray="3 2" />
        <circle cx="60" cy="60" r="42" stroke="#B89047" strokeWidth="1" />
        
        {/* Wheat Stalks left & right inside the ring */}
        {/* Left Stalk */}
        <path d="M30 65 C28 55 32 45 42 40 C38 46 36 54 38 62" stroke="#046A38" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="34" cy="50" r="2.5" fill="#FF671F" />
        <circle cx="31" cy="57" r="2.5" fill="#FF671F" />
        <circle cx="38" cy="45" r="2.5" fill="#FF671F" />
        
        {/* Right Stalk */}
        <path d="M90 65 C92 55 88 45 78 40 C82 46 84 54 82 62" stroke="#046A38" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="86" cy="50" r="2.5" fill="#FF671F" />
        <circle cx="89" cy="57" r="2.5" fill="#FF671F" />
        <circle cx="82" cy="45" r="2.5" fill="#FF671F" />

        {/* Central National Emblem Symbol */}
        <g transform="translate(30, 20) scale(0.6)">
          <NationalEmblem className="w-100 h-100" color="#B89047" />
        </g>
        
        {/* Bilingual Circular Text (Stylized Curved Paths representation or plain SVG Text) */}
        <defs>
          <path id="textPathTop" d="M 22,60 A 38,38 0 0,1 98,60" />
          <path id="textPathBottom" d="M 98,60 A 38,38 0 0,1 22,60" />
        </defs>
        
        <text className="font-bold fill-slate-800 text-[7px] tracking-[0.5px]">
          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
            ਪੰਜਾਬ ਸਰਕਾਰ • GOVERNMENT OF PUNJAB
          </textPath>
        </text>
        <text className="font-bold fill-slate-700 text-[6.5px]">
          <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
            ਨਗਰ ਨਿਗਮ ਲੁਧਿਆਣਾ
          </textPath>
        </text>
      </svg>
    </div>
  );
}

// Swachh Bharat (Clean India) spectacles Logo in Gurmukhi / English
export function SwachhBharatLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg viewBox="0 0 100 40" className="h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left Lens */}
        <circle cx="25" cy="20" r="14" stroke="#06038D" strokeWidth="2" fill="#FFF" />
        {/* Right Lens */}
        <circle cx="75" cy="20" r="14" stroke="#06038D" strokeWidth="2" fill="#FFF" />
        
        {/* Specs Bridge */}
        <path d="M39 20 C45 14 55 14 61 20" stroke="#06038D" strokeWidth="2" strokeLinecap="round" />
        
        {/* Ear temple connector lines */}
        <path d="M11 20 H5" stroke="#06038D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M89 20 H95" stroke="#06038D" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Text inside lenses: "ਸਵੱਛ" (Left) and "ਭਾਰਤ" (Right) */}
        <text x="25" y="24" className="font-bold fill-slate-800 text-[7.5px]" textAnchor="middle">
          ਸਵੱਛ
        </text>
        <text x="75" y="24" className="font-bold fill-slate-800 text-[7.5px]" textAnchor="middle">
          ਭਾਰਤ
        </text>
      </svg>
      <div className="flex flex-col text-[8px] font-extrabold text-[#06038D] leading-tight select-none border-l border-slate-200 pl-2">
        <span>ਇੱਕ ਕਦਮ</span>
        <span>ਸਵੱਛਤਾ ਵੱਲ</span>
      </div>
    </div>
  );
}

// Digital India Logo - Styled Vector Representation
export function DigitalIndiaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Globe/Network mesh element */}
      <circle cx="20" cy="20" r="15" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="0.5" />
      <path d="M10 20 C10 14 30 14 30 20 C30 26 10 26 10 20 Z" stroke="#3B82F6" strokeWidth="0.75" />
      <path d="M20 5 V35" stroke="#3B82F6" strokeWidth="0.75" />
      <path d="M5 20 H35" stroke="#3B82F6" strokeWidth="0.75" />
      
      {/* Orange-Green curved stripes intersecting globe */}
      <path d="M8 12 Q20 -2 32 12" stroke="#FF671F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 28 Q20 42 32 28" stroke="#046A38" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Brand Text */}
      <text x="42" y="19" className="font-black fill-[#0F172A] text-[11px] tracking-tight">Digital</text>
      <text x="42" y="30" className="font-bold fill-[#3B82F6] text-[10px] tracking-[0.5px]">India</text>
      <text x="42" y="36" className="font-semibold fill-slate-450 text-[5px] uppercase tracking-wider">Power To Empower</text>
    </svg>
  );
}

// NIC (National Informatics Centre) Logo Badge
export function NICBadge({ className = "h-7" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-1.5 ${className}`}>
      <svg viewBox="0 0 50 30" className="h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 5 H25 V25 H5 Z" fill="#0A2540" />
        <path d="M25 5 H45 L35 25 H15 Z" fill="#FF671F" opacity="0.85" />
        <path d="M15 15 L25 5 L35 15 L25 25 Z" fill="#046A38" opacity="0.7" />
        <text x="25" y="19" className="font-black fill-white text-[10px]" textAnchor="middle">NIC</text>
      </svg>
      <div className="flex flex-col text-[7px] font-bold text-slate-500 leading-tight">
        <span>National</span>
        <span>Informatics</span>
        <span>Centre</span>
      </div>
    </div>
  );
}

// Official Ludhiana Municipal Council Image Logo Component
export function MCLLogo({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <img 
      src="/mcl-logo.jpg" 
      alt="Municipal Corporation Ludhiana Logo" 
      className={`rounded-full object-contain bg-white p-0.5 border border-slate-200 ${className}`}
    />
  );
}
