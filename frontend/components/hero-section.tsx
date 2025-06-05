"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail, User, Palette } from "lucide-react";
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
    <section className="flex items-center justify-center min-h-[80vh] pt-2 pb-20 md:py-20 px-4 bg-transparent">
      {/* Unified Frosted Glass Card */}
      <div className="relative max-w-6xl w-full">
        <div className="bg-secondary/25 backdrop-blur-lg rounded-3xl border border-[#3B3024]/35 shadow-[0_0_50px_rgba(0,0,0,0.25)] p-8 md:p-12">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-80 h-96 md:w-96 md:h-[28rem] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.2)] border border-[#3B3024]/40">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Mr. Mahanta"
                      priority
                      width={384}
                      height={448}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                      <div className="text-6xl text-black/70">
                        <User className="w-24 h-24" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-brown/20 backdrop-blur-md border border-[#3B3024]/50 rounded-full flex items-center justify-center shadow-lg">
                  <Palette className="w-10 h-10 text-[#3B3024]" />
                </div>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-[#3B3024] drop-shadow-lg font-playfair">
                Chandan Mahanta
              </h1>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#6B5C4F] mb-8 drop-shadow-md italic tracking-wider">
                Watercolor Artist
              </h2>
              <p className="text-lg md:text-xl font-crimson mb-10 text-[#4A4036] drop-shadow-sm leading-relaxed max-w-xl">
                Exploring the delicate beauty of life through the flowing medium of watercolor. With over 15 years of dedication, my paintings capture fleeting moments of beauty with remarkable sensitivity. Each piece is a meditation on patience and presence, inviting you to slow down and appreciate the subtle details that often go unnoticed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild variant="outline" className="rounded-[1.25rem] bg-[#8C6239]/80 hover:bg-[#7A5530] text-[#F7EEDD] hover:text-[#F7EEDD] border-[#70463C] backdrop-blur-lg px-8 py-4 text-lg font-semibold shadow-xl transition-all duration-300 transform hover:scale-105">
                  <a href="#gallery" onClick={smoothScrollTo('gallery')}>Explore My Works</a>
                </Button>
                <Button asChild variant="outline" className="rounded-[1.25rem] bg-[#70463C]/80 hover:bg-[#603C33] text-[#F7EEDD] hover:text-[#F7EEDD] border-[#70463C] backdrop-blur-lg px-8 py-4 text-lg font-semibold shadow-xl transition-all duration-300 transform hover:scale-105">
                  <a href="#contact" onClick={smoothScrollTo('contact')} className="flex items-center gap-2">
                    Contact Me <Mail className="h-6 w-6" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
