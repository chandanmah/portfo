"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface AvatarData {
  avatarUrl: string;
}

export default function HeroSection() {
  const [avatarUrl, setAvatarUrl] = useState<string>("/placeholder.svg");

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const response = await fetch('/api/admin/avatar');
        if (!response.ok) {
          console.error('Failed to fetch avatar');
          // Keep placeholder if fetch fails
          return;
        }
        const data: AvatarData = await response.json();
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
        // Keep placeholder on error
      }
    };

    fetchAvatar();
  }, []);

  const smoothScrollTo = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return (
    <section className="flex flex-col md:flex-row items-center justify-center min-h-[80vh] py-20 px-4 gap-10 bg-transparent">
      {/* Avatar */}
      <div className="flex-shrink-0 shadow-lg rounded-full overflow-hidden w-56 h-56 mb-8 md:mb-0 md:mr-12 bg-white/60 flex items-center justify-center">
        <Image
          src={avatarUrl}
          alt="Mr. Mahanta Avatar"
          priority // Prioritize loading the avatar image
          width={224}
          height={224}
          className={`object-cover w-full h-full ${avatarUrl === '/placeholder.svg' ? 'p-8' : ''}`}
        />
      </div>
      {/* About Section */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xl">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 leading-tight">
          Mr. Mahanta
        </h1>
        <h2 className="text-3xl md:text-4xl font-semibold text-[#d6b48c] mb-6">Watercolor Artist</h2>
        <p className="text-lg md:text-xl font-crimson mb-10 text-muted-foreground">
          Exploring the delicate beauty of life through the flowing medium of watercolor. With over 15 years of dedication, my paintings capture fleeting moments of beauty with remarkable sensitivity. Each piece is a meditation on patience and presence, inviting you to slow down and appreciate the subtle details that often go unnoticed.
        </p>
        <div className="flex gap-6">
          <Button asChild className="rounded-full bg-[#d6b48c] backdrop-blur-lg border border-transparent text-white hover:bg-[#c9a06d] px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300 transform hover:scale-105">
            <a href="#gallery" onClick={smoothScrollTo('gallery')}>Explore My Works</a>
          </Button>
          <Button asChild variant="outline" className="rounded-full bg-transparent backdrop-blur-lg border border-[#d6b48c] text-[#d6b48c] hover:bg-[#d6b48c]/20 hover:text-[#c9a06d] px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300 transform hover:scale-105">
            <a href="#contact" onClick={smoothScrollTo('contact')} className="flex items-center gap-2">
              Contact Me <Mail className="h-6 w-6" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
