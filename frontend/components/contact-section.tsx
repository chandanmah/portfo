"use client"

import type React from "react"
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Calendar, Clock } from "lucide-react"

export default function ContactSection() {

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-[#3B3024] mb-4 tracking-tight">Let's Connect</h2>
          <p className="text-lg text-[#6B5C4F] max-w-2xl mx-auto leading-relaxed">
            I'd love to hear from you! Whether you're interested in my artwork, have
            questions about my gardening techniques, or simply want to connect with a fellow creative, I'm always excited to meet new people and share stories.
          </p>
        </div>

        <div className="bg-secondary/25 backdrop-blur-lg rounded-2xl border border-[#3B3024]/35 shadow-[0_0_30px_rgba(0,0,0,0.15)] p-6 md:p-8">
          <div>
            {/* Contact Information */}
            <div className="space-y-4">
              <div>
                <h3 className="font-playfair text-2xl font-bold text-[#3B3024] mb-3">Get in Touch</h3>
                <p className="text-[#6B5C4F] text-base mb-4">
                  Feel free to reach out through any of these channels. I typically respond within 24-48 hours.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 group">
                  <div className="bg-[#8C6239]/10 p-2 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <Mail className="h-5 w-5 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5C4F] uppercase tracking-wide">Email</p>
                    <a href="mailto:cmahanta@gmail.com" className="text-[#3B3024] text-base font-medium hover:text-[#8C6239] transition-colors">
                      cmahanta@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 group">
                  <div className="bg-[#8C6239]/10 p-2 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <Phone className="h-5 w-5 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5C4F] uppercase tracking-wide">Phone</p>
                    <a href="tel:+13146539229" className="text-[#3B3024] text-base font-medium hover:text-[#8C6239] transition-colors">
                      +1 (314) 653 9229
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 group">
                  <div className="bg-[#8C6239]/10 p-2 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <MapPin className="h-5 w-5 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5C4F] uppercase tracking-wide">Location</p>
                    <p className="text-[#3B3024] text-base font-medium">St. Louis, Missouri</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
