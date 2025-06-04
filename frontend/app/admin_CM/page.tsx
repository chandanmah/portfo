'use client'

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit2, Save, X, Upload, Image as ImageIcon, Lock, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface AvatarData {
  avatarUrl: string;
}

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
}

interface GalleryData {
  galleryImages: GalleryImage[];
}

interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string;
}

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

export default function AdminArtManagementPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string>('');
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Avatar State
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string>('');

  // Gallery State
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const [galleryUploadMessage, setGalleryUploadMessage] = useState<string>('');
  const [galleryErrorMessage, setGalleryErrorMessage] = useState<string>('');
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageName, setEditingImageName] = useState<string>('');
  const [editingImageSubtitle, setEditingImageSubtitle] = useState<string>('');

  // Contact State
  const [contactData, setContactData] = useState<ContactData>({
    email: '',
    phone: '',
    location: '',
    studioVisitsText: '',
    emailRouting: ''
  });
  const [contactMessage, setContactMessage] = useState<string>('');

  // Social Media State
  const [socialData, setSocialData] = useState<SocialMediaData>({
    instagram: '',
    facebook: '',
    twitter: ''
  });
  const [socialMessage, setSocialMessage] = useState<string>('');

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load data after authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchAvatarData();
      fetchGalleryData();
      fetchContactData();
      fetchSocialData();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        // Verify token with backend
        const response = await fetch('/api/admin/auth', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
        }
      }
      
      // Check if setup is required
      const authResponse = await fetch('/api/admin/auth');
      const authData = await authResponse.json();
      setSetupRequired(authData.setupRequired);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: setupRequired ? 'setup' : 'login'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setAuthMessage(data.message);
        setPassword('');
        if (data.setupComplete) {
          setSetupRequired(false);
        }
      } else {
        setAuthMessage(data.message);
      }
    } catch (error) {
      setAuthMessage('Authentication failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
    setAuthMessage('');
  };

  // Avatar Functions
  const fetchAvatarData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/avatar', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data: AvatarData = await response.json();
        setCurrentAvatarUrl(data.avatarUrl || '');
      } else {
        console.error('Failed to fetch avatar data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching avatar data:', error);
    }
  };

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAvatarFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile) {
      setAvatarUploadMessage('Please select an avatar file first.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', selectedAvatarFile);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setAvatarUploadMessage('Avatar uploaded successfully!');
        setCurrentAvatarUrl(result.avatarUrl);
        setSelectedAvatarFile(null);
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload avatar.' }));
        setAvatarUploadMessage(errorData.message || 'Failed to upload avatar.');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setAvatarUploadMessage('Error uploading avatar.');
    }
  };

  // Gallery Functions
  const fetchGalleryData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/gallery', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data: GalleryData = await response.json();
        setGalleryImages(data.galleryImages || []);
      } else {
        console.error('Failed to fetch gallery data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching gallery data:', error);
    }
  };

  const handleGalleryFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedGalleryFiles(Array.from(e.target.files));
    }
  };

  const handleGalleryUpload = async () => {
    if (selectedGalleryFiles.length === 0) {
      setGalleryErrorMessage('Please select at least one image file.');
      return;
    }

    const formData = new FormData();
    selectedGalleryFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setGalleryUploadMessage(`${selectedGalleryFiles.length} image(s) uploaded successfully!`);
        setGalleryErrorMessage('');
        fetchGalleryData();
        setSelectedGalleryFiles([]);
        const fileInput = document.getElementById('gallery-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setGalleryErrorMessage(result.message || 'Failed to upload images.');
        setGalleryUploadMessage('');
      }
    } catch (error) {
      setGalleryErrorMessage('Error uploading images.');
      setGalleryUploadMessage('');
    }
  };

  const handleEditImage = (image: GalleryImage) => {
    setEditingImageId(image.id);
    setEditingImageName(image.name);
    setEditingImageSubtitle(image.subtitle || '');
  };

  const handleSaveImageEdit = async () => {
    if (!editingImageId) return;

    try {
      const response = await fetch(`/api/admin/gallery/${editingImageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingImageName,
          subtitle: editingImageSubtitle,
        }),
      });

      if (response.ok) {
        fetchGalleryData();
        setEditingImageId(null);
        setEditingImageName('');
        setEditingImageSubtitle('');
      }
    } catch (error) {
      console.error('Error updating image:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingImageId(null);
    setEditingImageName('');
    setEditingImageSubtitle('');
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/admin/gallery/${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchGalleryData();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Contact Functions
  const fetchContactData = async () => {
    try {
      const response = await fetch('/api/admin/contact');
      if (response.ok) {
        const data: ContactData = await response.json();
        setContactData(data);
      }
    } catch (error) {
      console.error('Error fetching contact data:', error);
    }
  };

  const handleContactUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      const result = await response.json();

      if (response.ok) {
        setContactMessage('Contact information updated successfully!');
      } else {
        setContactMessage(result.message || 'Failed to update contact information.');
      }
    } catch (error) {
      setContactMessage('Error updating contact information.');
    }
  };

  // Social Media Functions
  const fetchSocialData = async () => {
    try {
      const response = await fetch('/api/admin/social');
      if (response.ok) {
        const data: SocialMediaData = await response.json();
        setSocialData(data);
      }
    } catch (error) {
      console.error('Error fetching social data:', error);
    }
  };

  const handleSocialUpdate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(socialData),
      });

      const result = await response.json();

      if (response.ok) {
        setSocialMessage('Social media links updated successfully!');
      } else {
        setSocialMessage(result.message || 'Failed to update social media links.');
      }
    } catch (error) {
      setSocialMessage('Error updating social media links.');
    }
  };

  // Styles
  const inputStyle = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const buttonStyle = "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium";
  const cardStyle = "bg-white rounded-xl shadow-lg border border-gray-200";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${cardStyle}`}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {setupRequired ? 'Setup Admin Password' : 'Admin Login'}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {setupRequired 
                ? 'Set up your admin password to secure the dashboard'
                : 'Enter your password to access the admin dashboard'
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={setupRequired ? 'Create admin password' : 'Enter password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <Button type="submit" className={`w-full ${buttonStyle}`}>
                {setupRequired ? 'Setup Password' : 'Login'}
              </Button>
            </form>
            {authMessage && (
              <div className={`mt-4 p-3 rounded-lg text-center ${
                authMessage.includes('successful') || authMessage.includes('setup')
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {authMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage your portfolio content and settings</p>
          </div>
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Avatar Management */}
          <Card className={cardStyle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <ImageIcon className="h-6 w-6 text-blue-600" />
                Avatar Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentAvatarUrl && (
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <Image
                      src={currentAvatarUrl}
                      alt="Current Avatar"
                      fill
                      className="rounded-full object-cover border-4 border-blue-200"
                    />
                  </div>
                  <p className="text-sm text-gray-600">Current Avatar</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Avatar
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <Button onClick={handleAvatarUpload} className={buttonStyle}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Avatar
              </Button>
              
              {avatarUploadMessage && (
                <div className={`p-3 rounded-lg text-center ${
                  avatarUploadMessage.includes('successfully')
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {avatarUploadMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information Management */}
          <Card className={cardStyle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <Mail className="h-6 w-6 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData({...contactData, email: e.target.value})}
                    className={inputStyle}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={contactData.phone}
                    onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                    className={inputStyle}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={contactData.location}
                    onChange={(e) => setContactData({...contactData, location: e.target.value})}
                    className={inputStyle}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Routing (Where contact form emails go)
                  </label>
                  <Input
                    type="email"
                    value={contactData.emailRouting}
                    onChange={(e) => setContactData({...contactData, emailRouting: e.target.value})}
                    className={inputStyle}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Studio Visits Text
                  </label>
                  <Textarea
                    value={contactData.studioVisitsText}
                    onChange={(e) => setContactData({...contactData, studioVisitsText: e.target.value})}
                    className={inputStyle}
                    rows={3}
                  />
                </div>
                
                <Button type="submit" className={buttonStyle}>
                  <Save className="h-4 w-4 mr-2" />
                  Update Contact Info
                </Button>
              </form>
              
              {contactMessage && (
                <div className={`mt-4 p-3 rounded-lg text-center ${
                  contactMessage.includes('successfully')
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {contactMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Media Management */}
          <Card className={cardStyle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <Instagram className="h-6 w-6 text-blue-600" />
                Social Media Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSocialUpdate} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="h-4 w-4" />
                    Instagram URL
                  </label>
                  <Input
                    type="url"
                    value={socialData.instagram}
                    onChange={(e) => setSocialData({...socialData, instagram: e.target.value})}
                    className={inputStyle}
                    placeholder="https://instagram.com/username"
                    required
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Facebook className="h-4 w-4" />
                    Facebook URL
                  </label>
                  <Input
                    type="url"
                    value={socialData.facebook}
                    onChange={(e) => setSocialData({...socialData, facebook: e.target.value})}
                    className={inputStyle}
                    placeholder="https://facebook.com/username"
                    required
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Twitter className="h-4 w-4" />
                    Twitter URL
                  </label>
                  <Input
                    type="url"
                    value={socialData.twitter}
                    onChange={(e) => setSocialData({...socialData, twitter: e.target.value})}
                    className={inputStyle}
                    placeholder="https://twitter.com/username"
                    required
                  />
                </div>
                
                <Button type="submit" className={buttonStyle}>
                  <Save className="h-4 w-4 mr-2" />
                  Update Social Links
                </Button>
              </form>
              
              {socialMessage && (
                <div className={`mt-4 p-3 rounded-lg text-center ${
                  socialMessage.includes('successfully')
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {socialMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gallery Management */}
          <Card className={`${cardStyle} lg:col-span-2`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                <ImageIcon className="h-6 w-6 text-blue-600" />
                Gallery Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  id="gallery-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryFilesChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <Button onClick={handleGalleryUpload} className={buttonStyle}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
              
              {galleryUploadMessage && (
                <div className="p-3 rounded-lg text-center bg-green-100 text-green-700 border border-green-200">
                  {galleryUploadMessage}
                </div>
              )}
              
              {galleryErrorMessage && (
                <div className="p-3 rounded-lg text-center bg-red-100 text-red-700 border border-red-200">
                  {galleryErrorMessage}
                </div>
              )}
              
              {/* Gallery Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages.map((image) => (
                  <div key={image.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="relative w-full h-48 mb-4">
                      <Image
                        src={image.url}
                        alt={image.name}
                        fill
                        className="rounded-lg object-cover"
                      />
                    </div>
                    
                    {editingImageId === image.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editingImageName}
                          onChange={(e) => setEditingImageName(e.target.value)}
                          placeholder="Image name"
                          className="text-sm"
                        />
                        <Input
                          value={editingImageSubtitle}
                          onChange={(e) => setEditingImageSubtitle(e.target.value)}
                          placeholder="Subtitle (optional)"
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveImageEdit} size="sm" className="bg-green-600 hover:bg-green-700">
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button onClick={handleCancelEdit} size="sm" variant="outline">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-medium text-gray-800 mb-1">{image.name}</h3>
                        {image.subtitle && (
                          <p className="text-sm text-gray-600 mb-3">{image.subtitle}</p>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={() => handleEditImage(image)} size="sm" variant="outline">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button onClick={() => handleDeleteImage(image.id)} size="sm" className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {galleryImages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded yet. Upload some images to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}