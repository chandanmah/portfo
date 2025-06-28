"use client";

import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CategorizedGalleryAdmin from '@/components/CategorizedGalleryAdmin';

interface AvatarData {
  avatarUrl: string;
}

export default function AdminArtManagementPage() {
  const router = useRouter();
  
  // Avatar State
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string>('');
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);

  const handleLogout = () => {
    document.cookie = 'admin-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/');
  };

  // Fetch avatar data with improved error handling
  const fetchAvatar = useCallback(async () => {
    try {
      setAvatarLoading(true);
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/avatar?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: AvatarData = await response.json();
      console.log('Admin avatar data:', data);
      
      setCurrentAvatarUrl(data.avatarUrl || '');
    } catch (error: any) {
      console.error('Error fetching avatar:', error);
      setAvatarUploadMessage(`Error fetching avatar: ${error.message}`);
    } finally {
      setAvatarLoading(false);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  // Avatar Handlers
  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAvatarFile(e.target.files[0]);
      setAvatarUploadMessage('');
    }
  };

  const handleAvatarUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAvatarFile) {
      setAvatarUploadMessage('Please select an avatar image.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', selectedAvatarFile);

    try {
      setAvatarUploadMessage('Uploading avatar...');
      setAvatarLoading(true);
      
      const response = await fetch('/api/admin/avatar', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to upload avatar');
      }
      
      console.log('Avatar upload result:', result);
      
      setAvatarUploadMessage(result.message);
      setCurrentAvatarUrl(result.avatarUrl);
      setSelectedAvatarFile(null);
      
      // Clear the file input
      const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
      if (avatarInput) avatarInput.value = '';
      
      // Refresh avatar data after a short delay
      setTimeout(() => {
        fetchAvatar();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setAvatarUploadMessage(`Error uploading avatar: ${error.message}`);
    } finally {
      setAvatarLoading(false);
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black";
  const buttonStyle = "mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed";
  const sectionStyle = "mb-12 p-6 bg-white shadow-lg rounded-lg";
  const imagePreviewStyle = "mt-4 max-w-xs max-h-64 object-contain border border-gray-200 rounded";

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-gray-800">
      <header className="mb-10 flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-700">Manage Your Artworks</h1>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            View Site
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Avatar Management Section */}
      <section className={sectionStyle}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-600">Update Your Profile Picture</h2>
        <form onSubmit={handleAvatarUpload}>
          <div>
            <label htmlFor="avatarInput" className="block text-sm font-medium text-gray-700">Choose a new profile picture (e.g., a photo of yourself):</label>
            <input 
              id="avatarInput" 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarFileChange} 
              className={inputStyle}
              disabled={avatarLoading}
            />
          </div>
          <button 
            type="submit" 
            className={buttonStyle}
            disabled={avatarLoading || !selectedAvatarFile}
          >
            {avatarLoading ? 'Uploading...' : 'Upload Picture'}
          </button>
        </form>
        
        {avatarUploadMessage && (
          <p className={`mt-2 text-sm ${
            avatarUploadMessage.toLowerCase().includes('error') || 
            avatarUploadMessage.toLowerCase().includes('failed') 
              ? 'text-red-600' 
              : 'text-green-600'
          }`}>
            {avatarUploadMessage}
          </p>
        )}
        
        {avatarLoading ? (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700">Loading...</h3>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mt-2"></div>
          </div>
        ) : currentAvatarUrl ? (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700">Your Current Profile Picture:</h3>
            <img 
              src={currentAvatarUrl} 
              alt="Current Avatar" 
              className={imagePreviewStyle}
              onError={(e) => {
                console.error('Avatar image failed to load in admin:', currentAvatarUrl);
                setAvatarUploadMessage('Error: Avatar image failed to load');
              }}
              onLoad={() => {
                console.log('Avatar image loaded successfully in admin');
              }}
            />
            <p className="text-xs text-gray-500 mt-2">URL: {currentAvatarUrl}</p>
          </div>
        ) : (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700">No Profile Picture Set</h3>
            <p className="text-sm text-gray-500">Upload an image to set your profile picture.</p>
          </div>
        )}
      </section>

      {/* Categorized Gallery Management */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Categorized Gallery Management</h2>
        <CategorizedGalleryAdmin />
      </section>
    </div>
  );
}
