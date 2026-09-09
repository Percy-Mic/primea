<div className="flex flex-col gap-1 max-w-[85%] sm:max-w-md w-full">
  <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-sm w-full">
    {/* Audio Play/Pause Button */}
    <button 
      type="button" 
      className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
    >
      {/* Play/Pause Icon placeholder */}
    </button>
    
    {/* Waveform / Progress Container */}
    <div className="flex-1 min-w-0 flex items-center gap-1 h-6">
      <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
        <div className="bg-white h-full w-1/3"></div>
      </div>
    </div>

    {/* Timestamp */}
    <span className="text-xs font-medium text-blue-100 flex-shrink-0">
      0:03
    </span>
  </div>
  <span className="text-[10px] text-gray-400 px-1">12:53 PM</span>
</div>
