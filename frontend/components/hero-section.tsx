"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail, User, Palette } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface AvatarData {
  avatarUrl: string;
}

export default function HeroSection() {
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchAvatar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/avatar?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: AvatarData = await response.json();
      console.log('Avatar data received:', data);
      
      if (data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      } else {
        console.warn('No avatar URL in response');
      }
    } catch (error: any) {
      console.error('Error fetching avatar:', error);
      setError(error.message || 'Failed to load avatar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatar();
    
    // Set up periodic refresh to catch updates
    const interval = setInterval(fetchAvatar, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchAvatar]);

  const smoothScrollTo = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  return (
    <section className="flex items-center justify-center min-h-[90vh] pt-0 pb-20 md:py-20 px-4 bg-transparent">
      {/* Unified Frosted Glass Card */}
      <div className="relative max-w-6xl w-full">
        <div className="bg-secondary/25 backdrop-blur-lg rounded-3xl border border-[#3B3024]/35 shadow-[0_0_50px_rgba(0,0,0,0.25)] p-8 md:p-12">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-80 h-96 md:w-96 md:h-[28rem] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.2)] border border-[#3B3024]/40">
                  {loading ? (
                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B3024]"></div>
                    </div>
                  ) : error ? (
                    <div className="w-full h-full bg-gradient-to-br from-red/20 to-red/10 flex items-center justify-center flex-col">
                      <User className="w-24 h-24 text-red-600 mb-2" />
                      <p className="text-red-600 text-sm text-center px-4">{error}</p>
                    </div>
                  ) : avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Mr. Mahanta"
                      priority
                      width={384}
                      height={448}
                      className="w-full h-full object-cover"
                      unoptimized
                      onError={(e) => {
                        console.error('Image failed to load:', avatarUrl);
                        setError('Image failed to load');
                        setAvatarUrl('');
                      }}
                      onLoad={() => {
                        console.log('Avatar image loaded successfully');
                      }}
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
                Studio Mahanta
              </h1>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#6B5C4F] mb-8 drop-shadow-md italic tracking-wider">
                Architect, artist, photographer and more.
              </h2>
              <p className="text-lg md:text-xl font-crimson mb-10 text-[#4A4036] drop-shadow-sm leading-relaxed max-w-xl">
                I'm a retired architect rediscovering the joys of watercolor painting after a 50-year pause — now honored with awards and recognition. My world is rooted in creativity and craftsmanship: I'm also a photographer, native plant gardener, beekeeper, mead (honey wine) maker, and furniture artisan. This space is a reflection of those passions — where art meets nature, precision meets play, and tradition finds new expression.
              </p>
              <p className="text-lg md:text-xl font-crimson mb-10 text-[#4A4036] drop-shadow-sm leading-relaxed max-w-xl">
                Thank you for visiting — I hope you'll find beauty, inspiration, and perhaps a bit of wonder here.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild variant="outline" className="rounded-[1.25rem] bg-[#8C6239]/80 hover:bg-[#7A5530] text-[#F7EEDD] hover:text-[#F7EEDD] border-[#70463C] backdrop-blur-lg px-8 py-4 text-lg font-semibold shadow-xl transition-all duration-300 transform hover:scale-105">
                  <a href="#gallery" onClick={smoothScrollTo('gallery')}>Explore My Creations</a>
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