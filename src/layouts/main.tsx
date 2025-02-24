import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Engine, Render, World, Bodies, Mouse, MouseConstraint, Runner } from 'matter-js';
import Sidenav from '../components/Sidenav';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import assets from '../assets/assets';

function MainLayout() {
    useEffect(() => {
        // Get the canvas element
        const canvasElement = document.getElementById('physics-background');

        // Check if the element exists and is a canvas
        if (!(canvasElement instanceof HTMLCanvasElement)) {
            console.error('Canvas element not found or is not a canvas');
            return;
        }

        // Now canvasElement is guaranteed to be HTMLCanvasElement
        const canvas: HTMLCanvasElement = canvasElement;

        // Create the Matter.js engine and renderer
        const engine = Engine.create();
        const render = Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false, // Use sprites instead of wireframes
                background: 'transparent' // Keep the canvas transparent
            }
        });

        // Create thematic objects (e.g., graduation caps)
        const objects = [];
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const object = Bodies.circle(x, y, 20, {
                render: {
                    sprite: {
                        texture: assets.graduationCap, // Replace with your image path
                        xScale: 0.5,
                        yScale: 0.5
                    }
                },
                friction: 0.1,
                restitution: 0.5 // Bounciness
            });
            objects.push(object);
        }
        World.add(engine.world, objects);

        // Add mouse interaction
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false // Hide constraint visualization
                }
            }
        });
        World.add(engine.world, mouseConstraint);

        // Run the engine and renderer
        const runner = Runner.create();
        Runner.run(runner, engine); // Replace Engine.run(engine)
        Render.run(render);

        // Handle window resize to keep the canvas full-screen
        const handleResize = () => {
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;
            render.options.width = window.innerWidth;
            render.options.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Cleanup on component unmount
        return () => {
            Render.stop(render);
            Engine.clear(engine);
            World.clear(engine.world, false);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <main className="theme-transition dark:bg-gray-900 text-black dark:text-white flex p-4 relative">
            <canvas
                id="physics-background"
                className="fixed top-0 left-0 w-screen h-screen z-0 opacity-50"
            />
            <Sidenav />
            <div className="ml-[300px] flex-1 px-4 z-10">
                <Navbar />
                <Outlet />
                <Footer />
            </div>
        </main>
    );
}

export default MainLayout;