// src/layouts/MainLayout.tsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Engine, Render, World, Bodies, Mouse, MouseConstraint, Runner } from "matter-js";

import Sidenav from "../components/Sidenav";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BreadcrumbsNav from "../components/BreadcrumbsNav";
import AppLauncherOverlay from "../components/AppLauncherOverlay";
import assets from "../assets/assets";

function MainLayout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  const toggleSidebar = () => setIsSidebarExpanded((p) => !p);

  useEffect(() => {
    const canvasElement = document.getElementById("physics-background");
    if (!(canvasElement instanceof HTMLCanvasElement)) return;

    const canvas: HTMLCanvasElement = canvasElement;
    const engine = Engine.create();
    const render = Render.create({
      canvas,
      engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: "transparent",
      },
    });

    const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 25, window.innerWidth, 50, { isStatic: true });
    const leftWall = Bodies.rectangle(-25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
    const rightWall = Bodies.rectangle(window.innerWidth + 25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
    const ceiling = Bodies.rectangle(window.innerWidth / 2, -25, window.innerWidth, 50, { isStatic: true });
    World.add(engine.world, [ground, leftWall, rightWall, ceiling]);

    const objects = Array.from({ length: 10 }, () => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      return Bodies.circle(x, y, 20, {
        render: {
          sprite: {
            texture: assets.graduationCap,
            xScale: 0.5,
            yScale: 0.5,
          },
        },
        friction: 0.1,
        restitution: 0.5,
      });
    });
    World.add(engine.world, objects);

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    World.add(engine.world, mouseConstraint);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    const handleResize = () => {
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;
      render.options.width = window.innerWidth;
      render.options.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      Render.stop(render);
      Engine.clear(engine);
      World.clear(engine.world, false);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition overflow-x-hidden">
      {/* Background Canvas (fix: w-full, not w-screen) */}
      <canvas
        id="physics-background"
        className="fixed top-0 left-0 w-full h-full z-0 opacity-50"
        style={{ pointerEvents: "none", display: "none" }}
      />

      {/* Header (fixed inside Header component) */}
      <Header toggleSidebar={toggleSidebar} />

      {/* Sidenav overlay (does NOT push content) */}
      <Sidenav isExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />

      {/* Main content */}
      <main
        className="
          relative z-10
          px-4 pb-4
          text-black dark:text-white
          overflow-y-auto
          min-h-screen
          pt-[calc(72px+env(safe-area-inset-top))]
          sm:pt-[calc(72px+env(safe-area-inset-top))]
        "
      >
        <BreadcrumbsNav />
        <Outlet />
        <div className="mt-8">
          <Footer />
        </div>
      </main>

      {/* App Launcher Overlay (optional, keep if you still use it elsewhere) */}
      <AppLauncherOverlay isOpen={showLauncher} onClose={() => setShowLauncher(false)} />
    </div>
  );
}

export default MainLayout;
