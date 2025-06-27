'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CategorizedMedia {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
  category: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface CategoryData {
  [key: string]: CategorizedMedia[];
}

const CATEGORIES = [
  { key: 'architecture', label: 'Architecture', description: 'Architectural work - thumbnails and photos' },
  { key: 'watercolors', label: 'Watercolors', description: 'Watercolor paintings - thumbnails and photos' },
  { key: 'sketches', label: 'Sketches, doodles and crafts', description: 'Sketches and craft work - thumbnails and photos' },
  { key: 'native-plants', label: 'Native plants', description: 'Native plant photography - thumbnails, photos, and videos' },
  { key: 'vegetables', label: 'Vegetables', description: 'Vegetable gardening - thumbnails and photos' },
  { key: 'beekeeping', label: 'Bee-keeping', description: 'Beekeeping activities - thumbnails, photos, and videos' },
  { key: 'mead-making', label: 'Mead making', description: 'Mead making process - photos and videos' },
  { key: 'furniture', label: 'Furniture', description: 'Furniture craftsmanship - thumbnails and photos' }
];

const CategorizedGalleryAdmin: React.FC = () => {
  const [categoryData, setCategoryData] = useState<CategoryData>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('architecture');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [editingItem, setEditingItem] = useState<CategorizedMedia | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const buttonStyle = "px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Fetch categorized gallery data
  const fetchCategorizedData = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/categorized-gallery?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCategoryData(data);
      } else {
        console.error('Failed to fetch categorized gallery data');
      }
    } catch (error) {
      console.error('Error fetching categorized gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorizedData();
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  // Handle media upload
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    const uploadPromises = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('media', file);
      formData.append('category', selectedCategory);
      formData.append('name', file.name.split('.')[0]);
      formData.append('subtitle', '');

      uploadPromises.push(
        fetch('/api/admin/categorized-gallery', {
          method: 'POST',
          body: formData,
        })
          .then(async response => {
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Upload failed');
            }
            return response;
          })
      );
    }

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successfulUploads = results.filter(r => r.status === 'fulfilled').length;

      if (successfulUploads) {
        alert(`Successfully uploaded ${selectedFiles.length} file(s)`);
        setSelectedFiles(null);
        // Reset file input
        const fileInput = document.getElementById('media-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Add delay before refetching
        fetchCategorizedData();
      } else {
        alert('Some uploads failed. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('Error uploading media');
    } finally {
      setUploading(false);
    }
  };

  // Handle edit
  const handleEdit = (item: CategorizedMedia) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditSubtitle(item.subtitle || '');
    setEditCategory(item.category);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/admin/categorized-gallery/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          subtitle: editSubtitle,
          category: editCategory,
        }),
      });

      if (response.ok) {
        alert('Media updated successfully');
        setEditingItem(null);
        
        // Add delay before refetching
        setTimeout(() => {
          fetchCategorizedData();
        }, 100);
      } else {
        alert('Failed to update media');
      }
    } catch (error) {
      console.error('Error updating media:', error);
      alert('Error updating media');
    }
  };

  // Handle delete
  const handleDelete = async (item: CategorizedMedia) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categorized-gallery?id=${item.id}&category=${item.category}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Media deleted successfully');
        
        // Add delay before refetching
        
          fetchCategorizedData();
        
      } else {
        alert('Failed to delete media');
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading categorized gallery...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Upload New Media</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {CATEGORIES.find(cat => cat.key === selectedCategory)?.description}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files (Images/Videos)
            </label>
            <input
              id="media-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFiles}
            className={`${buttonStyle} bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </div>

      {/* Categories Display */}
      <div className="space-y-6">
        {CATEGORIES.map(category => {
          const items = categoryData[category.key] || [];
          return (
            <div key={category.key} className="border rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2">{category.label}</h3>
              <p className="text-gray-600 text-sm mb-4">{category.description}</p>
              
              {items.length === 0 ? (
                <p className="text-gray-500 italic">No media in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map(item => (
                    <div key={item.id} className="border rounded-lg p-3 bg-white">
                      {item.type === 'image' ? (
                        <div className="relative w-full h-32 mb-2">
                          <Image
                            src={item.url}
                            alt={item.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-32 mb-2 bg-gray-100 rounded flex items-center justify-center">
                          <video
                            src={item.url}
                            className="max-w-full max-h-full rounded"
                            controls
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        {item.subtitle && (
                          <p className="text-xs text-gray-600 truncate">{item.subtitle}</p>
                        )}
                        <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className={`${buttonStyle} bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 flex-1`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className={`${buttonStyle} bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 flex-1`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Media</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className={`${buttonStyle} bg-green-500 hover:bg-green-600 text-white flex-1`}
              >
                Save
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className={`${buttonStyle} bg-gray-500 hover:bg-gray-600 text-white flex-1`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorizedGalleryAdmin;