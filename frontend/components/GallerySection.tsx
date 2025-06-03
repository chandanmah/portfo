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
  const [selectedImage, setSelectedImage] = useState<GalleryMedia | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.documentElement.classList.add('gallery-modal-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.classList.remove('gallery-modal-active');
      document.body.style.overflow = '';
    }
    // Cleanup function to ensure styles are reset if component unmounts while modal is open
    return () => {
      document.documentElement.classList.remove('gallery-modal-active');
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && selectedImage && modalContentRef.current) {
      modalContentRef.current.focus(); // Focus for keyboard navigation if needed
      // Delay scrollIntoView slightly to allow modal to render and transition
      setTimeout(() => {
        modalContentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 100); // Adjust delay as needed
    }
  }, [isModalOpen, selectedImage]);

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

  const openImageModal = (image: GalleryMedia, index: number) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
    setIsModalOpen(true); // This will trigger the useEffect above
    // Scroll to center logic will be in a useEffect dependent on isModalOpen and selectedImage
  };

  const closeImageModal = useCallback(() => {
    setIsModalOpen(false); // This will trigger the useEffect above
    setSelectedImage(null);
  }, []);

  const navigateImage = useCallback((direction: 'next' | 'prev') => {
    if (!mediaItems.length) return;
    let newIndex = currentImageIndex;
    if (direction === 'next') {
      newIndex = (currentImageIndex + 1) % mediaItems.length;
    } else {
      newIndex = (currentImageIndex - 1 + mediaItems.length) % mediaItems.length;
    }
    setCurrentImageIndex(newIndex);
    setSelectedImage(mediaItems[newIndex]);
  }, [currentImageIndex, mediaItems]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (event.key === 'Escape') {
        closeImageModal();
      }
      if (event.key === 'ArrowRight') {
        navigateImage('next');
      }
      if (event.key === 'ArrowLeft') {
        navigateImage('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, closeImageModal, navigateImage]); // Added navigateImage to dependency array

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
                onClick={() => openImageModal(item, index)}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={item.url} // Use the static URL directly
                    alt={item.name || 'Gallery image'}
                    layout="responsive" // Ensures image scales with container while maintaining aspect ratio
                    width={item.width || 700} // Provide a default or actual width
                    height={item.height || 500} // Provide a default or actual height
                    objectFit="contain" // Ensures the whole image is visible within its bounds
                    className="transition-transform duration-500 ease-in-out group-hover:scale-105 w-full h-full"
                    unoptimized
                  />
                  {/* Glass card overlay on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-auto group-hover:max-h-[50%] bg-white/10 backdrop-blur-lg border-t border-white/20 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-center items-center p-4 overflow-hidden">
                    <h3 className="text-white text-lg font-semibold text-center" title={item.name}>
                      {item.name || 'Artwork'}
                    </h3>
                    {item.subtitle && (
                      <p className="text-white text-sm mt-1 italic text-center" title={item.subtitle}>
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl p-4 transition-opacity duration-300 ease-in-out" // Adjusted bg-black/60 to bg-black/30 and increased blur to backdrop-blur-xl for more pronounced effect
          onClick={closeImageModal} // Close modal when clicking on the backdrop
        >
          <div 
            ref={modalContentRef}
            tabIndex={-1} // Make div focusable
            className="relative bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-auto max-w-xl w-full max-h-[95vh] flex flex-col p-4 sm:p-6 transition-all duration-300 ease-in-out scale-95 group-hover:scale-100 focus:outline-none" // Changed bg-white/10 to bg-white/5, increased backdrop-blur-2xl, changed border-white/20 to border-white/10, added overflow-auto for scrolling if content exceeds max-h, added focus:outline-none
            onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside the card content
          >
            <button 
              onClick={closeImageModal} 
              className="absolute top-2 right-2 text-white/80 hover:text-white text-4xl bg-transparent hover:bg-black/30 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-20"
              aria-label="Close image modal"
            >
              &times;
            </button>

            {/* Navigation Buttons */} 
            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage('prev')}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors text-2xl sm:text-3xl"
                  aria-label="Previous image"
                >
                  &#x276E;
                </button>
                <button
                  onClick={() => navigateImage('next')}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors text-2xl sm:text-3xl"
                  aria-label="Next image"
                >
                  &#x276F;
                </button>
              </>
            )}

            
            {/* Image container - ensure it takes available space and centers the image, allowing natural aspect ratio with object-contain */}
            <div className="w-full h-full flex-grow flex items-center justify-center overflow-hidden py-2 sm:py-2">
              <Image 
                src={selectedImage.url}
                alt={selectedImage.name || 'Enlarged gallery image'}
                width={selectedImage.width || 1200} // Adjusted for potentially larger modal
                height={selectedImage.height || 900} // Adjusted for potentially larger modal
                objectFit="contain" // Ensures the whole image is visible
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                unoptimized
              />
            </div>
            {/* Text container for title and subtitle */}
            <div className="text-center flex-shrink-0">
              <h3 className="text-white text-2xl font-semibold mb-1">{selectedImage.name}</h3>
              {selectedImage.subtitle && (
                <p className="text-gray-300 text-md italic">{selectedImage.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GallerySection;