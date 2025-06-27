import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-16 border-[#3B3024]/35">
      <div className="container mx-auto px-4">
        <div className="bg-secondary/25 backdrop-blur-lg rounded-3xl border border-[#3B3024]/35 shadow-[0_0_50px_rgba(0,0,0,0.25)] p-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <h3 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold leading-tight text-[#3B3024] drop-shadow-lg mb-2">Studio Mahanta</h3>
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-[#6B5C4F] drop-shadow-md italic tracking-wider">Architect, artist, photographer and more.</p>
              <p className="text-sm md:text-base text-[#6B5C4F] mt-2 max-w-md">Creating beautiful art through watercolors, architecture, and nature photography. Sharing my passion for gardening and sustainable living.</p>
            </div>

            <div className="flex flex-col items-center md:items-end">
              <div className="flex space-x-6 mb-4">
                <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-all duration-300 hover:scale-110">
                  <Instagram className="h-6 w-6" />
                  <span className="sr-only">Instagram</span>
                </Link>
                <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-all duration-300 hover:scale-110">
                  <Facebook className="h-6 w-6" />
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-all duration-300 hover:scale-110">
                  <Twitter className="h-6 w-6" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </div>
              <div className="text-sm text-[#4A4036] text-center md:text-right">
                <p>&copy; {currentYear} Chandan Mahanta. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
