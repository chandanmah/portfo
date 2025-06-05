import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 border-t border-[#3B3024]/35 bg-secondary/25 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="font-playfair text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-[#3B3024] drop-shadow-lg">Chandan Mahanta</h3>
            <p className="text-md md:text-lg lg:text-xl font-semibold text-[#6B5C4F] drop-shadow-md italic tracking-wider">Artist & Photographer</p>
          </div>

          <div className="flex space-x-6 mb-4 md:mb-0">
            <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-colors">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-colors">
              <Facebook className="h-5 w-5" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link href="#" className="text-[#4A4036] hover:text-[#3B3024] transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
          </div>

          <div className="text-sm text-[#4A4036]">&copy; {currentYear} Chandan Mahanta. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
