'use client'
import Link from "next/link"


import { useState, useEffect } from 'react'
import { Instagram, Facebook, Twitter } from 'lucide-react'

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

export default function Footer() {
  const [socialData, setSocialData] = useState<SocialMediaData>({
    instagram: 'https://instagram.com/mrmahanta',
    facebook: 'https://facebook.com/mrmahanta',
    twitter: 'https://twitter.com/mrmahanta'
  })

  // Fetch social media data on component mount
  useEffect(() => {
    fetchSocialData()
  }, [])

  const fetchSocialData = async () => {
    try {
      const response = await fetch('/api/admin/social')
      if (response.ok) {
        const data: SocialMediaData = await response.json()
        setSocialData(data)
      }
    } catch (error) {
      console.error('Error fetching social data:', error)
      // Keep default values if fetch fails
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 border-t border-primary/20 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="font-playfair text-xl font-bold">Mr. Mahanta</h3>
            <p className="text-sm text-muted-foreground">Watercolor Artist</p>
          </div>

          <div className="flex space-x-6 mb-4 md:mb-0">
            <Link href={socialData.instagram} className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link href={socialData.facebook} className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="h-5 w-5" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link href={socialData.twitter} className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">&copy; {currentYear} Mr. Mahanta. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
