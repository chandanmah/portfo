"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DialogTitle } from "@/components/ui/dialog" // Assuming DialogTitle is here
import { VisuallyHidden } from "@radix-ui/react-visually-hidden" // Or a local VisuallyHidden component
import { useEffect, useState } from "react"

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#gallery", label: "Gallery" },
  { href: "#contact", label: "Contact" },
]

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isGalleryModalActive, setIsGalleryModalActive] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show navbar if scrolled past a certain point (e.g., 100px or height of hero section)
      // Or when the gallery section is in view
      const gallerySection = document.getElementById('gallery');
      if (gallerySection) {
        const galleryTop = gallerySection.getBoundingClientRect().top;
        if (window.scrollY > 50 && galleryTop <= window.innerHeight * 0.5) {
          setIsVisible(true);
        } else if (window.scrollY <= 50) {
          setIsVisible(false);
        }
      } else if (window.scrollY > window.innerHeight * 0.8) { // Fallback if gallery not found
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility(); // Initial check

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  useEffect(() => {
    // Check initial state
    setIsGalleryModalActive(document.documentElement.classList.contains('gallery-modal-active'));

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsGalleryModalActive(
            (mutation.target as HTMLElement).classList.contains('gallery-modal-active')
          );
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/20 shadow-lg transition-all duration-300 ease-in-out ${isGalleryModalActive ? "opacity-0 -translate-y-full pointer-events-none" :
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}
    >

      
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="#home" className="font-playfair text-2xl font-bold text-white drop-shadow-lg hover:text-white/90 transition-colors">
          Mr. Mahanta
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-6 py-3 rounded-full text-white/90 hover:text-white transition-all duration-300 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/30 shadow-md hover:shadow-lg font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            {/* Ensure SheetTrigger has an accessible name if it's just an icon */}
          
            <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-white/30">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-black/80 backdrop-blur-xl border-l border-white/20">
            <VisuallyHidden>
              <DialogTitle>Mobile Navigation Menu</DialogTitle>
            </VisuallyHidden>
            <nav className="flex flex-col space-y-3 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 rounded-lg text-white/90 hover:text-white transition-all duration-300 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/30 text-lg font-medium shadow-md hover:shadow-lg"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
