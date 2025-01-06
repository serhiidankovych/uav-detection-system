import React from "react";

const Home = () => {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 text-center transition-all duration-300 hover:scale-105">
          Real-Time UAV Detection
        </h1>

        <p className="text-lg md:text-xl text-gray-600 max-w-2xl text-center leading-relaxed">
          Explore advanced object detection with cutting-edge technology in
          real-time.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <a
            href="/photo"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Get Started
          </a>
          <a
            target="_blank"
            href="https://github.com/serhiidankovych/uav-detection-system"
            className="px-6 py-3 bg-gray-500 text-white rounded-lg shadow-lg hover:bg-gray-600 transition-colors duration-300"
          >
            Learn More
          </a>
        </div>
      </div>
    </main>
  );
};

export default Home;
