import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Engine, Render, World, Bodies, Mouse, MouseConstraint, Runner } from 'matter-js';

// Import your components
import Sidenav from '../../components/Sidenav';
import Navbar from '../../components/Navbar'; // Your existing Navbar, now acting as the Header
import Footer from '../../components/Footer';
import BreadcrumbsNav from '../../components/BreadcrumbsNav'; // Your BreadcrumbsNav component
import assets from '../../assets/assets'; // Ensure assets.graduationCap exists


function MainLayout() {
    // State to control the Sidenav's expanded/collapsed status
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

    // Function to toggle the Sidenav's state
    const toggleSidebar = () => {
        setIsSidebarExpanded(prev => !prev);
    };

    // Matter.js useEffect hook
    useEffect(() => {
        const canvasElement = document.getElementById('physics-background');

        if (!(canvasElement instanceof HTMLCanvasElement)) {
            console.error('Canvas element not found or is not a canvas');
            return;
        }

        const canvas: HTMLCanvasElement = canvasElement;

        const engine = Engine.create();
        const render = Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent'
            }
        });

        // Add walls
        // Adjusted wall positions to be within the viewport
        const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 25, window.innerWidth, 50, { isStatic: true });
        const leftWall = Bodies.rectangle(-25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
        const rightWall = Bodies.rectangle(window.innerWidth + 25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
        const ceiling = Bodies.rectangle(window.innerWidth / 2, -25, window.innerWidth, 50, { isStatic: true });
        World.add(engine.world, [ground, leftWall, rightWall, ceiling]);


        const objects = [];
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const object = Bodies.circle(x, y, 20, {
                render: {
                    sprite: {
                        texture: assets.graduationCap, // Ensure this path is correct
                        xScale: 0.5,
                        yScale: 0.5
                    }
                },
                friction: 0.1,
                restitution: 0.5
            });
            objects.push(object);
        }
        World.add(engine.world, objects);

        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
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
            // Re-add walls on resize
            World.remove(engine.world, [ground, leftWall, rightWall, ceiling]);
            const newGround = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 25, window.innerWidth, 50, { isStatic: true });
            const newLeftWall = Bodies.rectangle(-25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
            const newRightWall = Bodies.rectangle(window.innerWidth + 25, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true });
            const newCeiling = Bodies.rectangle(window.innerWidth / 2, -25, window.innerWidth, 50, { isStatic: true });
            World.add(engine.world, [newGround, newLeftWall, newRightWall, newCeiling]);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            Render.stop(render);
            Engine.clear(engine);
            World.clear(engine.world, false);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 theme-transition">

            {/* Physics Background Canvas - Fixed and at a low z-index */}
            <canvas
                id="physics-background"
                className="fixed top-0 left-0 w-screen h-screen z-0 opacity-50"
                style={{ pointerEvents: 'none' }} // Crucial: allow clicks/interactions to pass through to elements below
            />

            {/* Navbar (your existing Navbar component now acts as the Header) */}
            {/* It is fixed at the top and has a higher z-index than the background. */}
            <Navbar toggleSidebar={toggleSidebar} />

            {/* Sidenav (now an overlay, controlled by isSidebarExpanded) */}
            {/* It must have a higher z-index than the background and potentially the Navbar for full overlay effect. */}
            <Sidenav isExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            {/* This div holds your breadcrumbs and the actual page content. */}
            {/* 'flex-grow' makes it take up remaining vertical space. */}
            {/* 'pt-16' adds padding at the top to clear the fixed Navbar (assuming Navbar is h-16 or 4rem). */}
            {/* 'px-4 pb-4' for horizontal and bottom padding. */}
            {/* 'relative' and 'z-10' are important to ensure it's above the physics background. */}
            <main className="flex-grow pt-16 px-4 pb-4 relative z-10 text-black dark:text-white">
                {/* Your BreadcrumbsNav component - now directly in MainLayout */}
                <BreadcrumbsNav />

                {/* Outlet for rendering nested routes (your actual page content) */}
                <Outlet />
            </main>

            {/* Footer (remains at the bottom, outside the main content scroll area) */}
            <Footer />
        </div>
    );
}

export default MainLayout;