// app/components/GallerySection.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

interface GalleryMedia {
  id: string;
  url: string;
  name: string; // Original filename, can be used for alt text or title
  subtitle?: string; // Optional: a short description of the painting
  width?: number; // Optional: for intrinsic aspect ratio
  height?: number; // Optional: for intrinsic aspect ratio
}



const GallerySection: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<GalleryMedia[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  // const mediaItems = staticMediaItems; // Replaced by state

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/gallery');
        if (!response.ok) {
          throw new Error('Failed to fetch gallery images');
        }
        const data: { galleryImages: GalleryMedia[] } = await response.json();
        setMediaItems(data.galleryImages || []);
      } catch (err) {
        console.error('Error fetching gallery images:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setMediaItems([]); // Clear items on error or set to empty array
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleItems((prev) => ({ ...prev, [entry.target.id]: true }));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% of the item is visible
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      itemRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [mediaItems]); // Dependency array now includes mediaItems to re-run observer setup when items change

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setIsViewerOpen(true);
  };

  const closeImageViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  const goToNextImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  }, [mediaItems.length]);

  const goToPrevImage = useCallback(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isViewerOpen) return;
      if (event.key === 'Escape') {
        closeImageViewer();
      }
      if (event.key === 'ArrowRight') {
        goToNextImage();
      }
      if (event.key === 'ArrowLeft') {
        goToPrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewerOpen, closeImageViewer, goToNextImage, goToPrevImage]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading gallery...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error: {error}. Please try again later.</div>;
  }

  if (!mediaItems || mediaItems.length === 0) {
    return <div className="text-center py-12 text-gray-500">No images found in the gallery.</div>;
  }

  return (
    <section id="gallery" className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-5xl font-bold text-center text-gray-800 mb-16 tracking-tight">
          Our Gallery
        </h2>
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {/* The `space-y-4` adds vertical spacing between items in the same column. The `gap-4` handles horizontal spacing between columns. */}
          {mediaItems.map((item, index) => {
            return (
              <div
                key={item.id}
                id={`gallery-item-${item.id}`}
                ref={(el: HTMLDivElement | null): void => { itemRefs.current[index] = el }}
                className={`group relative bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-700 ease-in-out cursor-pointer break-inside-avoid mb-4 ${ 
                  visibleItems[`gallery-item-${item.id}`] 
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-90 rotate-[-2deg]'
                }`}
                // Added `break-inside-avoid` to prevent items from breaking across columns
                // Added `mb-4` to ensure consistent vertical spacing if `space-y-4` on parent isn't enough or for items at the bottom of columns
                onClick={() => openImageViewer(index)}
              >
                <div className="relative w-full h-auto aspect-w-1 aspect-h-1 sm:aspect-none">
                  <Image
                    src={item.url} // Use the static URL directly
                    alt={item.name || 'Gallery image'}
                    layout="intrinsic" // Changed from fill to intrinsic
                    width={item.width || 500} // Provide a default or actual width
                    height={item.height || 500} // Provide a default or actual height
                    objectFit="contain" // Changed from cover to contain
                    className="transition-transform duration-500 ease-in-out group-hover:scale-105 w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                {/* Overlay with name and subtitle on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-end p-6">
                  <h3 className="text-white text-lg font-semibold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-in-out truncate" title={item.name}>
                    {item.name || 'Artwork'}
                  </h3>
                  {item.subtitle && (
                    <p className="text-white text-sm mt-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-in-out delay-75 truncate" title={item.subtitle}>
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isViewerOpen && mediaItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
          <button 
            onClick={closeImageViewer} 
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors z-50"
            aria-label="Close image viewer"
          >
            &times;
          </button>
          
          <button 
            onClick={goToPrevImage} 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-30 rounded-full z-50"
            aria-label="Previous image"
            disabled={mediaItems.length <= 1}
          >
            &#10094;
          </button>

          <div className="relative max-w-full max-h-full flex flex-col items-center justify-center">
            <Image 
              src={mediaItems[currentImageIndex].url}
              alt={mediaItems[currentImageIndex].name || 'Fullscreen gallery image'}
              layout="intrinsic"
              width={1200} // Adjust as needed, or use actual image dimensions if available
              height={800} // Adjust as needed, or use actual image dimensions if available
              objectFit="contain"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              unoptimized
              priority // Prioritize loading of the current fullscreen image
            />
            {(mediaItems[currentImageIndex].name || mediaItems[currentImageIndex].subtitle) && (
              <div className="mt-4 text-white text-center bg-black bg-opacity-60 px-4 py-3 rounded-lg">
                {mediaItems[currentImageIndex].name && (
                  <p className="text-lg font-semibold">
                    {mediaItems[currentImageIndex].name}
                  </p>
                )}
                {mediaItems[currentImageIndex].subtitle && (
                  <p className="text-sm mt-1">
                    {mediaItems[currentImageIndex].subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={goToNextImage} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-30 rounded-full z-50"
            aria-label="Next image"
            disabled={mediaItems.length <= 1}
          >
            &#10095;
          </button>
        </div>
      )}
    </section>
  );
};

export default GallerySection;