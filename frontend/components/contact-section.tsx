"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin } from "lucide-react"

interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string;
}

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [contactData, setContactData] = useState<ContactData>({
    email: 'contact@mrmahanta.com',
    phone: '(314) 555-1234',
    location: 'St. Louis, Missouri',
    studioVisitsText: 'Studio visits are available by appointment. Please contact me to arrange a visit to see my works in person and discuss potential commissions or acquisitions.',
    emailRouting: 'contact@mrmahanta.com'
  })

  // Fetch contact data on component mount
  useEffect(() => {
    fetchContactData()
  }, [])

  const fetchContactData = async () => {
    try {
      const response = await fetch('/api/admin/contact')
      if (response.ok) {
        const data: ContactData = await response.json()
        setContactData(data)
      }
    } catch (error) {
      console.error('Error fetching contact data:', error)
      // Keep default values if fetch fails
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ name: '', email: '', message: '' })
        // Reset success message after 5 seconds
        setTimeout(() => setIsSubmitted(false), 5000)
      } else {
        console.error('Error submitting form:', result.message)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Get in Touch</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-background/50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-background/50"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="bg-background/50"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>

              {isSubmitted && (
                <div className="p-3 bg-primary/20 text-primary-foreground rounded-md text-center">
                  Thank you for your message! I'll get back to you soon.
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col justify-center">
          <Card className="bg-background/80 backdrop-blur-sm border-primary/20 mb-6">
            <CardContent className="p-6">
              <h3 className="font-playfair text-xl font-bold mb-4">Contact Information</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <a href={`mailto:${contactData.email}`} className="hover:text-primary transition-colors">
                    {contactData.email}
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href={`tel:${contactData.phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary transition-colors">
                    {contactData.phone}
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{contactData.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/80 backdrop-blur-sm border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-playfair text-xl font-bold mb-4">Studio Visits</h3>
              <p>
                {contactData.studioVisitsText}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
