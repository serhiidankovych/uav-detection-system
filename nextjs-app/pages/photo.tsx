import React from "react";
import Models from "../components/Models";

// Destructure modelIndex from props
const Photo = ({ modelIndex }: { modelIndex: number }) => {
  return (
    <main className="container md px-4 py-5">
      <Models mode="photo" />
    </main>
  );
};

export default Photo;
