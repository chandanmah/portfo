"use client"

import type React from "react"
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Calendar, Clock } from "lucide-react"

export default function ContactSection() {

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-[#3B3024] mb-6 tracking-tight">Let's Connect</h2>
          <p className="text-xl text-[#6B5C4F] max-w-3xl mx-auto leading-relaxed">
            I'd love to hear from you! Whether you're interested in my artwork, have questions about my gardening techniques, 
            or simply want to connect with a fellow creative, I'm always excited to meet new people and share stories.
          </p>
        </div>

        <div className="bg-secondary/25 backdrop-blur-lg rounded-3xl border border-[#3B3024]/35 shadow-[0_0_50px_rgba(0,0,0,0.25)] p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="font-playfair text-3xl font-bold text-[#3B3024] mb-6">Get in Touch</h3>
                <p className="text-[#6B5C4F] text-lg mb-8">
                  Feel free to reach out through any of these channels.<br/> I typically respond within 24-48 hours.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="bg-[#8C6239]/10 p-3 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <Mail className="h-6 w-6 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5C4F] uppercase tracking-wide">Email</p>
                    <a href="mailto:contact@mrmahanta.com" className="text-[#3B3024] text-lg font-medium hover:text-[#8C6239] transition-colors">
                      contact@mrmahanta.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="bg-[#8C6239]/10 p-3 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <Phone className="h-6 w-6 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5C4F] uppercase tracking-wide">Phone</p>
                    <a href="tel:+13145551234" className="text-[#3B3024] text-lg font-medium hover:text-[#8C6239] transition-colors">
                      (314) 555-1234
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="bg-[#8C6239]/10 p-3 rounded-full group-hover:bg-[#8C6239]/20 transition-colors">
                    <MapPin className="h-6 w-6 text-[#8C6239]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#6B5C4F] uppercase tracking-wide">Location</p>
                    <p className="text-[#3B3024] text-lg font-medium">St. Louis, Missouri</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Information */}
            <div className="space-y-8">
              <div>
                <h3 className="font-playfair text-3xl font-bold text-[#3B3024] mb-6">Studio and Garden</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-[#3B3024]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-5 w-5 text-[#8C6239]" />
                    <h4 className="text-lg font-semibold text-[#3B3024]">Studio Visits</h4>
                  </div>
                  <p className="text-[#6B5C4F] mb-4">
                    Private studio visits available by appointment. See my latest works, learn about my techniques, 
                    and discuss custom commissions.
                  </p>
                  <p className="text-sm text-[#8C6239] font-medium">Duration: 1-2 hours • By appointment only</p>
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-[#3B3024]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-5 w-5 text-[#8C6239]" />
                    <h4 className="text-lg font-semibold text-[#3B3024]">Garden Tours</h4>
                  </div>
                  <p className="text-[#6B5C4F] mb-4">
                    Seasonal garden tours showcasing native plants, sustainable gardening practices, and beekeeping. 
                    Learn about creating harmony between art and nature.
                  </p>
                  <p className="text-sm text-[#8C6239] font-medium">Spring & Summer seasons • Group bookings available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
