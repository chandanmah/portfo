"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';

interface AvatarData {
  avatarUrl: string;
}

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string; // Added subtitle
}

interface GalleryData {
  galleryImages: GalleryImage[];
}

export default function AdminArtManagementPage() {
  // Avatar State
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string>('');

  // Gallery State
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]); // Changed to handle multiple files
  const [galleryUploadMessage, setGalleryUploadMessage] = useState<string>('');
  const [galleryErrorMessage, setGalleryErrorMessage] = useState<string>('');
  // State for editing image details
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editText, setEditText] = useState<{ name: string; subtitle: string }>({ name: '', subtitle: '' });

  // Fetch initial data
  useEffect(() => {
    fetchAvatar();
    fetchGalleryImages();
  }, []);

  const fetchAvatar = async () => {
    try {
      const response = await fetch('/api/admin/avatar');
      if (!response.ok) throw new Error('Failed to fetch avatar');
      const data: AvatarData = await response.json();
      setCurrentAvatarUrl(data.avatarUrl || '');
    } catch (error) {
      console.error('Error fetching avatar:', error);
      setAvatarUploadMessage('Error fetching avatar.');
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const response = await fetch('/api/admin/gallery');
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      const data: GalleryData = await response.json();
      setGalleryImages(data.galleryImages || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      setGalleryErrorMessage('Error fetching gallery images.');
    }
  };

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
      const response = await fetch('/api/admin/avatar', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to upload avatar');
      setAvatarUploadMessage(result.message);
      setCurrentAvatarUrl(result.avatarUrl);
      setSelectedAvatarFile(null);
      // Clear the file input if possible (might need a ref or reset form)
      const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
      if(avatarInput) avatarInput.value = '';
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setAvatarUploadMessage(error instanceof Error ? error.message : 'Error uploading avatar.');
    }
  };

  // Gallery Handlers
  const handleGalleryFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedGalleryFiles(Array.from(e.target.files)); // Store all selected files
      setGalleryUploadMessage(`${e.target.files.length} file(s) selected.`);
    } else {
      setSelectedGalleryFiles([]);
      setGalleryUploadMessage('');
    }
  };

  const handleGalleryImageUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedGalleryFiles.length === 0) {
      setGalleryUploadMessage('Please select one or more gallery images.');
      return;
    }

    setGalleryUploadMessage(`Uploading ${selectedGalleryFiles.length} image(s)...`);
    let successCount = 0;
    let errorCount = 0;

    for (const file of selectedGalleryFiles) {
      const formData = new FormData();
      formData.append('galleryImage', file);
      // Potentially add name and subtitle here if provided at upload time
      // formData.append('name', file.name); // Default name
      // formData.append('subtitle', ''); // Default empty subtitle

      try {
        const response = await fetch('/api/admin/gallery', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Failed to upload ${file.name}`);
        setGalleryImages(prevImages => [...prevImages, result.image]);
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errorCount++;
        // Optionally, accumulate error messages
        setGalleryErrorMessage(prev => prev + `Error uploading ${file.name}. `);
      }
    }

    let finalMessage = '';
    if (successCount > 0) finalMessage += `${successCount} image(s) uploaded successfully. `;
    if (errorCount > 0) finalMessage += `${errorCount} image(s) failed to upload.`;
    setGalleryUploadMessage(finalMessage.trim() || 'Upload process finished.');
    
    setSelectedGalleryFiles([]);
    const galleryInput = document.getElementById('galleryInput') as HTMLInputElement;
    if(galleryInput) galleryInput.value = ''; // Clear file input
  };

    const handleEditImage = (image: GalleryImage) => {
    setEditingImageId(image.id);
    setEditText({ name: image.name, subtitle: image.subtitle || '' });
  };

  const handleCancelEdit = () => {
    setEditingImageId(null);
    setEditText({ name: '', subtitle: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingImageId) return;

    try {
      setGalleryUploadMessage('Updating image details...');
      // Ensure the API endpoint matches your backend route for updating, e.g., /api/admin/gallery/[id]
      const response = await fetch(`/api/admin/gallery/${editingImageId}`, { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editText),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Get raw text for error diagnosis
        console.error('Server error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText.substring(0, 100)}...`); // Show first 100 chars
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        setGalleryImages(prevImages => 
          prevImages.map(img => 
            img.id === editingImageId ? { ...img, name: editText.name, subtitle: editText.subtitle } : img
          )
        );
        setGalleryUploadMessage(result.message || 'Image details updated successfully.');
        handleCancelEdit(); // Reset editing state
      } else {
        const responseText = await response.text();
        console.error('Non-JSON response received:', responseText);
        throw new Error('Received non-JSON response from server. Check console for details.');
      }
    } catch (error) {
      console.error('Error updating image details:', error);
      setGalleryErrorMessage(error instanceof Error ? error.message : 'Error updating image details. Check console for more info.');
    }
  };

const handleGalleryImageDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      setGalleryErrorMessage('');
      const response = await fetch(`/api/admin/gallery?id=${imageId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete gallery image');
      setGalleryImages(prevImages => prevImages.filter(img => img.id !== imageId));
      alert(result.message);
    } catch (error) {
      console.error('Error deleting gallery image:', error);
      setGalleryErrorMessage(error instanceof Error ? error.message : 'Error deleting gallery image.');
    }
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black";
  const buttonStyle = "mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const sectionStyle = "mb-12 p-6 bg-white shadow-lg rounded-lg";
  const imagePreviewStyle = "mt-4 max-w-xs max-h-64 object-contain border border-gray-200 rounded";

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-gray-800">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-center text-gray-700">Manage Your Artworks</h1>
      </header>

      {/* Avatar Management Section */}
      <section className={sectionStyle}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-600">Update Your Profile Picture</h2>
        <form onSubmit={handleAvatarUpload}>
          <div>
            <label htmlFor="avatarInput" className="block text-sm font-medium text-gray-700">Choose a new profile picture (e.g., a photo of yourself):</label>
            <input id="avatarInput" type="file" accept="image/*" onChange={handleAvatarFileChange} className={inputStyle} />
          </div>
          <button type="submit" className={buttonStyle}>Upload Picture</button>
        </form>
        {avatarUploadMessage && <p className={`mt-2 text-sm ${avatarUploadMessage.toLowerCase().includes('error') || avatarUploadMessage.toLowerCase().includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{avatarUploadMessage}</p>}
        {currentAvatarUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700">Your Current Profile Picture:</h3>
            <img src={currentAvatarUrl} alt="Current Avatar" className={imagePreviewStyle} />
          </div>
        )}
      </section>

      {/* Gallery Management Section */}
      <section className={sectionStyle}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-600">Manage Your Paintings</h2>
        <form onSubmit={handleGalleryImageUpload}>
          <div>
            <label htmlFor="galleryInput" className="block text-sm font-medium text-gray-700">Add a new painting to your gallery:</label>
            <input id="galleryInput" type="file" accept="image/*" onChange={handleGalleryFileChange} className={inputStyle} multiple />
          </div>
          <button type="submit" className={buttonStyle}>Upload Painting</button>
        </form>
        {galleryUploadMessage && <p className={`mt-2 text-sm ${galleryUploadMessage.toLowerCase().includes('error') || galleryUploadMessage.toLowerCase().includes('failed') ? 'text-red-600' : 'text-green-600'}`}>{galleryUploadMessage}</p>}
        {galleryErrorMessage && <p className="mt-2 text-sm text-red-600">{galleryErrorMessage}</p>}

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-700">Your Current Paintings:</h3>
          {galleryImages.length === 0 && !galleryErrorMessage && <p className="text-gray-500 mt-2">You haven't added any paintings yet. Use the form above to upload your first one!</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {galleryImages.map(image => (
              editingImageId === image.id ? (
                // Editing UI
                <div key={image.id} className="p-4 border border-blue-300 rounded-lg shadow-md bg-blue-50 col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1">
                  <img src={image.url} alt={image.name} className={`w-full h-48 object-cover rounded-md mb-2`} />
                  <input 
                    type="text" 
                    value={editText.name}
                    onChange={(e) => setEditText(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Image Name"
                    className={`${inputStyle} mb-2`}
                  />
                  <textarea 
                    value={editText.subtitle || ''}
                    onChange={(e) => setEditText(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Subtitle (optional)"
                    rows={3}
                    className={`${inputStyle} mb-2`}
                  />
                  <div className="flex space-x-2 mt-2">
                    <button onClick={handleSaveEdit} className={`${buttonStyle} bg-green-600 hover:bg-green-700 text-xs px-3 py-1.5`}>Save</button>
                    <button onClick={handleCancelEdit} className={`${buttonStyle} bg-gray-500 hover:bg-gray-600 text-xs px-3 py-1.5`}>Cancel</button>
                  </div>
                </div>
              ) : (
                // Display UI
                <div key={image.id} className="border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50 hover:shadow-md transition-shadow">
                  <img src={image.url} alt={image.name || 'Gallery image'} className="w-full h-48 object-cover rounded-md mb-2" />
                  <h4 className="font-semibold text-sm text-gray-800 truncate mt-1" title={image.name}>{image.name}</h4>
                  {image.subtitle && <p className="text-xs text-gray-600 mt-1 truncate" title={image.subtitle}>{image.subtitle}</p>}
                  <div className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button onClick={() => handleEditImage(image)} className={`${buttonStyle} bg-yellow-500 hover:bg-yellow-600 text-xs px-3 py-1.5 w-full sm:w-auto`}>Edit</button>
                    <button onClick={() => handleGalleryImageDelete(image.id)} className={`${buttonStyle} bg-red-500 hover:bg-red-600 text-xs px-3 py-1.5 w-full sm:w-auto`}>Delete</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}