import React, { useState } from "react";
import { Menu, X, Camera, Video, Cctv, Plane } from "lucide-react";
import { useModel } from "../context/ModelContext";
import Link from "next/link";

const GlassEffectHeader = () => {
  const { modelIndex, setModelIndex } = useModel();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "", href: "/photo", icon: <Camera className="w-5 h-5" /> },
    { name: "", href: "/video", icon: <Video className="w-5 h-5" /> },
    { name: "", href: "/livestream", icon: <Cctv className="w-5 h-5" /> },
  ];

  return (
    <header className="sticky top-0 w-full bg-gradient-to-r from-blue-100/40 via-white/30 to-blue-100/40 backdrop-blur-lg shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Responsive positioning */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="flex items-center text-xl sm:text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
            >
              UAV
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 ml-1 text-blue-600" />
              AI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <span className="text-gray-700">Detections:</span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50"
              >
                {item.icon}
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Model Selection - Responsive width */}
          <div className="hidden md:flex items-center">
            <span className="mr-2 text-gray-700 text-sm">Model:</span>
            <select
              value={modelIndex}
              onChange={(e) => setModelIndex(parseInt(e.target.value, 10))}
              className="w-32 lg:w-40 bg-white/50 border border-blue-200/50 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
            >
              <option value={0}>YOLOn 160x160</option>
              <option value={1}>YOLOn 256x256</option>
              <option value={2}>YOLOn 320x320</option>
              <option value={3}>YOLOn 640x640</option>
              <option value={4}>YOLOm 160x160</option>
              <option value={5}>YOLOm 256x256</option>
              <option value={6}>YOLOm 320x320</option>
              <option value={7}>YOLOm 640x640</option>
            </select>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-200 ease-in-out ${
          isMenuOpen ? "max-h-96" : "max-h-0 overflow-hidden"
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-3 bg-white/90 backdrop-blur-lg">
          <div className="flex items-center justify-center space-x-2 py-2">
            <span className="text-sm text-gray-700">Model:</span>
            <select
              value={modelIndex}
              onChange={(e) => setModelIndex(parseInt(e.target.value, 10))}
              className="w-40 bg-white/50 border border-blue-200/50 rounded-md px-2 py-1 text-sm"
            >
              <option value={0}>YOLO 640x640</option>
              <option value={1}>YOLO 320x320</option>
              <option value={2}>YOLO 160x160</option>
            </select>
          </div>
          <div className="border-t border-gray-200/70"></div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md hover:bg-blue-50"
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default GlassEffectHeader;
