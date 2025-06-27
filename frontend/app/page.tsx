"use client"

import { useEffect } from "react"
import Navbar from "@/components/navbar"
import SectionWrapper from "@/components/section-wrapper"
import HeroSection from "@/components/hero-section"
import CategorizedGallerySection from "@/components/CategorizedGallerySection"
import ContactSection from "@/components/contact-section"
import Footer from "@/components/footer"

export default function Home() {
  // Initialize intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )

    // Observe all elements with the section-fade-in class
    document.querySelectorAll(".section-fade-in").forEach((section) => {
      observer.observe(section)
    })

    return () => {
      document.querySelectorAll(".section-fade-in").forEach((section) => {
        observer.unobserve(section)
      })
    }
  }, [])

  return (
    <main className="min-h-screen">
      <Navbar />

      <SectionWrapper id="home" className="min-h-screen flex items-center justify-center">
        <HeroSection />
      </SectionWrapper>

      <SectionWrapper id="gallery">
        <CategorizedGallerySection />
      </SectionWrapper>

      {/* {/* <SectionWrapper id="about">
        <AboutSection />
      </SectionWrapper> */} 

      <SectionWrapper id="contact" className="py-10 section-fade-in">
        <ContactSection />
      </SectionWrapper>

      <Footer />
    </main>
  )
}

