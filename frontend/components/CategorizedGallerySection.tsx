'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';

interface GalleryMedia {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
  category: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface CategoryData {
  [key: string]: GalleryMedia[];
}

const CATEGORIES = [
  { id: 'architecture', name: 'Architecture', description: 'Architectural work and designs' },
  { id: 'watercolors', name: 'Watercolors', description: 'Watercolor paintings and artwork' },
  { id: 'sketches', name: 'Sketches, doodles and crafts', description: 'Sketches, doodles and handcrafted items' },
  { id: 'native-plants', name: 'Native plants', description: 'Native plant gardening photos and videos' },
  { id: 'vegetables', name: 'Vegetables', description: 'Vegetable gardening photos' },
  { id: 'beekeeping', name: 'Bee-keeping', description: 'Beekeeping photos and videos' },
  { id: 'mead-making', name: 'Mead making', description: 'Mead (honey wine) making process' },
  { id: 'furniture', name: 'Furniture', description: 'Handcrafted furniture pieces' }
];

const NAVIGATION_GROUPS = [
  { id: 'architecture', name: 'Architecture', type: 'single' as const },
  {
    id: 'art',
    name: 'Art',
    type: 'dropdown' as const,
    items: [
      { id: 'watercolors', name: 'Watercolors' },
      { id: 'sketches', name: 'Sketches, doodles and crafts' }
    ]
  },
  { id: 'beekeeping', name: 'Bee-keeping', type: 'single' as const },
  {
    id: 'gardening',
    name: 'Gardening',
    type: 'dropdown' as const,
    items: [
      { id: 'native-plants', name: 'Native plants' },
      { id: 'vegetables', name: 'Vegetables' }
    ]
  },
  { id: 'mead-making', name: 'Mead making', type: 'single' as const },
  { id: 'furniture', name: 'Furniture', type: 'single' as const }
];

const CategorizedGallerySection: React.FC = () => {
  const [categoryData, setCategoryData] = useState<CategoryData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('architecture');
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<GalleryMedia | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.documentElement.classList.add('gallery-modal-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.classList.remove('gallery-modal-active');
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.classList.remove('gallery-modal-active');
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen && selectedMedia && modalContentRef.current) {
      modalContentRef.current.focus();
      setTimeout(() => {
        modalContentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }, 100);
    }
  }, [isModalOpen, selectedMedia]);

  useEffect(() => {
    const fetchCategoryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/categorized-gallery');
        if (!response.ok) {
          throw new Error('Failed to fetch categorized gallery data');
        }
        const data: CategoryData = await response.json();
        setCategoryData(data);
      } catch (err) {
        console.error('Error fetching categorized gallery data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setCategoryData({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryData();
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
      { threshold: 0.1 }
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      itemRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [categoryData, activeCategory]);

  const openMediaModal = (media: GalleryMedia, index: number) => {
    setSelectedMedia(media);
    setCurrentMediaIndex(index);
    setIsModalOpen(true);
  };

  const closeMediaModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  }, []);

  const navigateMedia = useCallback((direction: 'next' | 'prev') => {
    const currentCategoryMedia = categoryData[activeCategory] || [];
    if (!currentCategoryMedia.length) return;
    let newIndex = currentMediaIndex;
    if (direction === 'next') {
      newIndex = (currentMediaIndex + 1) % currentCategoryMedia.length;
    } else {
      newIndex = (currentMediaIndex - 1 + currentCategoryMedia.length) % currentCategoryMedia.length;
    }
    setCurrentMediaIndex(newIndex);
    setSelectedMedia(currentCategoryMedia[newIndex]);
  }, [currentMediaIndex, categoryData, activeCategory]);

  const toggleVideoPlay = (videoId: string) => {
    setPlayingVideos(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (event.key === 'Escape') {
        closeMediaModal();
      }
      if (event.key === 'ArrowRight') {
        navigateMedia('next');
      }
      if (event.key === 'ArrowLeft') {
        navigateMedia('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, closeMediaModal, navigateMedia]); // Added navigateMedia to dependency array

  if (isLoading) {
    return <div className="text-center py-12 text-gray-600">Loading gallery...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error: {error}. Please try again later.</div>;
  }

  const currentCategoryMedia = categoryData[activeCategory] || [];
  const currentCategory = CATEGORIES.find(cat => cat.id === activeCategory);

  return (
    <section id="gallery" className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-5xl font-bold text-center text-[#3B3024] mb-16 tracking-tight">
          My Creations
        </h2>
        
        {/* Category Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12" ref={dropdownContainerRef}>
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.id} className="relative">
              {group.type === 'single' ? (
                <button
                  onClick={() => {
                    setActiveCategory(group.id);
                    setOpenDropdown(null);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === group.id
                      ? 'bg-[#8C6239] text-[#F7EEDD] shadow-lg'
                      : 'bg-[#F7EEDD]/80 text-[#3B3024] hover:bg-[#8C6239]/20 border border-[#3B3024]/20'
                  }`}
                >
                  {group.name}
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      group.items?.some(item => activeCategory === item.id)
                        ? 'bg-[#8C6239] text-[#F7EEDD] shadow-lg'
                        : 'bg-[#F7EEDD]/80 text-[#3B3024] hover:bg-[#8C6239]/20 border border-[#3B3024]/20'
                    }`}
                  >
                    {group.name}
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${openDropdown === group.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  {openDropdown === group.id && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white/95 backdrop-blur-lg rounded-lg shadow-xl border border-[#3B3024]/20 py-2 min-w-max z-50">
                      {group.items?.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveCategory(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm transition-colors whitespace-nowrap ${
                            activeCategory === item.id
                              ? 'bg-[#8C6239] text-[#F7EEDD]'
                              : 'text-[#3B3024] hover:bg-[#8C6239]/10'
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Category Description */}
        {currentCategory && (
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-[#3B3024] mb-2">{currentCategory.name}</h3>
            <p className="text-[#6B5C4F] text-lg">{currentCategory.description}</p>
          </div>
        )}

        {/* Media Grid with Background */}
        <div className="bg-secondary/25 backdrop-blur-lg rounded-3xl border border-[#3B3024]/35 shadow-[0_0_50px_rgba(0,0,0,0.25)] p-8">
          {currentCategoryMedia.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No items found in this category yet.
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {currentCategoryMedia.map((item, index) => {
              const itemId = `gallery-item-${item.id}`;
              return (
                <div
                  key={item.id}
                  id={itemId}
                  ref={(el: HTMLDivElement | null): void => { itemRefs.current[index] = el }}
                  className={`group relative bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-700 ease-in-out cursor-pointer break-inside-avoid mb-4 ${
                    visibleItems[itemId]
                      ? 'opacity-100 scale-100 rotate-0'
                      : 'opacity-0 scale-90 rotate-[-2deg]'
                  }`}
                  onClick={() => openMediaModal(item, index)}
                >
                  <div className="relative w-full h-full">
                    {item.type === 'video' ? (
                      <div className="relative">
                        <video
                          src={item.url}
                          className="w-full h-auto object-contain transition-transform duration-500 ease-in-out group-hover:scale-105"
                          muted
                          loop
                          playsInline
                          controls={false}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-[#3B3024] ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={item.url}
                        alt={item.name || 'Gallery image'}
                        layout="responsive"
                        width={item.width || 700}
                        height={item.height || 500}
                        objectFit="contain"
                        className="transition-transform duration-500 ease-in-out group-hover:scale-105 w-full h-full"
                        unoptimized
                      />
                    )}
                    
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
          )}
        </div>
      </div>
      
      {/* Modal */}
      {isModalOpen && selectedMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xl transition-opacity duration-300 ease-in-out w-full h-full min-h-screen min-w-screen p-4" // Ensure full viewport coverage and retain padding for content
          onClick={closeMediaModal} // Close modal when clicking on the backdrop
        >
          <div 
            ref={modalContentRef}
            tabIndex={-1} // Make div focusable
            className="relative bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-auto max-w-xl w-full max-h-[95vh] flex flex-col p-4 sm:p-6 transition-all duration-300 ease-in-out scale-95 group-hover:scale-100 focus:outline-none" // Changed bg-white/10 to bg-white/5, increased backdrop-blur-2xl, changed border-white/20 to border-white/10, added overflow-auto for scrolling if content exceeds max-h, added focus:outline-none
            onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside the card content
          >
            <button 
              onClick={closeMediaModal} 
              className="absolute top-2 right-2 text-white/80 hover:text-white text-4xl bg-transparent hover:bg-black/30 rounded-full w-12 h-12 flex items-center justify-center transition-colors z-20"
              aria-label="Close image modal"
            >
              &times;
            </button>

            {/* Navigation Buttons */} 
            {currentCategoryMedia.length > 1 && (
              <>
                <button
                  onClick={() => navigateMedia('prev')}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors text-2xl sm:text-3xl"
                  aria-label="Previous image"
                >
                  &#x276E;
                </button>
                <button
                  onClick={() => navigateMedia('next')}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors text-2xl sm:text-3xl"
                  aria-label="Next image"
                >
                  &#x276F;
                </button>
              </>
            )}

            
            {/* Image container - ensure it takes available space and centers the image, allowing natural aspect ratio with object-contain */}
            <div className="w-full h-full flex-grow flex items-center justify-center overflow-hidden py-2 sm:py-2">
              {selectedMedia.type === 'video' ? (
                <video 
                  src={selectedMedia.url}
                  controls
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  autoPlay
                />
              ) : (
                <Image 
                  src={selectedMedia.url}
                  alt={selectedMedia.name || 'Enlarged gallery image'}
                  width={selectedMedia.width || 1200}
                  height={selectedMedia.height || 900}
                  objectFit="contain"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  unoptimized
                />
              )}
            </div>
            
            {/* Text container for title and subtitle */}
            <div className="text-center flex-shrink-0">
              <h3 className="text-white text-2xl font-semibold mb-1">{selectedMedia.name}</h3>
              {selectedMedia.subtitle && (
                <p className="text-gray-300 text-md italic">{selectedMedia.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CategorizedGallerySection;