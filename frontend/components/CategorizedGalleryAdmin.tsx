'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  uploadedAt: string;
  size?: number;
}

interface CategoryData {
  [key: string]: CategorizedMedia[];
}

interface UploadResult {
  success: boolean;
  media?: CategorizedMedia;
  error?: string;
  fileName?: string;
  originalName?: string;
}

interface UploadProgress {
  [fileName: string]: {
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  };
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('architecture');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [editingItem, setEditingItem] = useState<CategorizedMedia | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // Refs for preventing infinite loops
  const isComponentMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const buttonStyle = "px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Show notification
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Fetch categorized gallery data - stable function with no dependencies
  const fetchCategorizedData = useCallback(async (showLoadingState = true) => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    fetchingRef.current = true;

    try {
      if (showLoadingState && isComponentMountedRef.current) {
        setLoading(true);
      }
      
      // Add cache-busting timestamp
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
        
        // Extract metadata if present
        const { _metadata, ...categoryData } = data;
        
        if (isComponentMountedRef.current) {
          setCategoryData(categoryData);
          
          if (_metadata) {
            console.log('Gallery data loaded:', {
              totalItems: _metadata.totalItems,
              lastUpdated: _metadata.lastUpdated,
              categories: Object.keys(categoryData).length
            });
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch categorized gallery data:', errorData);
        if (isComponentMountedRef.current) {
          showNotification(`Failed to fetch gallery data: ${errorData.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error fetching categorized gallery data:', error);
      if (isComponentMountedRef.current) {
        showNotification('Error fetching gallery data', 'error');
      }
    } finally {
      fetchingRef.current = false;
      if (showLoadingState && isComponentMountedRef.current) {
        setLoading(false);
      }
    }
  }, [showNotification]); // Only depend on showNotification which is stable

  // Debug function to diagnose issues
  const runDiagnostics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categorized-gallery/debug', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const diagnostics = await response.json();
        setDebugInfo(diagnostics);
        setShowDebug(true);
        
        if (diagnostics.diagnostics.metadataIssues.length > 0) {
          showNotification(`Found ${diagnostics.diagnostics.metadataIssues.length} metadata issues`, 'error');
        } else {
          showNotification('No issues found', 'success');
        }
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      showNotification('Error running diagnostics', 'error');
    }
  }, [showNotification]);

  // Fix metadata issues
  const fixMetadataIssues = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categorized-gallery/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'fix-metadata' })
      });
      
      if (response.ok) {
        const results = await response.json();
        showNotification(`Fixed ${results.fixed} items`, 'success');
        
        // Refresh data after fixing
        await fetchCategorizedData(false);
        
        // Re-run diagnostics
        await runDiagnostics();
      }
    } catch (error) {
      console.error('Error fixing metadata:', error);
      showNotification('Error fixing metadata', 'error');
    }
  }, [showNotification, fetchCategorizedData, runDiagnostics]);

  // Clear all blobs function
  const clearAllBlobs = useCallback(async () => {
    const confirmMessage = `⚠️ DANGER: This will permanently delete ALL images and files from your blob storage!

This action cannot be undone. Are you absolutely sure you want to proceed?

Type "DELETE ALL" to confirm:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'DELETE ALL') {
      showNotification('Clear operation cancelled', 'info');
      return;
    }

    setClearing(true);
    
    try {
      const response = await fetch('/api/admin/categorized-gallery/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'clear-all-blobs' })
      });
      
      if (response.ok) {
        const results = await response.json();
        showNotification(`Successfully deleted ${results.deleted} blob(s)`, 'success');
        
        // Clear local state
        setCategoryData({});
        setDebugInfo(null);
        
        // Refresh data
        await fetchCategorizedData(false);
      } else {
        const error = await response.json();
        showNotification(`Error clearing blobs: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error clearing blobs:', error);
      showNotification('Error clearing blobs', 'error');
    } finally {
      setClearing(false);
    }
  }, [showNotification, fetchCategorizedData]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    isComponentMountedRef.current = true;
    
    // Initial fetch
    fetchCategorizedData();

    return () => {
      isComponentMountedRef.current = false;
      fetchingRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setUploadProgress({});
  };

  // Handle media upload with improved progress tracking and error handling
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showNotification('Please select files to upload', 'error');
      return;
    }

    setUploading(true);
    const newUploadProgress: UploadProgress = {};
    
    // Initialize progress for all files
    Array.from(selectedFiles).forEach(file => {
      newUploadProgress[file.name] = {
        progress: 0,
        status: 'uploading'
      };
    });
    setUploadProgress(newUploadProgress);

    try {
      // Upload files one by one for better progress tracking
      const results: UploadResult[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          // Update progress to show starting
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { progress: 10, status: 'uploading' }
          }));

          const formData = new FormData();
          formData.append('media', file);
          formData.append('category', selectedCategory);
          formData.append('name', file.name.split('.')[0]);
          formData.append('subtitle', '');

          const response = await fetch('/api/admin/categorized-gallery', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (response.ok && result.results && result.results[0]) {
            const uploadResult = result.results[0];
            results.push(uploadResult);
            
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { 
                progress: 100, 
                status: uploadResult.success ? 'success' : 'error',
                error: uploadResult.error
              }
            }));
          } else {
            results.push({
              success: false,
              error: result.message || 'Upload failed',
              originalName: file.name
            });
            
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { 
                progress: 0, 
                status: 'error',
                error: result.message || 'Upload failed'
              }
            }));
          }
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          results.push({
            success: false,
            error: error.message || 'Network error',
            originalName: file.name
          });
          
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { 
              progress: 0, 
              status: 'error',
              error: error.message || 'Network error'
            }
          }));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        showNotification(`Successfully uploaded ${successCount} file(s)`, 'success');
        setSelectedFiles(null);
        
        // Clear the file input
        const fileInput = document.getElementById('media-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Refresh data immediately
        await fetchCategorizedData(false);
      }

      if (failureCount > 0) {
        showNotification(`${failureCount} upload(s) failed`, 'error');
      }

    } catch (error) {
      console.error('Error uploading media:', error);
      showNotification('Error uploading media', 'error');
    } finally {
      setUploading(false);
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress({});
      }, 3000);
    }
  };

  // Handle edit
  const handleEdit = (item: CategorizedMedia) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditSubtitle(item.subtitle || '');
    setEditCategory(item.category);
  };

  // Handle save edit with improved error handling
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
        showNotification('Media updated successfully', 'success');
        setEditingItem(null);
        
        // Refresh data immediately
        await fetchCategorizedData(false);
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to update media', 'error');
      }
    } catch (error) {
      console.error('Error updating media:', error);
      showNotification('Error updating media', 'error');
    }
  };

  // Handle delete with improved error handling
  const handleDelete = async (item: CategorizedMedia) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categorized-gallery?id=${item.id}&category=${item.category}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      
      if (response.ok) {
        showNotification('Media deleted successfully', 'success');
        
        // Refresh data immediately
        await fetchCategorizedData(false);
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to delete media', 'error');
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      showNotification('Error deleting media', 'error');
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading categorized gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Debug Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 text-yellow-800">Diagnostics & Troubleshooting</h3>
        <div className="flex flex-wrap gap-3 mb-3">
          <button
            onClick={runDiagnostics}
            className={`${buttonStyle} bg-yellow-500 hover:bg-yellow-600 text-white text-sm`}
          >
            Run Diagnostics
          </button>
          {debugInfo && debugInfo.diagnostics.metadataIssues.length > 0 && (
            <button
              onClick={fixMetadataIssues}
              className={`${buttonStyle} bg-orange-500 hover:bg-orange-600 text-white text-sm`}
            >
              Fix Issues
            </button>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`${buttonStyle} bg-gray-500 hover:bg-gray-600 text-white text-sm`}
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>
          <button
            onClick={clearAllBlobs}
            disabled={clearing}
            className={`${buttonStyle} bg-red-600 hover:bg-red-700 text-white text-sm disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {clearing ? 'Clearing...' : '🗑️ Clear All Blobs'}
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <p className="text-red-800 text-sm">
            <strong>⚠️ Clear All Blobs:</strong> This will permanently delete ALL files from your blob storage. 
            Use this to start fresh if you have metadata issues or want to clean up old uploads.
          </p>
        </div>
        
        {showDebug && debugInfo && (
          <div className="bg-white p-4 rounded border text-sm">
            <h4 className="font-semibold mb-2">Debug Information:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Total Blobs:</strong> {debugInfo.diagnostics.totalBlobs}
              </div>
              <div>
                <strong>Categorized:</strong> {debugInfo.diagnostics.categorizedBlobs}
              </div>
              <div>
                <strong>Orphaned:</strong> {debugInfo.diagnostics.orphanedBlobs}
              </div>
              <div>
                <strong>Issues:</strong> {debugInfo.diagnostics.metadataIssues.length}
              </div>
            </div>
            
            {debugInfo.diagnostics.metadataIssues.length > 0 && (
              <div className="mb-4">
                <strong>Issues Found:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {debugInfo.diagnostics.metadataIssues.slice(0, 5).map((issue: any, index: number) => (
                    <li key={index} className="text-red-600">
                      {issue.pathname}: {issue.issue}
                    </li>
                  ))}
                  {debugInfo.diagnostics.metadataIssues.length > 5 && (
                    <li className="text-gray-500">...and {debugInfo.diagnostics.metadataIssues.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            
            <div>
              <strong>Recommendations:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {debugInfo.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-blue-600">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      
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

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Upload Progress:</h4>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">{fileName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      progress.status === 'success' ? 'bg-green-100 text-green-800' :
                      progress.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {progress.status === 'success' ? 'Success' :
                       progress.status === 'error' ? 'Failed' : 'Uploading'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress.status === 'success' ? 'bg-green-500' :
                        progress.status === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    ></div>
                  </div>
                  {progress.error && (
                    <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          
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
                            unoptimized
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
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span className="capitalize">{item.type}</span>
                          <span>{formatFileSize(item.size)}</span>
                        </div>
                        {item.width && item.height && (
                          <p className="text-xs text-gray-500">{item.width} × {item.height}</p>
                        )}
                        <p className="text-xs text-gray-500">ID: {item.id}</p>
                        
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