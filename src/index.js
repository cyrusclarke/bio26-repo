import React, { useCallback, useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import objectTracker from "@cloud-annotations/object-tracking";

import "./styles.css";

const VIDEO = "/feet1.mp4";

const normalizeBoxSize = box => {
  if (!box) {
    return [0, 0, 0, 0];
  }
  const [x, y, width, height] = box;
  return [
    Math.round(width < 0 ? x - Math.abs(width) : x),
    Math.round(height < 0 ? y - Math.abs(height) : y),
    Math.round(Math.abs(width)),
    Math.round(Math.abs(height))
  ];
};

const App = () => {
  const videoRef = useRef();
  const canvasRef = useRef();

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
    };
  });

  const [box, setBox] = useState();
  const [drawing, setDrawing] = useState(false);
  const handleMouseDown = useCallback(e => {
    setDrawing(true);
    e = (() => {
      if (e.clientX && e.clientY) {
        return e;
      }
      return e.touches[0];
    })();

    // bug fix for mobile safari thinking there is a scroll.
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const mX = e.clientX - canvasRect.left;
    const mY = e.clientY - canvasRect.top;

    setBox([
      Math.min(canvasRef.current.width, Math.max(0, mX)),
      Math.min(canvasRef.current.height, Math.max(0, mY)),
      0,
      0
    ]);
  }, []);

  const handleMouseMove = useCallback(
    e => {
      if (!drawing) {
        return;
      }
      e = (() => {
        if (e.clientX && e.clientY) {
          return e;
        }
        return e.touches[0];
      })();

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const mX = Math.min(
        canvasRef.current.width,
        Math.max(0, e.clientX - canvasRect.left)
      );
      const mY = Math.min(
        canvasRef.current.height,
        Math.max(0, e.clientY - canvasRect.top)
      );

      setBox(([x, y]) => [x, y, mX - x, mY - y]);
    },
    [drawing]
  );

  const renderBox = useCallback(box => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(box[0], box[1], box[2], box[3]);
  }, []);

  const trackAndRender = useCallback(
    async tracker => {
      requestAnimationFrame(async () => {
        const box = await tracker.next(videoRef.current);
        renderBox(box);
        trackAndRender(tracker);
      });
    },
    [renderBox]
  );

  const handleMouseUp = useCallback(() => {
    setDrawing(false);
    videoRef.current.onseeked = () => {
      const [xmin, ymin, width, height] = normalizeBoxSize(box);
      setBox(undefined);
      renderBox([xmin, ymin, width, height]);
      const tracker = objectTracker.init(videoRef.current, [
        xmin,
        ymin,
        width,
        height
      ]);
      videoRef.current.play();
      trackAndRender(tracker);
    };

    videoRef.current.currentTime = 0;
  }, [box, trackAndRender, renderBox]);

  const handleVideoLoad = useCallback(async () => {
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
  }, []);

  const [xmin, ymin, width, height] = normalizeBoxSize(box);
  return (
    <>
      <h4>Draw a box to start tracking</h4>
      <div
        style={{
          position: "relative"
        }}
        draggable={false}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          src={VIDEO}
          muted
          onLoadedData={handleVideoLoad}
          width="1280"
          height="720"
        />
        <canvas ref={canvasRef} />

        {box && (
          <div
            style={{
              position: "absolute",
              left: xmin,
              top: ymin,
              width: width,
              height: height,
              border: "2px solid yellow"
            }}
          />
        )}
      </div>
    </>
  );
};

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);

